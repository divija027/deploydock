# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                          Browser                                 │
│  Dashboard UI (React components, Shadcn/ui, Tailwind CSS)        │
│  ┌──────────┐  ┌───────────┐  ┌──────────────┐  ┌───────────┐  │
│  │Container │  │  Metrics  │  │   Network    │  │   Deploy  │  │
│  │  Cards   │  │  Charts   │  │    Graph     │  │  History  │  │
│  │          │  │(Recharts) │  │   (D3.js)    │  │           │  │
│  └──────────┘  └───────────┘  └──────────────┘  └───────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP / SSE / EventSource
┌────────────────────────────▼────────────────────────────────────┐
│                     Next.js App Router                           │
│                                                                  │
│  app/api/docker/*    ──────────►  dockerode                      │
│  app/api/webhooks/*  ──────────►  simple-git + docker build      │
│  app/api/auth/*      ──────────►  NextAuth.js                    │
│  SSE route handlers  ──────────►  ReadableStream → EventSource   │
└────────────────┬──────────────────────────┬─────────────────────┘
                 │                          │
    ┌────────────▼───────────┐   ┌──────────▼──────────────┐
    │   Docker Engine        │   │   SQLite Database        │
    │   /var/run/docker.sock │   │   (Prisma ORM)           │
    │                        │   │   users, deployments,    │
    │   containers, images,  │   │   app_configs, sessions  │
    │   networks, volumes    │   └─────────────────────────┘
    └────────────────────────┘
```

## Data Flow Patterns

### 1. Container List (standard REST)
```
Dashboard loads → GET /api/docker/containers → dockerode.listContainers() → JSON response → render cards
User clicks "Stop" → PATCH /api/docker/containers/{id} { action: "stop" } → container.stop() → 200 OK → update UI
```

### 2. Live Logs (SSE)
```
User opens log viewer → new EventSource("/api/docker/containers/{id}/logs")
Server → container.logs({ follow: true }) → stream chunks → encode as SSE data: {...}\n\n
Client → es.onmessage → append line to log terminal
User closes tab → req.signal "abort" event → logStream.destroy() → cleanup
```

### 3. Git Auto-Deploy (webhook pipeline)
```
Developer: git push origin main
GitHub → POST /api/webhooks/deploy (HMAC-verified)
Server → create Deployment record (status: "building")
Server (async) → git clone → docker buildImage() → stop old → docker.createContainer() + start()
Server → update Deployment (status: "success" or "failed")
Dashboard polls /api/deployments → shows live status
```

### 4. Auth + RBAC
```
User → /login → POST credentials → NextAuth authorize() → bcrypt compare → JWT with role
All /app/* routes → middleware.ts → auth() → redirect if no session
API routes → const session = await auth() → check session.user.role → 403 if insufficient
```

---

## Directory Structure (Final State)

```
dashed-droplets-dashboard/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── docker/
│   │   │   ├── containers/
│   │   │   │   ├── route.ts             # GET list, POST create
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts         # PATCH action, DELETE
│   │   │   │       ├── logs/route.ts    # SSE log stream
│   │   │   │       └── stats/route.ts   # SSE metrics stream
│   │   │   ├── images/
│   │   │   │   ├── route.ts             # GET list, POST pull
│   │   │   │   └── [id]/route.ts        # DELETE remove
│   │   │   └── networks/route.ts        # GET topology data
│   │   ├── webhooks/
│   │   │   └── deploy/route.ts          # GitHub webhook receiver
│   │   └── deployments/route.ts         # GET deploy history
│   ├── deployments/page.tsx             # Deploy history UI
│   ├── login/page.tsx                   # Auth page
│   ├── layout.tsx                       # Root layout (add ThemeProvider + SessionProvider)
│   ├── page.tsx                         # Main dashboard
│   └── globals.css
├── components/
│   ├── ui/                              # Shadcn primitives (unchanged)
│   ├── container-logs.tsx               # SSE log viewer
│   ├── metrics-chart.tsx                # Recharts + SSE
│   ├── network-graph.tsx                # D3.js force graph
│   ├── env-vars-editor.tsx              # Key-value env editor
│   ├── template-gallery.tsx             # One-click templates
│   ├── deploy-status-badge.tsx          # Colored status chip
│   ├── dashboard-header.tsx             # (existing — add user avatar + signout)
│   ├── container-status-card.tsx        # (wire up to real API)
│   ├── build-image-card.tsx             # (wire up to real API)
│   ├── run-container-card.tsx           # (wire up to real API)
│   ├── quick-start-card.tsx             # (wire up handlers)
│   └── theme-provider.tsx               # (existing)
├── lib/
│   ├── docker/
│   │   ├── client.ts                    # dockerode singleton
│   │   └── buildpack.ts                 # language auto-detection
│   ├── prisma.ts                        # Prisma client singleton
│   ├── auth-utils.ts                    # HMAC verify, role guards
│   └── utils.ts                         # existing cn() helper
├── hooks/
│   ├── use-sse.ts                       # generic SSE hook
│   ├── use-mobile.tsx                   # existing
│   └── use-toast.ts                     # existing
├── types/
│   ├── docker.ts                        # Container, Image, NetworkNode interfaces
│   └── next-auth.d.ts                   # Augment session with role
├── auth.ts                              # NextAuth config (project root)
├── middleware.ts                        # Route protection
├── prisma/
│   └── schema.prisma                    # DB schema
├── .env.local                           # Secrets (gitignored)
├── CLAUDE.md
└── package.json
```

---

## Key Design Decisions

### Why Next.js API Routes (not a separate backend)?
The existing stack is Next.js. Using Route Handlers keeps the project as a single deployable unit with no CORS issues, shared TypeScript types between frontend and backend, and simpler setup for a university project.

### Why SSE over WebSocket?
SSE is unidirectional (server → client), simpler to implement in Next.js App Router using `ReadableStream`, requires no extra library, and is sufficient for log tailing and metrics. WebSocket would be needed only if the client needed to send data back (not the case here).

### Why SQLite over PostgreSQL?
Zero-config, single file, works anywhere Docker can run. Perfect for a demo. Prisma makes it easy to switch to Postgres later by changing one line in `schema.prisma`.

### Why dockerode over Docker CLI (`exec`)?
`dockerode` speaks to the Docker Engine REST API directly over the Unix socket. No shell injection risk, proper streaming support, TypeScript types, and error handling. CLI exec would require sanitizing every user input.

---

## Environment Variables

```bash
# .env.local

# Database
DATABASE_URL="file:./prisma/dev.db"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<random 32+ char string>"  # openssl rand -base64 32

# GitHub webhook verification
WEBHOOK_SECRET="<match what you set in GitHub repo settings>"

# Optional: Docker host override (default: /var/run/docker.sock)
# DOCKER_HOST="tcp://localhost:2375"
```
