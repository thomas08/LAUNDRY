# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `pnpm dev` - Start development server
- `pnpm build` - Build the application for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint to check code quality

## Architecture

This is a Next.js 15 application with App Router implementing a laundry management system called "LaundryPro". The project uses:

**Framework & Core:**
- Next.js 15 with App Router
- React 19
- TypeScript with strict configuration

**Styling & UI:**
- Tailwind CSS v4 with CSS variables
- shadcn/ui components (New York style)
- Radix UI primitives
- Lucide React icons
- Geist fonts (Sans & Mono)

**Key Dependencies:**
- React Hook Form with Zod validation
- Next Themes for theme management
- Sonner for toast notifications
- Date-fns for date handling
- Recharts for data visualization

## Project Structure

```
app/
├── layout.tsx          # Root layout with sidebar and dark theme
├── page.tsx            # Dashboard with KPI cards and activities table
├── customers/
│   ├── page.tsx        # Customer list page
│   └── [id]/page.tsx   # Individual customer detail page
└── globals.css         # Global styles

components/
├── ui/                 # shadcn/ui components
├── sidebar.tsx         # Main navigation sidebar
├── kpi-card.tsx        # Dashboard KPI display cards
└── activities-table.tsx # Activities data table

lib/                    # Utility functions
hooks/                  # Custom React hooks
```

**Navigation Structure:**
The sidebar defines these main routes:
- `/` - Dashboard (KPIs and activities overview)
- `/customers` - Customer management with detail pages at `/customers/[id]`
- `/orders` - Order management (not yet implemented)
- `/services` - Service management (not yet implemented)
- `/settings` - Application settings (not yet implemented)

**Component Patterns:**
- Uses `@/` path alias for imports (maps to project root)
- Client components marked with "use client" directive
- UI components follow shadcn/ui patterns with variant-based styling
- Dark theme is default with support for theme switching

**Configuration Notes:**
- TypeScript and ESLint errors are ignored during builds (see next.config.mjs)
- Images are unoptimized for deployment flexibility
- No test framework is currently configured