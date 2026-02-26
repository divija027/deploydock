# Dashed Droplets Dashboard — Project Documentation

## What We're Building

A **self-hosted Docker PaaS dashboard** — a web interface that lets you manage Docker containers, deploy apps via Git push, monitor resources in real-time, and visualize your container network. Think of it as a simplified Heroku/Dokku that you control.

**Inspired by:**
- [d-a-s-h-o/droplets](https://github.com/d-a-s-h-o/droplets) — Docker web hosting with `ddd` CLI, Tor support, QR codes
- [Dokku](https://github.com/dokku/dokku) — Git-push PaaS on your own server

---

## Feature Set

| Feature | Description | CS Concept Covered |
|---------|-------------|-------------------|
| Container management | List, start, stop, restart, remove containers | OS / process lifecycle |
| Image management | Pull, build, list images with progress | Networking / I/O |
| Live container logs | Stream logs via SSE in real-time | Real-time systems |
| Resource metrics | CPU%, RAM, Network I/O charts | OS / cgroups |
| Network topology | D3.js interactive force graph | Data visualization |
| Git auto-deploy | GitHub webhook → clone → build → run | CI/CD / DevOps |
| Env var management | Per-app key-value secrets editor | Security |
| Multi-user auth + RBAC | NextAuth.js with admin/dev/viewer roles | Security / auth |
| App templates | One-click deploy for common services | UX / usability |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 App Router, React 19, TypeScript |
| Styling | Tailwind CSS, Shadcn/ui, Radix UI |
| Charts | Recharts (metrics), D3.js (network graph) |
| Docker API | dockerode (Node.js SDK → `/var/run/docker.sock`) |
| Database | SQLite via Prisma ORM |
| Auth | NextAuth.js v5 with Prisma adapter |
| Real-time | SSE (Server-Sent Events) — built into Next.js |
| Deploy | simple-git for git clone in webhook pipeline |

---

## Documentation Index

| File | Topic |
|------|-------|
| [01-architecture.md](./01-architecture.md) | System architecture, data flow, directory structure |
| [02-docker-integration.md](./02-docker-integration.md) | dockerode patterns, all API routes |
| [03-authentication.md](./03-authentication.md) | NextAuth.js setup, RBAC, Prisma adapter |
| [04-realtime-sse.md](./04-realtime-sse.md) | SSE for logs and metrics (server + client) |
| [05-network-topology.md](./05-network-topology.md) | D3.js force graph — full implementation |
| [06-git-autodeploy.md](./06-git-autodeploy.md) | GitHub webhook → build → deploy pipeline |
| [07-database-schema.md](./07-database-schema.md) | Prisma schema, all models, migrations |
| [08-cs-concepts.md](./08-cs-concepts.md) | Academic angle — what each feature demonstrates |

---

## Quick Start (Once Implemented)

```bash
# Install dependencies
pnpm install

# Set up database
pnpm prisma migrate dev --name init

# Set environment variables
cp .env.example .env.local
# Fill: NEXTAUTH_SECRET, WEBHOOK_SECRET, DATABASE_URL

# Start dev server
pnpm dev

# Open http://localhost:3000
# Login with seeded admin account
```

---

## Implementation Order

Follow this sequence to avoid dependency issues:

```
Phase 1 — Data layer
  prisma/schema.prisma → migrate → lib/prisma.ts + lib/docker/client.ts

Phase 2 — Core API routes
  /api/docker/containers/* → /api/docker/images/* → /api/docker/networks/*

Phase 3 — Real-time
  /api/docker/containers/[id]/logs (SSE)
  /api/docker/containers/[id]/stats (SSE)

Phase 4 — Auth
  auth.ts → middleware.ts → /app/login/page.tsx

Phase 5 — UI components
  container-logs.tsx → metrics-chart.tsx → network-graph.tsx

Phase 6 — Deploy pipeline
  /api/webhooks/deploy → app/deployments/page.tsx

Phase 7 — Polish
  env-vars-editor.tsx → template-gallery.tsx → wire up existing cards
```
