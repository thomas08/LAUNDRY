# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Layout

This is a **two-part repo**: the Next.js frontend lives at the root, and a standalone Node.js API lives in `backend/`. They are independent projects with separate `package.json`, `tsconfig.json`, and dependencies. **Authentication is wired to the real backend** (login/logout/refresh/change-password/RBAC via `/v1/auth/*`). **Linen Articles, Customers, Inventory list, linen registration, and account/password** are also backend-wired (`/v1/articles`, `/v1/customers`, `/v1/linen-items`, `/v1/sync/batch`). The remaining business **data pages (Job Orders, Finance, consumable Stock, Suppliers, Reports) still render from mock data** pending their backend endpoints.

## Development Commands

### Frontend (root)
- `pnpm dev` - Start Next.js dev server (default port 3000)
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

### Backend (`cd backend`, uses npm not pnpm)
- `npm run dev` - Start API with hot reload (`ts-node-dev`) on port 8080, base path `/v1`
- `npm run build` - Compile TypeScript to `dist/`
- `npm start` - Run compiled `dist/index.js`
- `npm run db:migrate` - Run migrations against PostgreSQL (**requires `npm run build` first** — it executes the compiled `dist/db/migrate.js`). Runs `schema.sql` then every file in `migrations/` in filename order. All migrations are written idempotently, so this is safe to re-run. Default seeded superadmin: `admin@linenflow.com` / `Admin123!`.
- `docker compose up -d` (in `backend/`) - Start the PostgreSQL 14 dev container (postgres/postgres, db `linenflow`, port 5432)

**Deployment**: See `DEPLOYMENT.md`. `docker-compose.prod.yml` builds all three containers; the backend runs migrations on start. Both apps have Dockerfiles (frontend uses Next.js `output: 'standalone'`). The frontend requires `npm ci --legacy-peer-deps` (some Radix/vaul peers lag React 19).

There is no test framework in either project (`backend` `npm test` is a placeholder that exits 1).

## Architecture Overview

LinenFlow™ is a Next.js 15 laundry management system with comprehensive RBAC (Role-Based Access Control), multi-tenancy support, and full internationalization. A separate Express/PostgreSQL backend (`backend/`) provides real auth and offline RFID sync. The frontend's **auth flow is fully integrated with the backend**; its business data pages still run on mock data pending backend data endpoints.

**Critical Architecture Decisions:**
- **External Backend Pattern**: No Next.js API routes (`app/api/` does not exist). The frontend calls (or will call) the standalone `backend/` service. Note: `docs/api/openapi.yaml` was written for a planned Rust backend and predates the actual Node/Express backend in `backend/` — treat the code in `backend/` as the source of truth for implemented endpoints.
- **Two-Layer Layout System**: Root layout (`app/layout.tsx`) is minimal HTML shell; locale layout (`app/[locale]/layout.tsx`) contains all providers, sidebar, and theming.
- **Mock-First Development**: All data is currently mocked but follows production patterns for easy API integration.

**Framework & Core:**
- Next.js 15.2.4 with App Router (prefer Server Components by default)
- React 19 with TypeScript 5 (strict mode enabled)
- No external state library - uses React Context API only

**Styling & UI:**
- Tailwind CSS v4 with CSS variables for theming
- shadcn/ui components (New York style) - 59 pre-installed components
- Radix UI primitives
- Lucide React icons
- Dark theme is default

**Key Dependencies:**
- next-intl v4.3.12 for internationalization
- React Hook Form with Zod validation
- next-themes for theme switching
- Sonner for toast notifications
- date-fns for date handling
- Recharts for data visualization

## Business Domain (Real-World Model)

LinenFlow's customer is a **commercial laundry** that services hotels, hospitals, tourist-area
shops, and walk-in individuals. The domain follows standard industrial-laundry / RFID textile-rental
practice. This section is the **product target**; not all of it is built yet (see status flags).

**Two data levels (foundation laid — DB + types exist, no CRUD/UI yet):**
- **Article / SKU (linen type master)** — the reusable definition: e.g. "Bath Towel 70×140 White",
  "King Bed Sheet". Holds category, size, color, weight, price, par level. **Modeled** as
  `LinenArticle` in `lib/types.ts` and the `linen_articles` table (backend migration 003). `LinenItem`
  now has an optional `articleId` link; the legacy free-text `LinenItem.type` stays until pages migrate.
  No article CRUD endpoint or picker UI exists yet.
- **Item (one physical RFID tag)** — one row per tag (`linen_items` / `LinenItem`), carries
  `tagId`, `status`, `washCycles`, `version`, and links to an Article + owner.

**Ownership model (key distinction — planned field `ownershipType`):**
- **Rental pool** — linen owned by the laundry, rented out, billed per rental cycle; a customer is
  attached only while `On-Rent`.
- **Customer-Owned Goods (COG)** — linen owned by the hotel/hospital; the laundry only washes and
  returns it (billed per wash), permanently tied to that customer, and must never enter the rental pool.
- **Modeled**: `LinenOwnership = 'rental' | 'customer_owned'`, exposed as optional `LinenItem.ownershipType`
  in `lib/types.ts` and as the `ownership` column on `linen_items` (default `'rental'`, migration 003).
  The sync `item_receive` path reads `payload.ownership`/`payload.articleId`. Make `ownershipType`
  required once mock pages are migrated.

**Registration modes (the "add linen" flows):**
- **Individual** — scan one tag → pick Article → save. Maps to the current `add-item` page and to a
  single `item_receive` scan event. Good for replacements/exceptions.
- **Batch / bulk commissioning** — pick Article + owner **once**, then rapid-scan many tags; each read
  auto-creates an Item under that context. Maps to **many `item_receive` events in one
  `POST /v1/sync/batch`** — the backend sync pipeline already supports this (idempotent via `clientUuid`).

**Intake workflows:**
- **On-site / route pickup** — staff visit the hotel/hospital and scan to create a collection tied to
  customer + branch; must work **offline** (matches the existing sync/batch design).
- **Walk-in counter** — customer brings linen to the shop; intake is created at the counter.

**MVP constraint — single scanner:** the first rollout uses **one** RFID reader for a trial. UI must be
as simple as possible while effective: a **mode-first** screen ("What are you doing?" → Register / Pick
up / Dispatch-return / Stock check) that drops the operator straight into a scan-driven view, minimizing
typing. Keep primary actions to 3–4.

**Where this lives in code today:** `add-item` (individual registration), `checkin` (intake/return of
on-rent items), and the backend `sync` module (`item_receive` = the registration primitive). All
frontend pages are still mock data; the backend now has `linen_items` + `scan_events` +
`linen_articles` (migration 003), but still **no** customer or job-order tables, and **no** REST
endpoints for articles/inventory (only the sync pipeline writes items). Note: mock data in `inventory`
and `checkin` uses inconsistent status casing (`on_rent`/`in_stock`/`washing`) vs the canonical
`LinenItemStatus` (`'On-Rent'`/`'In Stock'`/`'Washing'`) — reconcile when wiring real data.

## Project Structure

```
app/
├── layout.tsx                    # Minimal root layout (HTML shell only)
├── [locale]/
│   ├── layout.tsx                # Provider hierarchy: NextIntl → Auth → Branch
│   ├── page.tsx                  # Dashboard with KPIs and activities
│   ├── customers/
│   │   ├── page.tsx              # Customer list with RBAC-aware table
│   │   └── [id]/page.tsx         # Customer detail page
│   ├── inventory/
│   │   ├── page.tsx              # Linen inventory (RFID-tagged items)
│   │   ├── stock/page.tsx        # Consumables inventory
│   │   └── suppliers/page.tsx    # Supplier management
│   ├── operations/
│   │   ├── dispatch/page.tsx     # Dispatch & thermal label printing
│   │   └── job-orders/page.tsx   # (planned) Job order management
│   ├── finance/                  # (planned) Expenses & invoicing
│   ├── checkin/page.tsx          # Check-in functionality
│   ├── add-item/page.tsx         # Add new item
│   ├── ai-scanner/page.tsx       # AI quality scanning
│   └── reports/page.tsx          # Analytics and reporting

components/
├── ui/                           # 59 shadcn/ui base components (DO NOT modify directly)
├── sidebar.tsx                   # Main navigation with grouped routes
├── LanguageSwitcher.tsx          # Locale switcher
├── CustomerDataTable.tsx         # RBAC-aware data table with pagination
├── ActivitiesTable.tsx           # Recent activities log
└── CustomerCard.tsx              # Reusable customer card

contexts/
├── AuthContext.tsx               # RBAC state: user, hasPermission(), canAccessPage()
└── BranchContext.tsx             # Multi-tenancy: currentBranch, switchBranch()

lib/
├── types.ts                      # 627 lines - Complete business domain types
├── auth.ts                       # RBAC logic, mock users, permission helpers
└── navigation.ts                 # Locale-aware routing (CRITICAL: use for all navigation)

i18n/
├── config.ts                     # Locale definitions: ['en', 'th']
└── request.ts                    # Server-side message loading

messages/
├── en.json                       # 399 English translation keys
└── th.json                       # Thai translations

docs/api/
├── openapi.yaml                  # Complete API specification for Rust backend
└── README.md                     # API integration guide

middleware.ts                     # next-intl middleware (localePrefix: 'always')
```

## RBAC & Multi-Tenancy (CRITICAL)

### Role Hierarchy

```typescript
type UserRole = 'superadmin' | 'admin' | 'user'
```

**Role-Permission Matrix** (defined in `lib/auth.ts`):
- **superadmin**: All permissions + access to all branches
- **admin**: read, create, update, delete, view_reports + access to assigned branches
- **user**: read, create, view_reports + access to primary branch only

### Branch Access Rules

1. **Superadmin**: Can access ALL branches
2. **Admin**: Can access branches in `user.branchIds[]`
3. **User**: Can only access `user.branchId`

**Critical Helper Functions:**
```typescript
import { hasPermission, canAccessBranch, filterByBranchAccess } from '@/lib/auth'

// Check permission
hasPermission(user.role, 'delete') // true for admin, false for user

// Check branch access
canAccessBranch(user, branchId)

// Filter array by branch access
filterByBranchAccess(user, customers)
```

### Context Providers

**AuthContext** (`contexts/AuthContext.tsx`):
- Provides: `user`, `isLoading`, `isAuthenticated`, `hasPermission(permission)`, `canAccessPage(path)`, `login(email, password)`, `logout()`
- Hooks: `useAuth()`, `useUser()`, `useRole(role)`
- **Real auth**: on mount it validates the stored token via `GET /v1/auth/me`; `login()` calls `POST /v1/auth/login` and stores JWT + refresh token; `logout()` clears them. Permission/branch checks are still derived client-side from the server-provided `role` (UI convenience — backend enforces). The mock helpers in `lib/auth.ts` (`getCurrentUser`, `mockUsers`, `isAuthenticated`) are now unused/deprecated; the RBAC helper functions there are still used.
- **API layer**: `lib/api/` — `client.ts` (`apiFetch`, base URL from `NEXT_PUBLIC_API_URL`, silent 401→refresh→retry), `auth.ts` (login/me), `token-storage.ts` (localStorage). Route protection is client-side in `components/AuthGuard.tsx` (wraps the app shell in the locale layout; redirects to `/login`). Login page: `app/[locale]/login/page.tsx`.

**BranchContext** (`contexts/BranchContext.tsx`):
- Provides: `currentBranch`, `availableBranches`, `switchBranch(branchId)`
- Hooks: `useBranch()`, `useCurrentBranchId()`, `useCurrentBranch()`
- Derives accessible branches from the real logged-in user's `branchIds`, but branch **display details** (name/code/address) are still from a mock list — there is no "list branches" endpoint yet.
- Mock branches: Bangkok Central (BKK01), Chiang Mai (CNX01), Phuket (HKT01)

### UI Pattern with RBAC

```typescript
'use client'
import { useAuth } from '@/contexts/AuthContext'

export function MyComponent() {
  const { hasPermission } = useAuth()

  return (
    <div>
      {/* Everyone can view */}
      <ViewButton />

      {/* Only admin and superadmin can delete */}
      {hasPermission('delete') && <DeleteButton />}
    </div>
  )
}
```

**⚠️ Security Warning**: Frontend permissions are **UI-only**. Backend MUST validate all permissions and branch access.

## Internationalization (i18n)

### Configuration

- **Library**: next-intl v4.3.12
- **Locales**: `en` (English, default), `th` (Thai)
- **Routing**: ALL routes MUST be prefixed with locale (`/{locale}/path`)
- **Middleware**: `localePrefix: 'always'` in `middleware.ts`

### Translation Files

- **Location**: `messages/en.json`, `messages/th.json`
- **Structure**: Organized by feature namespace
  - `nav`: Navigation labels
  - `dashboard`: Dashboard page
  - `customers`: Customer management
  - `inventory`: Linen inventory
  - `inventoryManagement`: Stock & consumables
  - `operations`: Job orders & dispatch
  - `finance`: Expenses & invoicing
  - `reporting`: Analytics

**Always add translation keys to BOTH en.json and th.json**

### Navigation Setup (CRITICAL)

**DO NOT use `next/link` directly.** Use the locale-aware navigation helpers from `lib/navigation.ts`:

```typescript
import { Link, usePathname, useRouter } from '@/lib/navigation'

// ✅ Correct - automatic locale handling
<Link href="/customers">Customers</Link>

// ✅ usePathname returns path WITHOUT locale prefix
const pathname = usePathname() // "/customers" not "/en/customers"
const isActive = pathname === '/customers'

// ✅ Programmatic navigation with locale
const router = useRouter()
router.push('/customers')

// ❌ NEVER do this
import Link from 'next/link' // WRONG!
```

### Component Pattern

**Client Components:**
```typescript
'use client'
import { useTranslations } from 'next-intl'

export function MyComponent() {
  const t = useTranslations('namespace')
  return <h1>{t('title')}</h1>
}
```

**Server Components:**
```typescript
import { getTranslations } from 'next-intl/server'

export default async function MyPage() {
  const t = await getTranslations('namespace')
  return <h1>{t('title')}</h1>
}
```

## Adding New Routes

1. **Create page**: `app/[locale]/your-route/page.tsx`

2. **Update sidebar navigation** in `components/sidebar.tsx`:
```typescript
const groupedNavigation = [
  {
    groupKey: 'your-group',
    items: [
      {
        key: 'yourRoute',
        href: '/your-route',
        icon: YourIcon,
        translationNamespace: 'yourNamespace' // optional
      }
    ]
  }
]
```

3. **Add translations** to both `messages/en.json` and `messages/th.json`:
```json
{
  "nav": {
    "yourRoute": "Your Route Label"
  },
  "yourNamespace": {
    "title": "Page Title"
  }
}
```

## Component Patterns

### Server vs Client Components

**Prefer Server Components** (default in Next.js 15):
- No `'use client'` directive needed
- Can directly `await` data
- Better performance

**Use Client Components** (`'use client'`) when you need:
- React hooks (`useState`, `useEffect`)
- Event handlers (`onClick`, `onChange`)
- Browser APIs
- Context consumers (`useAuth`, `useBranch`, `useTranslations`)

### shadcn/ui Components

**DO NOT modify** files in `components/ui/` directly. Instead, compose them:

```typescript
// ✅ Correct - compose shadcn/ui components
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export function MyCard() {
  return (
    <Card>
      <Button>Click me</Button>
    </Card>
  )
}

// ❌ Wrong - modifying components/ui/button.tsx
```

### Path Alias

Always use `@/` for imports:
```typescript
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
```

## Type System

**Location**: `lib/types.ts` (627 lines)

Comprehensive type definitions for entire business domain:
- **RBAC**: `User`, `UserRole`, `Permission`, `Branch`
- **Inventory**: `InventoryItem`, `StockTransaction`, `Supplier`
- **Operations**: `JobOrder`, `ProductionRecord`, `ResourceUsage`
- **Finance**: `Expense`, `Invoice`, `Payment`, `CostCenter`
- **Reporting**: `DashboardMetrics`, `MaterialUsageTrend`

**Import types from lib/types.ts, not from individual files**

## Backend Service (`backend/`)

Node.js + TypeScript + **Express 5** + **PostgreSQL** (`pg`), JWT auth with refresh tokens. Entry point `src/index.ts` mounts routes under `/v1` and exposes `/health`.

**Layered structure** (routes → controllers → models):
- `src/config/` — `env.ts` (all config from env vars, port 8080 default) and `database.ts` (pg `Pool` + `query()` / `transaction()` helpers — use these rather than talking to the pool directly)
- `src/middleware/` — `auth.ts` (`authMiddleware` verifies JWT, populates `req.user` on the `AuthRequest` type) and `rbac.ts` (`requirePermission`, `requireRole`, `requireBranchAccess`)
- `src/routes/` → `src/controllers/` → `src/models/` — thin routers delegate to controllers, which call model classes that own the SQL
- `src/db/` — `schema.sql` (base tables), `migrate.ts` (runner: applies `schema.sql` then all `migrations/*.sql` in order), `migrations/` (additive, idempotent SQL). Write new migrations idempotently (`IF NOT EXISTS` / `DO $$ ... EXCEPTION WHEN duplicate_object` guards) since the runner re-applies everything each run.

**Implemented endpoints:**
- `POST /v1/auth/login`, `POST /v1/auth/refresh`, `GET /v1/auth/me`
- `POST /v1/auth/change-password` — change own password (auth required; revokes all refresh tokens on success)
- `GET/POST /v1/articles`, `GET/PUT/DELETE /v1/articles/:id` — Linen Article (SKU master) CRUD (`ArticleModel`); DELETE is a soft-delete (`is_active=false`). RBAC: read/create/update/delete.
- `GET/POST /v1/customers`, `GET/PUT/DELETE /v1/customers/:id` — Customer CRUD (`CustomerModel`, migration 004). Branch-scoped in the controller via `utils/branchScope.ts` (superadmin=all, admin=`branchIds`, user=primary). Soft-delete.
- `GET /v1/linen-items?status=&ownership=` — read-only linen inventory list (`LinenItemModel`), branch-scoped, LEFT JOINs `linen_articles` (articleName) + `customers` (customerName). Items are written only via the sync pipeline.
- `POST /v1/sync/batch` — handheld RFID devices upload a batch of offline-collected scan events. Registration (single or batch) is `item_receive` events here; `payload.articleId`/`payload.ownership` link the item to an Article and set rental/COG.
- `GET /v1/sync/reference?branchId=...` — reference data for devices to cache for offline use

**RBAC parity**: `backend/src/middleware/rbac.ts` mirrors the frontend role-permission matrix from `lib/auth.ts`. When you change permissions on one side, change both. **The backend is the real enforcement point** — frontend RBAC is UI-only.

**Offline sync model** (`src/models/sync.ts`): the core domain logic. Scan events carry a `clientUuid` for **idempotency** (re-uploading the same batch is safe), and a server-side `ALLOWED_TRANSITIONS` map enforces valid linen-item status changes (`In Stock` → `Washing` → `On-Rent`), rejecting illegal transitions rather than trusting the device. `linen_items` rows carry a `version` column for optimistic concurrency. Note: `customer_id` / `job_order_id` are plain VARCHARs with **no FK constraints** yet — those modules don't exist in the DB; add constraints via `ALTER TABLE` when they do.

**Code note**: `backend/` source contains Thai-language comments explaining business rules — preserve/match that style when editing those files.

## Frontend ↔ Backend Integration

### Done — Authentication
The full auth flow is integrated against the backend (see AuthContext / `lib/api/` above):
real login page, JWT + refresh-token storage, silent token refresh on 401, `/me`
session restore, client-side route guard, and logout. Set `NEXT_PUBLIC_API_URL`
(see `.env.example`) to point the frontend at the API.

### Done — Linen Articles + Registration
Real, backend-wired: the **Linen Types** page (`/inventory/articles`, `lib/api/articles.ts`)
does full Article CRUD, and the **Register Linen** page (`/add-item`, `lib/api/sync.ts`)
registers RFID linen single or batch by posting `item_receive` events to `/sync/batch`.
The **Account** page (`/account`, `lib/api/auth.ts` `changePasswordRequest`) changes the
password and forces re-login. These pages use plain `useEffect` fetch + inline `Alert`
feedback (no SWR/react-query; `<Toaster/>` is not mounted).

### Done — Customers + Inventory list
Real, backend-wired: the **Customers** page (`/customers` + `/customers/[id]`, `lib/api/customers.ts`)
does full CRUD via a dialog + `CustomerDataTable`; the detail page fetches by id (job-order history is
a placeholder pending the operations backend). The **Inventory** page (`/inventory`,
`lib/api/linen-items.ts`) is a real read-only list with status/ownership filters and canonical
statuses (`In Stock`/`Washing`/`On-Rent`). Branch scoping is enforced server-side.

### Not done — Remaining business data endpoints
Job Orders, Finance (expenses/invoices), consumable Stock, Suppliers, and Reports pages still read
mock data. The backend has **no endpoints** for these yet — build the modules first (routes →
controllers → models, mirroring `auth`/`sync`/`articles`/`customers`).

### Integration Pattern (for the data modules, when built)

1. **Add a data API module** in `lib/api/` using the existing `apiFetch` client
   (it already attaches the Bearer token and handles refresh):
```typescript
// lib/api/customers.ts
import { apiFetch } from './client'
export function fetchCustomers(branchId?: string) {
  const qs = branchId ? `?branchId=${encodeURIComponent(branchId)}` : ''
  return apiFetch<Customer[]>(`/customers${qs}`)
}
```

2. **Use SWR or React Query** for data fetching in the pages

3. **Environment variables**: the frontend already reads `NEXT_PUBLIC_API_URL`
   (e.g. `https://api.linenflow.com/v1`) — see `.env.example`. No new frontend
   env var is needed for additional data modules.

## Configuration Notes

### next.config.mjs

```javascript
eslint: { ignoreDuringBuilds: true }      // TODO: Set to false for production
typescript: { ignoreBuildErrors: true }    // TODO: Set to false for production
images: { unoptimized: true }              // Deployment flexibility
```

**These should be tightened for production builds**

### No Test Framework

Currently no test framework is configured. Consider adding:
- Jest + React Testing Library
- Playwright for E2E tests

## Documentation Files

- **ARCHITECTURE.md** (467 lines): Comprehensive RBAC & multi-tenancy guide with examples
- **agent.md** (91 lines): Coding patterns, persona, and tech stack for AI assistance
- **docs/api/README.md**: API integration guide with curl examples
- **docs/api/openapi.yaml**: Complete OpenAPI 3.0 specification

**Refer to ARCHITECTURE.md for detailed RBAC patterns and security considerations**

## Common Pitfalls

1. ❌ Using `next/link` instead of `@/lib/navigation` Link
2. ❌ Hardcoding text instead of using `useTranslations()`
3. ❌ Modifying `components/ui/*` files directly
4. ❌ Forgetting to add `'use client'` when using hooks
5. ❌ Adding translation keys to only one language file
6. ❌ Trusting frontend permissions without backend validation
7. ❌ Not including `branchId` in API mutations

## Git Workflow

**Current Branch**: `phase-i-deployment`

**Recent Commits** (Phased Development, newest first):
- Integrate frontend auth with backend API (login/refresh/me/guard fully wired)
- Phase I: RFID Sync API + production deployment setup (`docker-compose.prod.yml`, Dockerfiles)
- Phase H: Complete Backend API with Authentication & RBAC (`backend/` service)
- Phase G.2: Complete i18n for Check-in & Suppliers pages
- Phase G.1: Linen Inventory complete upgrade
- Phases A–D (earlier): RBAC & multi-tenancy, OpenAPI contract, Customers, Inventory/Operations/Finance

The `inventory/suppliers/` page is now committed (Phase G.2). Remaining big gap: **business
data endpoints** (Customers/Inventory/Job Orders/Finance) — frontend still on mock data.
