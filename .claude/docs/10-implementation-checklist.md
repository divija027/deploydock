# Implementation Checklist & Roadmap

Use this as your day-by-day build guide. Each phase produces something runnable and demonstrable.

---

## Phase 0 — Setup (Day 1)

### Packages
```bash
pnpm add dockerode @types/dockerode
pnpm add prisma @prisma/client
pnpm add next-auth @auth/prisma-adapter
pnpm add bcryptjs @types/bcryptjs
pnpm add d3 @types/d3
pnpm add simple-git
pnpm add qrcode @types/qrcode
pnpm add date-fns   # already in package.json — verify
```

### Environment
```bash
cp .env.example .env.local
# Fill in: DATABASE_URL, NEXTAUTH_SECRET, WEBHOOK_SECRET
```

### Database
```bash
# Create prisma/schema.prisma (see 07-database-schema.md)
pnpm prisma init --datasource-provider sqlite
# Paste full schema, then:
pnpm prisma migrate dev --name init
pnpm prisma db seed   # creates admin@droplets.local / admin123
```

### Verify
- [ ] `pnpm dev` starts without errors
- [ ] `pnpm prisma studio` opens and shows empty tables

---

## Phase 1 — Docker API (Days 1-2)

### Files to create
```
lib/docker/client.ts           (singleton)
lib/prisma.ts                  (singleton)
types/docker.ts                (interfaces)
app/api/docker/containers/route.ts
app/api/docker/containers/[id]/route.ts
app/api/docker/images/route.ts
app/api/docker/networks/route.ts
```

### Test each route with curl
```bash
# List containers
curl http://localhost:3000/api/docker/containers

# Stop a container
curl -X PATCH http://localhost:3000/api/docker/containers/<id> \
  -H "Content-Type: application/json" \
  -d '{"action":"stop"}'

# List images
curl http://localhost:3000/api/docker/images

# Network topology
curl http://localhost:3000/api/docker/networks
```

### Wire up existing UI components
- `container-status-card.tsx` — call `GET /api/docker/containers`, render real data
- `build-image-card.tsx` — call `POST /api/docker/images` to pull, `POST /api/docker/containers` to create
- `run-container-card.tsx` — call `POST /api/docker/containers`
- `quick-start-card.tsx` — add onClick handlers for each button

### Verify
- [ ] Dashboard shows real containers from `docker ps -a`
- [ ] Start/Stop/Restart buttons work and update container state
- [ ] Pull image button works and shows the new image

---

## Phase 2 — Real-Time Streams (Day 2-3)

### Files to create
```
app/api/docker/containers/[id]/logs/route.ts   (SSE)
app/api/docker/containers/[id]/stats/route.ts  (SSE)
hooks/use-sse.ts
components/container-logs.tsx
components/metrics-chart.tsx
```

### Test SSE routes
```bash
# Open in browser (or curl -N for streaming)
curl -N "http://localhost:3000/api/docker/containers/<id>/logs"
curl -N "http://localhost:3000/api/docker/containers/<id>/stats"
```

### Integrate into dashboard
- Add "Logs" and "Metrics" sections/tabs to the dashboard page
- Each container card should have a "View Logs" and "View Stats" button

### Verify
- [ ] Open log viewer for a running container — see live log lines
- [ ] Open metrics view — see CPU/memory charts updating every second
- [ ] Close the tab — server-side streams are cleaned up (check for no zombie SSE connections)

---

## Phase 3 — Authentication (Day 3)

### Files to create
```
auth.ts                              (NextAuth config)
middleware.ts                        (route protection)
types/next-auth.d.ts                 (role augmentation)
lib/auth-utils.ts                    (hasRole helper, verifyGitHubSignature)
app/api/auth/[...nextauth]/route.ts
app/login/page.tsx
prisma/seed.ts                       (admin user)
```

### Apply auth guards
Add `const session = await auth()` + role checks to every API route created so far.

### Verify
- [ ] Visiting `http://localhost:3000` redirects to `/login` when not logged in
- [ ] Login with `admin@droplets.local` / `admin123` → redirected to dashboard
- [ ] Viewer-role user cannot call DELETE/PATCH endpoints (403 response)
- [ ] Header shows logged-in user name + sign out button

---

## Phase 4 — Network Graph (Day 4)

### Files to create
```
components/network-graph.tsx         (D3.js force graph)
app/network/page.tsx                 (page wrapper)
```

### Add to navigation
Add "Network" link in `DashboardHeader`.

### Verify
- [ ] `/network` page renders a graph
- [ ] Containers and networks appear as distinct node shapes
- [ ] Running containers are green, stopped are red
- [ ] Nodes can be dragged and re-positioned
- [ ] Hover tooltip shows container name, state, ports
- [ ] Refresh button reloads data without page reload

---

## Phase 5 — Git Auto-Deploy (Day 4-5)

### Files to create
```
lib/docker/buildpack.ts              (language detection + Dockerfile gen)
lib/docker/deploy.ts                 (clone → build → run pipeline)
app/api/webhooks/deploy/route.ts     (GitHub webhook receiver)
app/api/deployments/route.ts         (GET deployment history)
app/deployments/page.tsx             (deployment history UI)
```

### Set up webhook (for testing)
```bash
# Install ngrok
ngrok http 3000
# Copy the https URL → set as GitHub webhook payload URL
# Set WEBHOOK_SECRET to match what you configure in GitHub repo settings
```

### Verify
- [ ] `POST /api/webhooks/deploy` with invalid signature returns 401
- [ ] Push to GitHub repo → deployment record appears with status "building"
- [ ] Build logs stream into `Deployment.logs` field
- [ ] Status updates to "success" or "failed"
- [ ] `/deployments` page shows history with expandable build logs
- [ ] Language detection correctly identifies Node/Python/PHP repos

---

## Phase 6 — Environment Variables & Templates (Day 5)

### Files to create
```
app/api/docker/apps/[name]/env/route.ts
components/env-vars-editor.tsx
lib/templates.ts
components/template-gallery.tsx
```

### Integrate
- Add env vars editor tab to container detail view
- Add "Templates" tab to `RunContainerCard` (next to "Custom")

### Verify
- [ ] Add env vars for a container, click "Save & Restart" → container restarts
- [ ] `docker inspect <container>` shows the new env vars
- [ ] Template gallery shows 8+ templates with categories
- [ ] Click "Deploy Ghost CMS" → form fills with ghost:5-alpine and port 2368
- [ ] Deploy the template → container starts and is accessible at localhost:2368

---

## Phase 7 — Polish & Demo Prep (Day 6)

### Navigation
Add a proper sidebar or top nav with links to:
- Dashboard (container list)
- Network (topology graph)
- Deployments (history)
- Images
- Templates

### Dark mode
- Verify the theme toggle in `DashboardHeader` works
- Check D3 graph looks good in dark mode (node/link colors)

### Error handling
- Add error boundaries to prevent white screen on crash
- Toast notifications for: container started/stopped, deploy triggered, save succeeded

### Loading states
- Skeleton loaders while container list is fetching
- Spinner on all buttons while actions are in progress

### Mobile responsiveness
- The existing Tailwind grid is already responsive — verify on mobile viewport

---

## Presentation Demo Script

```
Total demo time: ~5 minutes

1. [30s] Show login page → log in
2. [30s] Show dashboard with real containers — explain it reads from /var/run/docker.sock
3. [30s] Stop a container from dashboard → show it turn red → restart it
4. [45s] Open log viewer for nginx — scroll logs live, explain SSE
5. [45s] Open metrics view — point out CPU/memory lines on the chart
6. [45s] Open network graph — drag nodes, explain force simulation
7. [60s] LIVE DEPLOY:
   - "I'll push a small change to a demo repo"
   - git push origin main
   - Switch to /deployments tab — "building" status appears
   - Watch logs fill in: clone → build → deploy
   - Status → "success"
   - Open the app at its URL to show the change is live
8. [30s] Show env vars editor — explain secrets masking
9. [30s] Show template gallery — "one-click deploy for 8+ services"
```

---

## Marks-Worthy Extra Points

If you have extra time, these additions significantly boost impressiveness:

### Multi-user management page (`app/admin/users/page.tsx`)
- List all users with role badges
- Change role via dropdown
- Invite new user (create account)
- Requires `role === 'admin'` guard

### Container resource limits in `RunContainerCard`
```typescript
// In createContainer HostConfig:
NanoCpus: cpuLimit * 1e9,        // 0.5 CPU = 500000000 NanoCpus
Memory: memLimitMB * 1024 * 1024  // 512 MB
```

### Audit log table in DB
```prisma
model AuditLog {
  id        String   @id @default(cuid())
  userId    String
  action    String   // "container.stop", "deploy.trigger", "user.create"
  target    String   // container ID, app name, user email
  createdAt DateTime @default(now())
}
```

### Tor + QR code (from original Droplets project)
```typescript
// Pull Tor container alongside a web container
// Read the generated .onion hostname
// Generate QR code with qrcode package
import QRCode from 'qrcode';
const qrDataUrl = await QRCode.toDataURL(`http://<onion>.onion`);
```

### Image pull progress bar
- Use the SSE pull stream (already shown in `02-docker-integration.md`)
- Show a real progress bar (download layers) in the UI during `docker pull`
