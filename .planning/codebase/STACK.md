# Technology Stack

**Analysis Date:** 2026-02-26

## Languages

**Primary:**
- TypeScript 5.x (strict mode) - All `.ts` and `.tsx` files throughout `app/`, `components/`, `hooks/`, `lib/`
- JavaScript - Build and configuration files (`.mjs`)
- CSS - Global styles in `app/globals.css`

## Runtime

**Environment:**
- Node.js (version not explicitly pinned; uses ESM modules)

**Package Manager:**
- pnpm (must use pnpm, not npm or yarn)
- Lockfile: `pnpm-lock.yaml` present

## Frameworks

**Core:**
- Next.js 15.2.4 - Full-stack React framework with App Router
- React 19 - UI library with React DOM 19
- Next-Themes 0.4.4 - Dark mode theming support

**UI Components:**
- Shadcn/ui - Component library (50+ installed primitives from Radix UI)
- Radix UI (20+ packages) - Unstyled, composable components (`@radix-ui/react-*`)
  - Examples: `@radix-ui/react-dialog`, `@radix-ui/react-select`, `@radix-ui/react-accordion`
- Lucide React 0.454.0 - SVG icon library

**Forms & Input:**
- React Hook Form 7.54.1 - Form state management
- Zod 3.24.1 - Schema validation and TypeScript types
- @hookform/resolvers 3.9.1 - Integration between React Hook Form and Zod

**Styling:**
- Tailwind CSS 3.4.17 - Utility-first CSS framework
  - Post CSS 8.x for processing
  - Autoprefixer 10.4.20 - CSS vendor prefixes
  - Tailwind Merge 2.5.5 - Utility merge helper (used in `lib/utils.ts`)
  - TailwindCSS Animate 1.0.7 - Animation utilities

**UI Libraries:**
- Class Variance Authority 0.7.1 - Type-safe component variants
- clsx 2.1.1 - Conditional className builder
- Embla Carousel React 8.5.1 - Carousel/slider functionality
- React Resizable Panels 2.1.7 - Resizable panel layouts
- React Day Picker 8.10.1 - Date picker component
- Recharts 2.15.0 - React chart library
- Sonner 1.7.1 - Toast notification library
- cmdk 1.0.4 - Command/search palette component
- Input OTP 1.4.1 - OTP input component
- Vaul 0.9.6 - Drawer component library
- Date-fns 4.1.0 - Date utility library

## Key Dependencies

**Critical:**
- Next.js 15.2.4 - Application runtime and build system
- React 19 - Core UI rendering
- TypeScript 5 - Type safety and compilation
- Tailwind CSS 3.4.17 - All styling

**Infrastructure:**
- Radix UI (20+ packages) - Accessible primitive components
- Shadcn/ui - Pre-configured component system

## Configuration

**Environment:**
- Environment configuration via optional `v0-user-next.config.mjs` (v0.dev convention)
- No `.env` file requirements documented (dashboard appears to be client-side focused)
- Theming: CSS variables in HSL format defined in `app/globals.css`

**Build:**
- `next.config.mjs` - Next.js configuration with experimental features enabled
- `tsconfig.json` - TypeScript strict mode enabled
- `tailwind.config.ts` - Tailwind theme extensions
- `postcss.config.mjs` - PostCSS configuration
- `components.json` - Shadcn/ui metadata and aliases
- Path alias: `@/*` maps to project root (e.g., `@/components/ui/button` → `./components/ui/button`)

**Build Features:**
- ESLint disabled during `next build` (see `next.config.mjs`)
- TypeScript errors ignored during `next build`
- Images unoptimized (suitable for static export)
- Experimental webpack build worker enabled
- Parallel server build traces enabled
- Parallel server compiles enabled

## Platform Requirements

**Development:**
- Node.js with pnpm
- Command aliases for Docker operations (via `ddd` alias setup)

**Production:**
- Docker container deployment (dashboard intended for Docker-based web hosting management)
- Static export compatible (images configured as unoptimized)

---

*Stack analysis: 2026-02-26*
