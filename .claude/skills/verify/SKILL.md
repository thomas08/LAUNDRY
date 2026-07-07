---
name: verify
description: Build/launch/drive recipe for verifying LinenFlow changes against the live app
---

# Verify LinenFlow changes

Two apps: Next.js frontend (root, `pnpm`) + Express/PG backend (`backend/`, `npm`).
Production runs at **https://laundryking.senses-iot.com** (single-tenant droplet
`root@157.245.57.27`, `/opt/linenflow`, docker compose). Deploy = rsync changed
files up, then `docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build <service>`.

## Build check (fast, not a substitute for driving)
- Frontend: `pnpm build` (TS/ESLint errors are ignored by next.config — a green
  build only proves it compiles, not that the flow works).
- Backend: `cd backend && npm run build` (also copies `db/*.sql` into `dist`).

## Driving the GUI (the real surface)
Business pages sit behind a client-side AuthGuard, so you must log in through the
browser. No browser driver ships in the repo — install Playwright into the
scratchpad and drive production:

```bash
cd <scratchpad> && npm i playwright && \
  PLAYWRIGHT_BROWSERS_PATH=$PWD/pw-browsers npx playwright install chromium
```

- Login page `/th/login` has `#email`, `#password`, `button[type=submit]`.
  Superadmin: `admin@linenflow.com`, password = `SEED_ADMIN_PASSWORD` from
  `/opt/linenflow/.env.prod` on the droplet (fetch via ssh into an env var; don't print it).
- SSH from this env needs `dangerouslyDisableSandbox: true` + the key:
  `ssh -o BatchMode=yes -o IdentitiesOnly=yes -i ~/.ssh/id_ed25519 root@157.245.57.27`
  (port 22 hangs on the very first connect sometimes — retry).
- Run the driver script with `dangerouslyDisableSandbox: true` (needs network) and
  `PLAYWRIGHT_BROWSERS_PATH` pointing at the install above. Screenshot each step.

## API-level surface (backend-only changes)
On the box: login to `http://127.0.0.1:8080/v1/auth/login` → Bearer token → hit the
endpoint. Article updates accept a **partial** body (`PUT /v1/articles/:id` with just
`{unitPrice}` or `{defaultOwnership}`). Always revert test writes on a live customer DB.

## Gotchas
- `docker compose up --build <frontend|backend>` also recreates the other app
  container (brief restart); migrations re-run on backend start (idempotent).
- `_vercel/insights/script.js` 404 in console is expected (self-hosted, not Vercel).
