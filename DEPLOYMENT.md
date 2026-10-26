# Deployment Guide

MealTracker has two parts:

- **Frontend**: this repo, built by GitHub Actions and served on GitHub Pages at
  `https://oceanfu0000.github.io/MealTracker/`
- **Backend**: database, auth and the OpenAI proxy on the Ubuntu server at
  `https://129-221-137-70.sslip.io`. Setup and maintenance are in [server/README.md](server/README.md).

## Frontend (GitHub Pages)

### 1. GitHub Secrets

In the repository: **Settings → Secrets and variables → Actions**, set:

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://129-221-137-70.sslip.io` |
| `VITE_SUPABASE_ANON_KEY` | `ANON_KEY` from `~/mealtracker/.env` on the server |

The OpenAI key is **not** a GitHub secret any more. It lives in the server's `.env`, because
anything passed to the build as `VITE_*` ends up readable in the public JavaScript.

### 2. Enable GitHub Pages

**Settings → Pages → Source: GitHub Actions**

### 3. Deploy

Every push to `main` builds and deploys automatically (see the **Actions** tab).
After changing a secret, re-run the **Deploy to GitHub Pages** workflow; secrets only take effect on the next build.

## Backend (Ubuntu server)

See [server/README.md](server/README.md) for the Docker stack, `.env` settings (OpenAI key, email),
backups and common tasks.

## Important Notes

⚠️ **Anon key vs service role key**: the anon key is public by design; the data is protected by
row-level security. **Never** put the `SERVICE_ROLE_KEY` in the app or in GitHub.

⚠️ **Client-Side Routing**: The included `404.html` ensures React Router works correctly on page refresh.

## Troubleshooting

**"Invalid supabaseUrl" in the browser console:**
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are probably swapped; the URL starts with `https://`

**Blank page / 404 after deploy:**
- Make sure GitHub Pages source is set to "GitHub Actions"
- Check the Actions tab for build errors

**Email links open the wrong page:**
- `SITE_URL` in the server's `.env` must be `https://oceanfu0000.github.io/MealTracker`
