# External Integrations

**Analysis Date:** 2026-02-26

## APIs & External Services

**Not detected** - This dashboard is a client-side UI only. No external API integrations found in the codebase.

## Data Storage

**Databases:**
- Not applicable - Dashboard contains no backend services or database connections

**File Storage:**
- Local filesystem only - No cloud storage integrations

**Caching:**
- Not implemented

## Authentication & Identity

**Auth Provider:**
- None - Dashboard is an unprotected, static UI

**Authentication:**
- Not implemented

## Monitoring & Observability

**Error Tracking:**
- None detected

**Logs:**
- Console only via browser DevTools

## CI/CD & Deployment

**Hosting:**
- Docker container (intended use case based on dashboard theme)
- Next.js can run as standalone binary or via Node.js

**CI Pipeline:**
- None configured in repository

## Environment Configuration

**Required env vars:**
- None documented or required

**Secrets location:**
- Not applicable

## Webhooks & Callbacks

**Incoming:**
- None - Dashboard is frontend only

**Outgoing:**
- None

## Design & Build System

**Component Library Source:**
- Shadcn/ui components installed locally (not pulled at runtime)
- Install new components via: `pnpm dlx shadcn@latest add <component>`
- Do not modify Shadcn/ui components manually (`components/ui/` directory)

**Theme System:**
- CSS variables (HSL format) defined in `app/globals.css`
- Dark mode class-based via `next-themes` package
- Tailwind CSS extends theme variables via `tailwind.config.ts`

**Icon Library:**
- Lucide React icons - All icons sourced from lucide-react package
- No external icon service integration

---

*Integration audit: 2026-02-26*
