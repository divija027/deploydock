# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev       # Start development server
pnpm build     # Build for production
pnpm start     # Start production server
pnpm lint      # Run ESLint
```

Use **pnpm** (not npm or yarn) — `pnpm-lock.yaml` is the lockfile.

## Architecture

This is a **Next.js 15 App Router** project bootstrapped by [v0.dev](https://v0.dev), serving as a Docker container management dashboard.

**Tech stack:** React 19, TypeScript (strict), Tailwind CSS (class-based dark mode), Shadcn/ui + Radix UI, Lucide React icons.

**App structure:**
- `app/` — Next.js App Router (layout, page, global CSS)
- `components/ui/` — Shadcn/ui primitives (50+ components, do not modify manually; add via `pnpm dlx shadcn@latest add <component>`)
- `components/` — Feature components: `dashboard-header`, `quick-start-card`, `build-image-card`, `run-container-card`, `container-status-card`, `theme-provider`
- `hooks/` — Custom hooks (`use-mobile`, `use-toast`)
- `lib/utils.ts` — Tailwind class merge utility (`cn()`)

**Component hierarchy:**
```
layout.tsx
└── page.tsx
    ├── DashboardHeader (sticky)
    ├── QuickStartCard
    ├── BuildImageCard
    ├── RunContainerCard
    └── ContainerStatusCard
```

## Key Configuration

- **Path alias:** `@/*` maps to the project root
- **Theming:** CSS variables (HSL format) defined in `app/globals.css`; Tailwind extends these via `tailwind.config.ts`
- **Next.js build:** ESLint and TypeScript errors are intentionally ignored during `next build` (see `next.config.mjs`)
- **Images:** Unoptimized (suitable for static export)
- Optional user config: `v0-user-next.config.mjs` is merged if present (v0.dev convention)
