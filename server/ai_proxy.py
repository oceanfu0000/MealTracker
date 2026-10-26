"""Proxy from the app to the OpenAI Responses API, so the OpenAI key stays on the server.

POST /responses  ->  https://api.openai.com/v1/responses

Only logged-in users get through: the caller's Supabase access token (HS256, signed with
JWT_SECRET) must be valid and not expired. Requests are limited to the models the app uses,
to a capped output length, and to DAILY_LIMIT calls per user per day.
Standard library only; runs in a plain python image.
"""
import base64
import hashlib
import hmac
import json
import os
import threading
import time
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
JWT_SECRET = os.environ["JWT_SECRET"].encode()
DAILY_LIMIT = int(os.environ.get("AI_DAILY_LIMIT", "200"))
ALLOWED_MODELS = {"gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano"}
MAX_OUTPUT_TOKENS = 1000
MAX_BODY_BYTES = 20 * 1024 * 1024  # base64 meal photos

_usage: dict[tuple[str, str], int] = {}
_usage_lock = threading.Lock()


def b64url_decode(part: str) -> bytes:
    return base64.urlsafe_b64decode(part + "=" * (-len(part) % 4))


def verify_user(auth_header: str) -> str | None:
    """Return the user id of a valid, unexpired user access token, else None."""
    if not auth_header.startswith("Bearer "):
        return None
    try:
        header, payload, signature = auth_header[7:].split(".")
        expected = hmac.new(JWT_SECRET, f"{header}.{payload}".encode(), hashlib.sha256).digest()
        if not hmac.compare_digest(expected, b64url_decode(signature)):
            return None
        if json.loads(b64url_decode(header)).get("alg") != "HS256":
            return None
        claims = json.loads(b64url_decode(payload))
    except (ValueError, json.JSONDecodeError):
        return None
    if claims.get("role") != "authenticated" or claims.get("exp", 0) < time.time():
        return None
    return claims.get("sub")


def take_quota(user_id: str) -> bool:
    today = time.strftime("%Y-%m-%d", time.gmtime())
    with _usage_lock:
        for key in [k for k in _usage if k[1] != today]:
            del _usage[key]
        used = _usage.get((user_id, today), 0)
        if used >= DAILY_LIMIT:
            return False
        _usage[(user_id, today)] = used + 1
        return True


class Handler(BaseHTTPRequestHandler):
    def send_json(self, status: int, message: str) -> None:
        body = json.dumps({"error": {"message": message}}).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        if self.path == "/health":
            self.send_json(200, "ok")
        else:
            self.send_json(404, "Not found")

    def do_POST(self) -> None:
        if self.path != "/responses":
            return self.send_json(404, "Not found")
        user_id = verify_user(self.headers.get("Authorization", ""))
        if not user_id:
            return self.send_json(401, "Please log in again.")
        if not OPENAI_API_KEY:
            return self.send_json(503, "AI is not set up on the server yet (OPENAI_API_KEY missing).")

        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0 or length > MAX_BODY_BYTES:
            return self.send_json(413, "Request too large.")
        try:
            body = json.loads(self.rfile.read(length))
        except json.JSONDecodeError:
            return self.send_json(400, "Invalid JSON.")

        if body.get("model") not in ALLOWED_MODELS:
            return self.send_json(400, "Model not allowed.")
        body["max_output_tokens"] = min(int(body.get("max_output_tokens") or MAX_OUTPUT_TOKENS), MAX_OUTPUT_TOKENS)
        body["stream"] = False

        if not take_quota(user_id):
            return self.send_json(429, f"Daily AI limit reached ({DAILY_LIMIT} requests). Try again tomorrow.")

        request = urllib.request.Request(
            "https://api.openai.com/v1/responses",
            data=json.dumps(body).encode(),
            method="POST",
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {OPENAI_API_KEY}"},
        )
        try:
            with urllib.request.urlopen(request, timeout=120) as upstream:
                status, data = upstream.status, upstream.read()
        except urllib.error.HTTPError as e:
            status, data = e.code, e.read()
        except (urllib.error.URLError, TimeoutError) as e:
            return self.send_json(502, f"Could not reach OpenAI: {e}")

        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, fmt: str, *args) -> None:
        # One line per request, without tokens or bodies
        print(f"{self.address_string()} {fmt % args}", flush=True)


if __name__ == "__main__":
    ThreadingHTTPServer(("0.0.0.0", 8000), Handler).serve_forever()
