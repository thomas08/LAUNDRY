# 🐳 Docker Setup Guide for LinenFlow™ Backend

## Step 1: Install Docker Desktop

### Download Docker Desktop for macOS

1. Visit: **https://www.docker.com/products/docker-desktop/**
2. Click **"Download for Mac"**
3. Choose:
   - **Mac with Intel chip** (if you have Intel processor)
   - **Mac with Apple chip** (if you have M1/M2/M3 processor)

### Install Docker Desktop

1. Open the downloaded `.dmg` file
2. Drag **Docker.app** to **Applications** folder
3. Open **Docker** from Applications
4. Follow the setup wizard
5. Accept the license agreement
6. Docker Desktop will start (you'll see whale icon in menu bar)

**Verification:**
```bash
# After installation, run in terminal:
docker --version
docker compose version
```

You should see something like:
```
Docker version 24.0.x, build xxxxx
Docker Compose version v2.x.x
```

---

## Step 2: Start PostgreSQL Container

Once Docker is installed, run:

```bash
# Navigate to backend directory
cd backend

# Start PostgreSQL
docker compose up -d

# Check if running
docker compose ps
```

You should see:
```
NAME                  IMAGE                 STATUS
linenflow-postgres    postgres:14-alpine    Up (healthy)
```

---

## Step 3: Run Database Migrations

```bash
# Build the backend
npm run build

# Run migrations
npm run db:migrate
```

Expected output:
```
✅ Database migrations completed successfully!

📝 Default Credentials:
   Email:    admin@linenflow.com
   Password: Admin123!
```

---

## Step 4: Start Backend Server

```bash
npm run dev
```

Server will start at: **http://localhost:8080/v1**

---

## 🛠️ Useful Docker Commands

```bash
# Start PostgreSQL
docker compose up -d

# Stop PostgreSQL
docker compose down

# View PostgreSQL logs
docker compose logs -f postgres

# Access PostgreSQL CLI
docker compose exec postgres psql -U postgres -d linenflow

# Reset database (WARNING: deletes all data)
docker compose down -v
docker compose up -d
npm run db:migrate
```

---

## 🔍 Troubleshooting

### Port 5432 already in use
If you have PostgreSQL installed locally:
```bash
# Stop local PostgreSQL
brew services stop postgresql@14

# Or change port in docker-compose.yml:
ports:
  - "5433:5432"  # Use 5433 instead

# Then update .env:
DB_PORT=5433
```

### Container won't start
```bash
# Check logs
docker compose logs postgres

# Restart Docker Desktop
# Stop and start from Docker Desktop app

# Remove and recreate container
docker compose down -v
docker compose up -d
```

### Can't connect to database
Check `.env` file matches docker-compose.yml:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=linenflow
```

---

## ✅ Quick Start Checklist

- [ ] Install Docker Desktop
- [ ] Verify installation: `docker --version`
- [ ] Start PostgreSQL: `docker compose up -d`
- [ ] Build backend: `npm run build`
- [ ] Run migrations: `npm run db:migrate`
- [ ] Start server: `npm run dev`
- [ ] Test API: `curl http://localhost:8080/health`

---

## Next Steps

Once backend is running, you can:
1. Test authentication with Postman or curl
2. Connect frontend to backend
3. Build additional API endpoints

Happy coding! 🚀
