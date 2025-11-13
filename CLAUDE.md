# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `pnpm dev` - Start development server
- `pnpm build` - Build the application for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint to check code quality

## Architecture

This is a Next.js 15 application with App Router implementing a laundry management system called "LinenFlow™". The project uses:

**Framework & Core:**
- Next.js 15 with App Router
- React 19
- TypeScript with strict configuration

**Internationalization:**
- next-intl for i18n support
- Supported locales: English (en) and Thai (th)
- Default locale: English
- Translation files in `messages/` directory (en.json, th.json)
- Configuration in `i18n/config.ts` and `i18n/request.ts`

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
- Vercel Analytics

## Project Structure

```
app/
├── layout.tsx              # Root layout (minimal, sets up html/body)
├── [locale]/
│   ├── layout.tsx          # Locale-specific layout with sidebar, i18n provider, dark theme
│   ├── page.tsx            # Dashboard with KPI cards and activities table
│   ├── customers/
│   │   ├── page.tsx        # Customer list page
│   │   └── [id]/page.tsx   # Individual customer detail page
│   ├── checkin/page.tsx    # Check-in functionality
│   ├── add-item/page.tsx   # Add item functionality
│   ├── ai-scanner/page.tsx # AI scanning feature
│   ├── inventory/page.tsx  # Inventory management
│   └── reports/page.tsx    # Reporting interface
└── globals.css             # Global styles

components/
├── ui/                     # shadcn/ui components
├── sidebar.tsx             # Main navigation sidebar with locale-aware routing
├── LanguageSwitcher.tsx    # Language switching component
├── kpi-card.tsx            # Dashboard KPI display cards
├── activities-table.tsx    # Activities data table
└── CustomerCard.tsx        # Customer card component

i18n/
├── config.ts               # Locale configuration (locales array, default locale)
└── request.ts              # next-intl request configuration with fallback logic

messages/
├── en.json                 # English translations
└── th.json                 # Thai translations
```

## Routing & Internationalization

**Locale-based Routing:**
- All main routes are prefixed with locale: `/{locale}/path`
- Root layout (`app/layout.tsx`) is minimal and wraps locale-specific layout
- Locale layout (`app/[locale]/layout.tsx`) provides:
  - NextIntlClientProvider with messages
  - Sidebar navigation
  - Dark theme by default
  - Locale validation (404 for invalid locales)

**Navigation Structure (defined in sidebar.tsx):**
- `/` - Dashboard (Overview section)
- `/checkin` - Check-in (Operations section)
- `/add-item` - Add Item (Operations section)
- `/ai-scanner` - AI Scanner (Operations section)
- `/customers` - Customer management (Management section)
- `/inventory` - Inventory management (Management section)
- `/reports` - Reports (Reports section)

**Adding New Routes:**
1. Create pages under `app/[locale]/` directory
2. Update `sidebar.tsx` groupedNavigation array to add to navigation menu
3. Add translation keys to `messages/en.json` and `messages/th.json`

**Working with Translations:**
- Use `useTranslations()` hook in client components
- Translation keys are organized by namespace (e.g., 'nav' for navigation)
- Always add keys to both en.json and th.json for consistency

## Component Patterns

- Uses `@/` path alias for imports (maps to project root)
- Client components marked with "use client" directive
- UI components follow shadcn/ui patterns with variant-based styling
- Dark theme is default with support for theme switching via next-themes
- Server components can directly await data (see dashboard page.tsx)

## Configuration Notes

- TypeScript and ESLint errors are ignored during builds (see next.config.mjs)
- Images are unoptimized for deployment flexibility
- next-intl plugin is configured in next.config.mjs
- No test framework is currently configured
