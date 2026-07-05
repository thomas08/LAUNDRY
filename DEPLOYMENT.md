# Deployment Guide — LinenFlow™

This repo deploys as three containers: **PostgreSQL**, the **backend API** (`backend/`),
and the **Next.js frontend** (root). The easiest path is the bundled
`docker-compose.prod.yml`.

> **Status note:** the frontend's **authentication is integrated** with the backend
> (real login/logout/refresh via `/v1/auth/*`). Business data pages (customers,
> inventory, finance…) still render from mock data because the backend has no data
> endpoints yet. Set `NEXT_PUBLIC_API_URL` so the browser can reach the API.

---

## Option A — Docker Compose (recommended)

Prerequisites on the server: Docker Engine + Docker Compose v2.

```bash
# 1. Get the code onto the server
git clone <repo-url> linenflow && cd linenflow

# 2. Create the production env file from the template and edit the secrets
cp .env.prod.example .env.prod
#   - set DB_PASSWORD, JWT_SECRET, JWT_REFRESH_SECRET (use: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
#   - set SEED_ADMIN_PASSWORD to a strong value (first-run superadmin password; avoids the public default)
#   - set CORS_ORIGIN and NEXT_PUBLIC_API_URL to your real public URLs
# The backend refuses to start in production if JWT_SECRET, JWT_REFRESH_SECRET, or DATABASE_URL is missing.

# 3. Build and start everything
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

# 4. Check
docker compose -f docker-compose.prod.yml ps
curl http://localhost:8080/health
```

- Backend listens on **:8080** (base path `/v1`), frontend on **:3000**.
- The backend container **runs DB migrations on start automatically** (idempotent —
  safe on every restart). No manual migration step.
- Seeded login: `admin@linenflow.com`. The password is `SEED_ADMIN_PASSWORD` on the
  first migrate, or the public default `Admin123!` if you didn't set it — so **always set
  `SEED_ADMIN_PASSWORD`**. The seed only applies while the password is unset; restarts never
  clobber it. (There is no in-app password-change screen yet — see "Next step".)

To update after a `git pull`:
```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

Logs / teardown:
```bash
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml down           # keep data
docker compose -f docker-compose.prod.yml down -v         # WIPE the database volume
```

---

## Option B — Manual (no Docker)

Backend:
```bash
cd backend
cp .env.example .env          # fill in DATABASE_URL + JWT secrets
npm ci
npm run build                 # compiles TS and copies SQL into dist/
npm run db:migrate            # runs schema.sql + migrations/*.sql (idempotent)
npm start                     # or run under pm2/systemd
```

Frontend:
```bash
npm ci --legacy-peer-deps     # legacy flag needed: some peers lag React 19
NEXT_PUBLIC_API_URL=https://api.your-domain/v1 npm run build
npm start                     # serves on :3000
```

Put a reverse proxy (nginx/Caddy) in front for TLS and to route the public
domain to :3000 (frontend) and :8080 (API).

---

## Reverse proxy sketch (nginx)

```nginx
server {
  server_name your-domain.example;
  location /v1/     { proxy_pass http://127.0.0.1:8080; }
  location /health  { proxy_pass http://127.0.0.1:8080; }
  location /        { proxy_pass http://127.0.0.1:3000; }
}
```
If the API is served under the same domain at `/v1`, set
`NEXT_PUBLIC_API_URL=https://your-domain.example/v1` and
`CORS_ORIGIN=https://your-domain.example`.

---

## Production checklist

- [ ] Strong, unique `JWT_SECRET` and `JWT_REFRESH_SECRET`
- [ ] Strong `DB_PASSWORD`; Postgres port **not** published to the internet
- [ ] `CORS_ORIGIN` set to the real frontend origin (not `*`, not localhost)
- [ ] `NEXT_PUBLIC_API_URL` points at the public API URL
- [ ] `SEED_ADMIN_PASSWORD` set to a strong value (so `admin@linenflow.com` is never `Admin123!`)
- [ ] TLS terminated at the reverse proxy
- [ ] Database volume backed up (`postgres_data`)

---

## Next step (remaining)

Authentication is done — real login/logout/refresh via `lib/api/` + `AuthContext`.
What's left is the **business data**: customers, inventory, job orders, finance
pages still read mock data. To finish:
1. Build the backend data modules (routes/controllers/models mirroring `auth`/`sync`).
2. Add matching `lib/api/*` modules using the existing `apiFetch` client.
3. Swap mock data reads on each page for API calls (SWR/React Query recommended).
