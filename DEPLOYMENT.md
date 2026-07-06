# Deployment Guide — LinenFlow™

This repo deploys as four containers behind a TLS reverse proxy:
**Caddy** (HTTPS), the **Next.js frontend** (root), the **backend API** (`backend/`),
and **PostgreSQL**. The bundled `docker-compose.prod.yml` wires them together;
Caddy is the only service exposed to the internet.

> **Status:** the app is fully backend-wired — auth plus all business-data pages
> (customers, inventory, job orders, finance, suppliers, stock, reports) read from
> the real API. Only `checkin` and `ai-scanner` still use mock data.

---

## Architecture

```
                 :443 / :80
  Internet ──►  Caddy (TLS, Let's Encrypt)
                  │  /v1/* , /health ─► backend:8080 ─► postgres:5432
                  └  everything else ─► frontend:3000
```

- **Caddy** publishes `80` + `443`. Everything else is internal-only (backend and
  frontend also bind `127.0.0.1:8080` / `127.0.0.1:3000` for on-box debugging).
- The browser calls the API at the **same origin** (`https://DOMAIN/v1`), so there
  is no cross-origin request in normal use.
- The backend container **runs DB migrations on start** (idempotent — safe on every
  restart). No manual migration step.

---

## Deploy on DigitalOcean (or any Ubuntu VPS)

### 0. Provision
- Create a Droplet: **Ubuntu 24.04, 2 vCPU / 4 GB RAM / 80 GB SSD**, region
  **Singapore (SGP1)** for lowest latency to Thailand. (2 GB works only if you add
  swap — the Next.js build is memory-hungry; see the swap step.)
- Add your SSH key during creation. SSH in as a sudo user.
- Point your domain's **DNS A record** at the Droplet's public IP and let it
  propagate before step 5 (Let's Encrypt needs it resolving).

### 1. Firewall — expose only 22 / 80 / 443
```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

### 2. (2 GB Droplets only) add swap so the frontend build doesn't OOM
```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 3. Install Docker Engine + Compose v2
```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"   # then log out/in so the group applies
```

### 4. Get the code + configure secrets
```bash
sudo mkdir -p /opt/linenflow && sudo chown "$USER" /opt/linenflow
git clone <repo-url> /opt/linenflow && cd /opt/linenflow

cp .env.prod.example .env.prod
# Edit .env.prod and set:
#   DOMAIN, ACME_EMAIL
#   DB_PASSWORD
#   JWT_SECRET, JWT_REFRESH_SECRET   (node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
#   SEED_ADMIN_PASSWORD              (strong — avoids the public 'Admin123!' default)
#   CORS_ORIGIN=https://DOMAIN  and  NEXT_PUBLIC_API_URL=https://DOMAIN/v1
# The backend refuses to start in production if JWT_SECRET, JWT_REFRESH_SECRET,
# or DATABASE_URL is missing.
```

### 5. Build + start
```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
docker compose -f docker-compose.prod.yml ps
curl -fsS http://127.0.0.1:8080/health          # backend health (localhost bind)
curl -fsS https://$DOMAIN/health                # through Caddy once DNS + cert are up
```
Caddy fetches the TLS certificate on first request to `https://DOMAIN` (allow a few
seconds). Watch it with `docker compose -f docker-compose.prod.yml logs -f caddy`.

Seeded login: `admin@linenflow.com` / your `SEED_ADMIN_PASSWORD`. Change it in-app
(the **Account** page) after first login.

### 6. Backups (do this before real data lands)
```bash
./scripts/backup-db.sh                          # writes ./backups/linenflow-<ts>.sql.gz
crontab -e
# 30 2 * * * cd /opt/linenflow && ./scripts/backup-db.sh >> /var/log/linenflow-backup.log 2>&1
```
Then copy dumps **off the Droplet** (DigitalOcean Spaces / another host) — a backup
that only lives on the same VPS doesn't survive the VPS dying.

### Updating after a `git pull`
```bash
cd /opt/linenflow && git pull
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

### Logs / teardown
```bash
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml down          # keep data
docker compose -f docker-compose.prod.yml down -v        # WIPE the database volume
```

---

## Production checklist

- [ ] DNS A record → Droplet IP, resolving before first start
- [ ] `ufw` allows only 22 / 80 / 443
- [ ] Strong, unique `JWT_SECRET` and `JWT_REFRESH_SECRET`
- [ ] Strong `DB_PASSWORD`; Postgres port **not** published (it isn't, by default)
- [ ] `DOMAIN` + `ACME_EMAIL` set; TLS cert issued (check Caddy logs)
- [ ] `CORS_ORIGIN=https://DOMAIN` and `NEXT_PUBLIC_API_URL=https://DOMAIN/v1`
- [ ] `SEED_ADMIN_PASSWORD` set; admin password changed in-app after first login
- [ ] `.env.prod` is **not** committed (it's git-ignored — keep it that way)
- [ ] Nightly `pg_dump` cron running **and** dumps copied off-box
- [ ] (2 GB) swap enabled

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
npm ci --legacy-peer-deps     # some peers lag React 19
NEXT_PUBLIC_API_URL=https://your-domain/v1 npm run build
npm start                     # serves on :3000
```

Put Caddy (or nginx) in front for TLS, routing `/v1/*` + `/health` to `:8080` and
everything else to `:3000`, exactly as `Caddyfile` / the compose stack do.
