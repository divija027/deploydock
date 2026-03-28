# Dashed Droplets Dashboard — Presentation Script

> 5 minutes | Live demo included | Conversational tone

---

## Pre-Demo Checklist

- [ ] `pnpm dev` running, app loads at localhost:3000
- [ ] Docker running with 2-3 containers (mix of running/stopped)
- [ ] DB seeded (`pnpm prisma db seed`) — admin account exists
- [ ] Browser open with the app ready
- [ ] Terminal visible if needed for `docker ps`

---

## 0:00 – 0:30 | The Problem

> "So the project I've been working on is called Dashed Droplets Dashboard. The idea came from a real problem — if you're self-hosting Docker containers, your options are either Kubernetes, which is massively over-engineered for small setups, or raw CLI commands, which is tedious and error-prone. I wanted something in between — a web dashboard where you can manage everything visually. Think of it like a self-hosted Heroku."

---

## 0:30 – 1:00 | How It's Built

> "The whole thing is a single Next.js app — frontend and backend in one. The backend talks to the Docker Engine through a Unix socket using a library called dockerode — so no shell commands, which avoids injection risks. I'm using SQLite through Prisma for storing users, deployments, and app configs. And for real-time features like live logs, I'm using Server-Sent Events — which is simpler than WebSockets since I only need server-to-client streaming."

Key stack to mention: Next.js 15, React 19, TypeScript, Tailwind + Shadcn/ui, dockerode, Prisma/SQLite, NextAuth v5, D3.js, Recharts.

---

## 1:00 – 1:45 | `[DEMO]` Login & Container Management

**Do:** Open `localhost:3000` — the login page appears.

> "I've got role-based auth here — admin, developer, viewer. Passwords are hashed with bcrypt, and sessions use JWT with the role embedded in the token, so I don't need a database lookup on every request."

**Do:** Log in with admin account. Dashboard loads with real containers.

> "This is pulling real data from Docker every 5 seconds. These are actual containers running on this machine — not mock data."

**Do:** Click Stop on a container — watch it turn red/grey. Then restart it.

> "Each button calls a REST endpoint that talks directly to the Docker socket. Start, stop, restart, kill, remove — all through the API."

---

## 1:45 – 2:30 | `[DEMO]` Live Logs & Metrics

**Do:** Click on a running container to open the detail dialog. Show the **Logs** tab.

> "This is Server-Sent Events in action — a persistent HTTP connection where Docker pushes log chunks and my server forwards them as SSE frames. It's the producer-consumer pattern — Docker produces, the browser consumes, and Node.js sits in between handling the stream."

**Do:** Switch to the **Metrics** tab. Show CPU/memory charts updating live.

> "These charts update every second. The data comes from Docker's cgroup counters — that's how Linux actually tracks resource usage per container. CPU percentage, memory usage, network I/O — all real."

---

## 2:30 – 3:00 | `[DEMO]` Network Topology

**Do:** Navigate to the **Network** page. The D3 force graph renders.

> "This is a D3.js force simulation — basically a physics engine in the browser. Each node is either a container or a Docker network. Charge forces push nodes apart, link forces pull connected ones together, and the simulation runs until it finds a stable layout."

**Do:** Drag a node around. Hover over nodes to show tooltips.

> "Green means running, red means stopped. You can see which containers share a network, their IP addresses, and port bindings."

---

## 3:00 – 4:00 | `[DEMO]` Git Auto-Deploy *(the highlight)*

> "This is probably the most interesting part. It works like Heroku — you push code to GitHub, and it automatically deploys as a Docker container."

**Do:** Explain the pipeline flow (can point to slides or just describe):

> "The flow is: git push triggers a GitHub webhook. My server verifies the signature with HMAC-SHA256 — using constant-time comparison to prevent timing attacks. Then it clones the repo, auto-detects the language by checking for package.json or requirements.txt, generates a Dockerfile if there isn't one, builds the image, stops the old container, and starts the new one."

**Do:** Show the `/deployments` page with deployment history. Expand one to show build logs.

> "Every deployment is recorded in the database with full build logs. You can see the status — building, success, or failed — and drill into what happened."

---

## 4:00 – 4:30 | `[DEMO]` Templates & Env Vars

**Do:** Show the **Templates** page.

> "For common services, you don't even need a git repo. One-click deploy for Ghost CMS, Gitea, PostgreSQL, Redis, Nextcloud — eight templates out of the box. It pre-fills the image, ports, and environment variables."

**Do:** Open a container detail dialog, show the **Env Vars** tab.

> "Environment variables are stored in the database, masked in the UI for security. When you save, the container restarts with the new config — no manual restart needed."

---

## 4:30 – 5:00 | CS Concepts & Wrap-Up

> "So in terms of what this covers — operating systems with Linux namespaces and cgroups, networking with Docker bridges and port forwarding, databases with Prisma migrations, security with HMAC, bcrypt, JWT, and role-based access control, real-time systems with SSE streaming, and DevOps with the full CI/CD auto-deploy pipeline."

> "A couple of design decisions worth mentioning — I chose SQLite because it's zero-config and Prisma makes it a one-line change to switch to Postgres later. I chose SSE over WebSockets because data only flows server-to-client. And I used dockerode instead of shelling out to the CLI to avoid command injection."

> "That's the project — a self-hosted Docker PaaS. Happy to take any questions."

---

## Mentor Q&A — Likely Questions & Answers

**Q: Why not use WebSockets?**
> SSE is simpler — it's just HTTP with `Content-Type: text/event-stream`. I only need server-to-client data (logs, metrics). WebSockets add complexity for bidirectional communication I don't need. SSE also auto-reconnects natively.

**Q: How do you handle security for the Docker socket?**
> The Docker socket gives full engine access, which is a known risk. In production, you'd use TLS-authenticated Docker daemon or rootless Docker. For this project, auth + RBAC at the API layer prevents unauthorized users from reaching the socket.

**Q: What happens if a deploy fails?**
> The deployment record status is updated to "failed" with the full build logs captured. The old container stays running — we only stop it after the new one builds successfully. So a failed deploy doesn't cause downtime.

**Q: Could this scale?**
> Honestly, SQLite is the bottleneck — single-writer. For production you'd swap to PostgreSQL (one line in Prisma). Multiple Next.js instances would need a shared session store like Redis. But for a self-hosted single-server setup, which is the target use case, it works well.

**Q: How does the buildpack detection work?**
> It checks for marker files in the cloned repo — `package.json` means Node, `requirements.txt` means Python, `composer.json` means PHP. If none match, it falls back to a static file server. Then it generates an appropriate Dockerfile template.

---

## Tips for Delivery

- **Don't memorize** — know the key points per section, not exact words
- **The demo IS the presentation** — slides give context, the running app is proof
- **If something breaks**, explain why — it shows you understand the system
- **Transitions**: "So that's containers, let me show you the real-time side..." / "Now the fun part..."
- **Eye contact** between demo clicks — don't just stare at the screen
- **Pace yourself** — 5 minutes goes fast. Practice once with a timer
