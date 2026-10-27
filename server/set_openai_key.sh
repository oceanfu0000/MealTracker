#!/bin/bash
# Forced command for the GitHub Actions SSH key (see authorized_keys): reads an OpenAI API key
# from stdin, stores it as OPENAI_API_KEY in ~/mealtracker/.env and restarts the AI proxy.
# The key in GitHub can do nothing else on this server.
set -euo pipefail

read -r key || true
key="${key%$'\r'}"
if [[ ! "$key" =~ ^sk-[A-Za-z0-9_-]{20,}$ ]]; then
    echo "invalid OpenAI key format" >&2
    exit 1
fi

cd /home/ubuntu/mealtracker
if grep -qxF "OPENAI_API_KEY=$key" .env; then
    echo "OpenAI key unchanged"
    exit 0
fi

tmp=$(mktemp .env.XXXXXX)
chmod 600 "$tmp"
grep -v '^OPENAI_API_KEY=' .env > "$tmp" || true
echo "OPENAI_API_KEY=$key" >> "$tmp"
mv "$tmp" .env

sudo docker compose up -d ai >/dev/null 2>&1
echo "OpenAI key updated, AI proxy restarted"
