# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Layout

This is a **two-part repo**: the Next.js frontend lives at the root, and a standalone Node.js API lives in `backend/`. They are independent projects with separate `package.json`, `tsconfig.json`, and dependencies. The frontend still renders from **mock data** (`lib/auth.ts`, etc.) and is **not yet wired to the backend** — the backend currently implements auth and RFID sync only.

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

LinenFlow™ is a Next.js 15 laundry management system with comprehensive RBAC (Role-Based Access Control), multi-tenancy support, and full internationalization. The frontend runs on **mock data**; a separate Express/PostgreSQL backend (`backend/`) provides real auth and offline RFID sync but is not yet consumed by the frontend.

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
- Provides: `user`, `hasPermission(permission)`, `canAccessPage(path)`, `login()`, `logout()`
- Hooks: `useAuth()`, `useUser()`, `useRole(role)`
- Currently returns mock superadmin (see `lib/auth.ts` `getCurrentUser()`)

**BranchContext** (`contexts/BranchContext.tsx`):
- Provides: `currentBranch`, `availableBranches`, `switchBranch(branchId)`
- Hooks: `useBranch()`, `useCurrentBranchId()`, `useCurrentBranch()`
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
- `POST /v1/sync/batch` — handheld RFID devices upload a batch of offline-collected scan events
- `GET /v1/sync/reference?branchId=...` — reference data for devices to cache for offline use

**RBAC parity**: `backend/src/middleware/rbac.ts` mirrors the frontend role-permission matrix from `lib/auth.ts`. When you change permissions on one side, change both. **The backend is the real enforcement point** — frontend RBAC is UI-only.

**Offline sync model** (`src/models/sync.ts`): the core domain logic. Scan events carry a `clientUuid` for **idempotency** (re-uploading the same batch is safe), and a server-side `ALLOWED_TRANSITIONS` map enforces valid linen-item status changes (`In Stock` → `Washing` → `On-Rent`), rejecting illegal transitions rather than trusting the device. `linen_items` rows carry a `version` column for optimistic concurrency. Note: `customer_id` / `job_order_id` are plain VARCHARs with **no FK constraints** yet — those modules don't exist in the DB; add constraints via `ALTER TABLE` when they do.

**Code note**: `backend/` source contains Thai-language comments explaining business rules — preserve/match that style when editing those files.

## Frontend ↔ Backend Integration (In Progress)

### Current State
- Frontend data is mocked (see `lib/auth.ts` `mockUsers`); `getCurrentUser()` returns mock superadmin
- No API client in the frontend yet — the `backend/` auth+sync endpoints exist but nothing in `app/` calls them

### API Specification
- **Location**: `docs/api/openapi.yaml`
- **Documentation**: `docs/api/README.md`
- **Endpoints**: Authentication, Customers, Inventory, RFID, QC
- **Auth**: JWT Bearer tokens
- **Multi-tenancy**: All mutations require `branchId`

### Integration Pattern

When ready to integrate backend:

1. **Replace mock auth** in `lib/auth.ts`:
```typescript
// Replace getCurrentUser() to read from NextAuth.js or similar
export function getCurrentUser(): User | null {
  // Read from session instead of returning mockUsers.superadmin
}
```

2. **Create API client** in `lib/api/`:
```typescript
// lib/api/customers.ts
export async function fetchCustomers(branchId?: string) {
  const user = getCurrentUser()
  const params = new URLSearchParams()
  if (branchId) params.append('branchId', branchId)

  const response = await fetch(`${API_URL}/customers?${params}`, {
    headers: {
      'Authorization': `Bearer ${user.token}`,
      'Content-Type': 'application/json'
    }
  })

  return response.json()
}
```

3. **Use SWR or React Query** for data fetching

4. **Add environment variables**:
```bash
API_URL=https://api.linenflow.com/v1
JWT_SECRET=...
```

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

**Current Branch**: `main`

**Recent Commits** (Phased Development):
- Phase D: Inventory, Operations & Finance Management System
- Phase C: Enhanced Customers Page with Search, Filter & Pagination
- Phase B: Create comprehensive API Contract (OpenAPI 3.0)
- Phase A: Implement RBAC & Multi-Tenancy Architecture

**Untracked**: `app/[locale]/inventory/suppliers/` (new feature in development)
