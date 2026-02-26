# Codebase Structure

**Analysis Date:** 2026-02-26

## Directory Layout

```
dashed-droplets-dashboard/
├── app/                    # Next.js App Router routes and layouts
│   ├── layout.tsx          # Root layout wrapper
│   ├── page.tsx            # Dashboard page (index route)
│   └── globals.css         # Global styles and CSS variables
├── components/             # React components
│   ├── ui/                 # Shadcn/ui design system (50+ primitives)
│   ├── dashboard-header.tsx       # Sticky header with title
│   ├── quick-start-card.tsx       # Quick start actions card
│   ├── build-image-card.tsx       # Docker image build form
│   ├── run-container-card.tsx     # Container run form
│   ├── container-status-card.tsx  # Container status display
│   └── theme-provider.tsx         # Dark mode provider wrapper
├── hooks/                  # Custom React hooks
│   ├── use-mobile.tsx      # Responsive breakpoint detection hook
│   └── use-toast.ts        # Toast notification state management
├── lib/                    # Utilities and helpers
│   └── utils.ts            # Tailwind class merge utility (cn)
├── public/                 # Static assets
│   ├── placeholder-logo.png
│   ├── placeholder-logo.svg
│   ├── placeholder-user.jpg
│   └── placeholder.svg
├── styles/                 # Additional stylesheets (if any)
├── .next/                  # Next.js build output (gitignored)
├── node_modules/           # Dependencies (gitignored)
├── package.json            # Project metadata and dependencies
├── pnpm-lock.yaml          # pnpm lockfile (exact versions)
├── tsconfig.json           # TypeScript configuration
├── next.config.mjs         # Next.js build configuration
├── tailwind.config.ts      # Tailwind CSS configuration
├── postcss.config.mjs      # PostCSS configuration
├── components.json         # Shadcn/ui configuration
└── CLAUDE.md               # Claude Code instructions
```

## Directory Purposes

**app/**
- Purpose: Next.js App Router application root; routes and layouts
- Contains: Server components, page components, global CSS
- Key files: `layout.tsx` (root wrapper), `page.tsx` (dashboard page), `globals.css` (theming)

**components/**
- Purpose: Reusable React components
- Contains: Feature components (dashboard-specific) and UI primitives (design system)
- Key subdirectory: `ui/` contains 50+ Shadcn/ui wrapped components (read-only; add via `pnpm dlx shadcn@latest add <component>`)

**components/ui/**
- Purpose: Shadcn/ui design system primitives built on Radix UI
- Contains: Button, Card, Input, Select, Dialog, Toast, Accordion, Tabs, etc.
- Key pattern: All components use `cn()` utility from `lib/utils.ts` for class merging
- Note: Do NOT manually edit; regenerate with `pnpm dlx shadcn@latest add <component>`

**hooks/**
- Purpose: Custom React hooks for shared logic
- Contains: `useToast()` (toast state management with reducer), `useIsMobile()` (responsive detection)

**lib/**
- Purpose: Utility functions and helpers
- Contains: `cn()` function for merging Tailwind classes (clsx + tailwind-merge)

**public/**
- Purpose: Static assets served by Next.js
- Contains: Placeholder images (logo, user avatar, generic placeholder)

## Key File Locations

**Entry Points:**
- `app/layout.tsx`: Root HTML layout, metadata setup
- `app/page.tsx`: Dashboard page (renders main UI)

**Configuration:**
- `package.json`: Dependencies, npm scripts
- `tsconfig.json`: TypeScript strict mode config, path aliases (`@/*`)
- `next.config.mjs`: Next.js build config (ignores TS/ESLint errors, unoptimized images)
- `tailwind.config.ts`: Tailwind CSS theme extensions (color tokens, animations)
- `postcss.config.mjs`: PostCSS plugins (Tailwind)
- `components.json`: Shadcn/ui metadata (aliases, component paths)

**Styling:**
- `app/globals.css`: CSS variables (HSL format) for light/dark theme + Tailwind directives
- `tailwind.config.ts`: Tailwind theme extensions using CSS variables

**Core Logic:**
- `app/page.tsx`: Dashboard layout and component composition
- `components/dashboard-header.tsx`: Sticky header with Docker logo and title
- `components/quick-start-card.tsx`: 4 quick action buttons
- `components/build-image-card.tsx`: Image type select + container name input + build button
- `components/run-container-card.tsx`: Container name input + options input + run button
- `components/container-status-card.tsx`: Empty state display for active containers

**Utilities:**
- `lib/utils.ts`: `cn()` function for Tailwind class merging
- `hooks/use-toast.ts`: Toast state management with reducer pattern
- `hooks/use-mobile.tsx`: Media query hook for responsive detection

## Naming Conventions

**Files:**
- Feature components: kebab-case, descriptive name (e.g., `dashboard-header.tsx`, `build-image-card.tsx`)
- UI components: kebab-case component name (e.g., `button.tsx`, `card.tsx`)
- Hooks: kebab-case with `use-` prefix (e.g., `use-mobile.tsx`, `use-toast.ts`)
- Configuration: kebab-case with .config suffix (e.g., `next.config.mjs`, `tailwind.config.ts`)
- TypeScript: Use .ts for non-React, .tsx for React components

**Directories:**
- All lowercase: `app/`, `components/`, `hooks/`, `lib/`, `public/`
- Feature subdirectory: `ui/` for design system primitives

**Components (React):**
- PascalCase function names (e.g., `DashboardHeader`, `QuickStartCard`)
- Exported with named export: `export function ComponentName() {}`
- Display name set: `Button.displayName = "Button"`

**Functions/Utilities:**
- camelCase: `cn()`, `useToast()`, `useIsMobile()`

**CSS Classes:**
- Tailwind utility classes: kebab-case (e.g., `bg-gray-50`, `dark:bg-gray-900`, `md:grid-cols-2`)
- Theme variables: kebab-case with double-dash prefix (e.g., `--background`, `--card-foreground`)

## Where to Add New Code

**New Feature Component:**
- Location: `components/`
- Example: Create `components/new-feature.tsx` with PascalCase function export
- Import pattern: `import { Button } from "@/components/ui/button"`
- Styling: Use Tailwind utility classes directly
- Structure: Compose feature from `components/ui/*` primitives

**New UI Primitive (from Shadcn):**
- Command: `pnpm dlx shadcn@latest add <component-name>`
- Installed to: `components/ui/<component>.tsx`
- DO NOT manually edit existing Shadcn components

**New Hook:**
- Location: `hooks/use-<feature>.tsx` (or `.ts` if no React elements)
- Pattern: Use state, effect, reducer as needed
- Example: `hooks/use-docker-status.tsx` for Docker container state

**New Utility Function:**
- Location: `lib/utils.ts` (or create new file if large: `lib/<feature-utils>.ts`)
- Export: Named export, prefer pure functions
- Pattern: Keep utilities focused and reusable

**New Page Route:**
- Location: `app/<route>/page.tsx`
- Pattern: Create directory, add `page.tsx` (App Router convention)
- Example: `app/containers/page.tsx` for `/containers` route

**Global Styles:**
- Location: `app/globals.css`
- Pattern: CSS variables (HSL format), Tailwind directives, custom utilities
- Dark mode: Use CSS variables defined in `.dark` class

## Special Directories

**components/ui/**
- Purpose: Shadcn/ui design system (Radix UI + Tailwind wrapped components)
- Generated: Yes (by `shadcn` CLI)
- Committed: Yes (committed to git as source of truth)
- Modification: DO NOT manually edit; regenerate or override via component imports
- Count: 50+ components included

**.next/**
- Purpose: Next.js build output (compiled code, cache)
- Generated: Yes (by `next build`)
- Committed: No (in .gitignore)
- Modification: Never edit; rebuild with `pnpm build`

**node_modules/**
- Purpose: npm dependencies
- Generated: Yes (by `pnpm install`)
- Committed: No (in .gitignore)
- Modification: Never edit; update via `pnpm add` or `pnpm install`

---

*Structure analysis: 2026-02-26*
