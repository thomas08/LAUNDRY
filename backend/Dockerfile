# ── LinenFlow™ API — multi-stage build ──────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

# Install all deps (incl. dev) for the TypeScript build
COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
# Compiles to dist/ and copies schema.sql + migrations/*.sql into dist/db (see package.json build)
RUN npm run build

# ── Runtime image ────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Production deps only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Compiled output (includes dist/db/*.sql needed by the migration runner)
COPY --from=build /app/dist ./dist

EXPOSE 8080

# Run migrations then start the API. Migrations are idempotent, so this is
# safe on every container start/restart.
CMD ["sh", "-c", "node dist/db/migrate.js && node dist/index.js"]
