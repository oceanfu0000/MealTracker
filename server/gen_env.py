"""Create server/.env with fresh secrets and the matching anon / service_role API keys.

Usage: python3 gen_env.py <site_domain> <site_url>
Refuses to overwrite an existing .env, since that would lock out the running database.
"""
import base64
import hashlib
import hmac
import json
import os
import secrets
import sys
import time

ENV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def make_jwt(payload: dict, secret: str) -> str:
    header = b64url(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode())
    body = b64url(json.dumps(payload, separators=(",", ":")).encode())
    sig = hmac.new(secret.encode(), f"{header}.{body}".encode(), hashlib.sha256).digest()
    return f"{header}.{body}.{b64url(sig)}"


def main() -> None:
    if len(sys.argv) != 3:
        sys.exit("usage: gen_env.py <site_domain> <site_url>")
    if os.path.exists(ENV_PATH):
        sys.exit(f"{ENV_PATH} already exists; not overwriting")

    domain, site_url = sys.argv[1], sys.argv[2].rstrip("/")
    jwt_secret = secrets.token_hex(32)
    now = int(time.time())
    ten_years = now + 10 * 365 * 24 * 3600

    def key(role: str) -> str:
        return make_jwt({"role": role, "iss": "supabase", "iat": now, "exp": ten_years}, jwt_secret)

    lines = [
        f"SITE_DOMAIN={domain}",
        f"SITE_URL={site_url}",
        f"POSTGRES_PASSWORD={secrets.token_hex(24)}",
        f"JWT_SECRET={jwt_secret}",
        f"ANON_KEY={key('anon')}",
        f"SERVICE_ROLE_KEY={key('service_role')}",
    ]
    fd = os.open(ENV_PATH, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "w") as f:
        f.write("\n".join(lines) + "\n")
    print(f"wrote {ENV_PATH}")


if __name__ == "__main__":
    main()
