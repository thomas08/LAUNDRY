# Deployment Guide — LinenFlow™

This repo deploys as three containers: **PostgreSQL**, the **backend API** (`backend/`),
and the **Next.js frontend** (root). The easiest path is the bundled
`docker-compose.prod.yml`.

> **Status note:** the frontend currently renders from mock data and does **not**
> yet call the backend. Deploying gives you a running app + a working, independently
> testable API (`/v1/auth/*`, `/v1/sync/*`). Wiring the frontend to the API is a
> separate task (see "Next step" at the bottom).

---

## Option A — Docker Compose (recommended)

Prerequisites on the server: Docker Engine + Docker Compose v2.

```bash
# 1. Get the code onto the server
git clone <repo-url> linenflow && cd linenflow

# 2. Create the production env file from the template and edit the secrets
cp .env.prod.example .env.prod
#   - set DB_PASSWORD, JWT_SECRET, JWT_REFRESH_SECRET (use: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
#   - set CORS_ORIGIN and NEXT_PUBLIC_API_URL to your real public URLs

# 3. Build and start everything
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

# 4. Check
docker compose -f docker-compose.prod.yml ps
curl http://localhost:8080/health
```

- Backend listens on **:8080** (base path `/v1`), frontend on **:3000**.
- The backend container **runs DB migrations on start automatically** (idempotent —
  safe on every restart). No manual migration step.
- Default seeded login: `admin@linenflow.com` / `Admin123!` — **change it after first login.**

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
- [ ] Changed the default `admin@linenflow.com` password
- [ ] TLS terminated at the reverse proxy
- [ ] Database volume backed up (`postgres_data`)

---

## Next step (not done yet)

The frontend still uses mock auth (`lib/auth.ts` `getCurrentUser()` returns a mock
superadmin) and has no API client. To make it use the real backend:
1. Add an API client in `lib/api/` that calls `NEXT_PUBLIC_API_URL`.
2. Replace mock auth in `contexts/AuthContext.tsx` / `lib/auth.ts` with real
   `/v1/auth/login` + token storage + `/v1/auth/me`.
3. Swap mock data reads on each page for API calls (SWR/React Query recommended).
