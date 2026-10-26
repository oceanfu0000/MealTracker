# MealTracker server

The backend for MealTracker runs on the Ubuntu server (`ubuntu@129.221.137.70`) in `~/mealtracker`.
The frontend stays on GitHub Pages and talks to it at **https://129-221-137-70.sslip.io**.

| Path | Service | What it does |
|---|---|---|
| `/auth/v1/*` | `auth` (Supabase GoTrue) | Sign-up, login, password reset emails |
| `/rest/v1/*` | `rest` (PostgREST) | Table queries, protected by row-level security |
| `/ai/v1/responses` | `ai` (`ai_proxy.py`) | OpenAI proxy; holds the API key, logged-in users only |
| — | `db` (Supabase Postgres 17) | Not exposed to the internet |

HTTPS comes from the **EMPWR** project's Caddy, which owns ports 80/443 on this server. Its
`deploy/Caddyfile` and `deploy/Caddyfile.ip` contain the `129-221-137-70.sslip.io` site block.
Keep that block in the EMPWR repo, or an EMPWR deploy will drop the MealTracker routes.

## Files

- `docker-compose.yml`: the stack. `auth`, `rest` and `ai` join EMPWR's `empwr_default` network.
- `gen_env.py`: creates `.env` with a new DB password, JWT secret and anon/service keys. Run it once only.
- `filter_dump.py`: extracts the `auth` + `public` schemas from a Supabase cluster backup.
- `migrations/`: SQL applied after the restore (run in order).
- `init/`: DB init scripts (service role passwords, JWT expiry).

## `.env` on the server

Created by `gen_env.py`; add the rest by hand, then run `sudo docker compose up -d`.

```env
SITE_DOMAIN=129-221-137-70.sslip.io
SITE_URL=https://oceanfu0000.github.io/MealTracker
POSTGRES_PASSWORD=...        # generated
JWT_SECRET=...               # generated
ANON_KEY=...                 # generated; goes into the VITE_SUPABASE_ANON_KEY GitHub secret
SERVICE_ROLE_KEY=...         # generated; admin key, never put it in the app

OPENAI_API_KEY=sk-...        # for meal photo analysis and the FAQ assistant
AI_DAILY_LIMIT=200           # optional: AI requests per user per day

# Email (confirmation + password reset). Until set, keep MAILER_AUTOCONFIRM=true.
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_SENDER_EMAIL=you@example.com
MAILER_AUTOCONFIRM=false     # require new users to confirm their email
```

## Common tasks

```bash
cd ~/mealtracker
sudo docker compose ps                     # status
sudo docker compose logs -f auth           # logs
sudo docker compose up -d                  # apply .env / compose changes

# Backup
sudo docker exec mealtracker-db-1 pg_dump -U supabase_admin -h localhost -d postgres \
  --schema=public --schema=auth > backup-$(date +%F).sql

# Reset a user's password by hand (if email isn't set up)
sudo docker exec -it mealtracker-db-1 psql -U supabase_admin -h localhost -d postgres -c \
  "update auth.users set encrypted_password = crypt('NewPassword123', gen_salt('bf')) where email = 'user@example.com';"
```

## Restoring from a Supabase backup (how it was set up)

1. `python3 gen_env.py 129-221-137-70.sslip.io https://oceanfu0000.github.io/MealTracker`
2. `python3 filter_dump.py db_cluster-....backup filtered.sql`
3. `sudo docker compose up -d db`, then as `supabase_admin`: `DROP SCHEMA auth CASCADE;` and load `filtered.sql`
4. Apply `migrations/*.sql`, then `sudo docker compose up -d`
