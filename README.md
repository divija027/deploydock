# DeployDock

**A self-hosted Docker container management and deployment dashboard** — manage containers, deploy apps via Git push, monitor resources in real-time, and visualize your container network, all from a clean web UI.

---

## Table of Contents

- [The Problem](#the-problem)
- [How DeployDock Solves It](#how-deploydock-solves-it)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Step-by-Step Usage Guide](#step-by-step-usage-guide)
- [User Roles and Permissions](#user-roles-and-permissions)
- [App Templates](#app-templates)
- [GitHub Webhook Deploy Setup](#github-webhook-deploy-setup)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)

---

## The Problem

Docker is powerful, but managing containers in production or on a shared server comes with real pain points:

1. **The CLI is not beginner-friendly.** Running `docker ps`, `docker logs`, `docker stats`, and `docker network inspect` across multiple terminals is tedious and error-prone. There is no single view of what is running, what is stopped, and how containers are connected.

2. **No built-in web UI.** Docker Engine exposes a REST API and a CLI — neither gives you a visual dashboard. Tools like Portainer exist but are heavyweight and closed-source for advanced features.

3. **No built-in CI/CD.** If you want to deploy an app by pushing to GitHub, you need to set up a separate CI/CD pipeline (GitHub Actions, Jenkins, etc.) and write deployment scripts yourself.

4. **Managed PaaS is expensive.** Heroku, Railway, Render, and similar platforms charge per-app monthly fees. For students, hobbyists, and small teams running a few services on a VPS, this adds up fast.

5. **No multi-user access control.** Raw Docker gives full access to anyone who can reach the socket. There is no concept of "this user can view logs but not delete containers."

6. **No easy way to deploy common services.** Want to run Ghost, Gitea, Nextcloud, or Redis? You have to find the right image, figure out the ports, set environment variables, and write a `docker run` command from scratch every time.

---

## How DeployDock Solves It

| Problem | DeployDock Solution |
|---------|-------------------|
| CLI complexity | Web-based dashboard — see all containers, images, and networks at a glance |
| No web UI | Clean, responsive interface with dark mode, built on Next.js and Shadcn/ui |
| No CI/CD | GitHub webhook receiver — push to your repo, DeployDock builds and deploys automatically |
| Expensive PaaS | Self-hosted on your own server — free forever, you own your infrastructure |
| No access control | Three roles (admin, developer, viewer) with JWT-based authentication |
| Manual service setup | 8 one-click app templates with pre-configured ports and environment variables |

---

## Features

### Container Lifecycle Management
List all containers with their status (running, stopped, paused). Start, stop, restart, pause, unpause, or delete any container with a single click. View detailed container info including ports, networks, and configuration.

### Real-Time Logs and Metrics
Stream container logs in real-time with a terminal-like viewer. Monitor CPU usage, memory consumption, and network I/O with live-updating charts. All streaming is powered by Server-Sent Events (SSE).

### Live Docker Events
The UI automatically refreshes when Docker state changes. Start a container from the CLI, and the dashboard updates within seconds — no manual refresh needed.

### Network Topology Visualization
An interactive force-directed graph (D3.js) shows how containers connect to networks. Containers are colored by state (green = running, red = stopped, yellow = paused). Networks appear as diamond shapes. Drag nodes to rearrange, zoom and pan to explore, hover for details.

### Git Auto-Deploy (CI/CD)
Set up a GitHub webhook, and DeployDock will automatically build and deploy your app on every push. The pipeline: clone repo, detect language (Node.js, Python, PHP, or static HTML), auto-generate a Dockerfile if missing, build the image, replace the running container, and stream build logs to the dashboard.

### One-Click App Templates
Deploy popular self-hosted services in seconds: Ghost CMS, Gitea, Nextcloud, Uptime Kuma, Vaultwarden, n8n, Redis, and PostgreSQL. Each template comes with pre-configured ports and environment variables.

### Per-App Environment Variables
Edit environment variables for any app through a key-value editor. Save and restart the container with the new configuration — no SSH or CLI needed.

### Authentication and Role-Based Access Control
Three roles control what each user can do:
- **Viewer** — read-only access (list containers, view logs and metrics)
- **Developer** — can deploy, pull images, run/start/stop containers, edit app config
- **Admin** — all developer permissions plus delete containers and images

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 15 (App Router), React 19, TypeScript | UI framework and client logic |
| Styling | Tailwind CSS, Shadcn/ui, Radix UI | Responsive UI with dark mode |
| Charts | Recharts | Real-time CPU/memory/network graphs |
| Network Graph | D3.js v7 | Interactive container topology visualization |
| Backend | Next.js API Routes | Server-side handlers for Docker and database operations |
| Docker SDK | dockerode | Node.js client for Docker Engine API |
| Database | SQLite via Prisma ORM | Users, deployments, app configuration |
| Authentication | NextAuth.js v5, bcryptjs | Credential-based login with JWT sessions |
| Real-Time | Server-Sent Events (SSE) | Log streaming, metrics, Docker events |
| Git | simple-git | Clone and pull repositories during deploy |
| Icons | Lucide React | UI iconography |
| Forms | React Hook Form, Zod | Form handling and validation |

---

## Prerequisites

Before you begin, make sure you have:

- **Docker** installed and running on your machine (DeployDock communicates with Docker via `/var/run/docker.sock`)
- **Node.js 22+** (only needed for local development, not for Docker Compose setup)
- **pnpm** package manager (only needed for local development)
- Your user must be in the `docker` group (or run with appropriate permissions) so the app can access the Docker socket

---

## Getting Started

### Option A: Docker Compose (Recommended)

This is the fastest way to get DeployDock running. One command handles everything — building the app, running database migrations, and seeding the default admin user.

**Step 1.** Clone the repository:
```bash
git clone https://github.com/your-username/deploydock.git
cd deploydock
```

**Step 2.** (Optional) Edit `docker-compose.yml` to set your own secrets:
```yaml
environment:
  NEXTAUTH_SECRET: "your-strong-random-secret-at-least-32-chars"
  WEBHOOK_SECRET: "your-webhook-secret"
```

**Step 3.** Build and start:
```bash
docker compose up --build
```

**Step 4.** Open your browser and go to `http://localhost:3000`.

**Step 5.** Log in with the default admin credentials:
```
Email:    admin@droplets.local
Password: admin123
```

That's it — you now have a fully functional Docker management dashboard.

---

### Option B: Local Development Setup

Use this if you want to modify the code or contribute to the project.

**Step 1.** Clone the repository:
```bash
git clone https://github.com/your-username/deploydock.git
cd deploydock
```

**Step 2.** Install dependencies:
```bash
pnpm install
```

**Step 3.** Create your environment file:
```bash
cp .env .env.local
```

Edit `.env.local` and fill in the values (see [Environment Variables](#environment-variables) below).

**Step 4.** Generate the Prisma client:
```bash
pnpm prisma generate
```

**Step 5.** Run database migrations to create the SQLite database:
```bash
pnpm prisma migrate dev
```

**Step 6.** Seed the database with the default admin user:
```bash
pnpm prisma db seed
```

**Step 7.** Start the development server:
```bash
pnpm dev
```

**Step 8.** Open `http://localhost:3000` in your browser and log in:
```
Email:    admin@droplets.local
Password: admin123
```

### Other Commands

```bash
pnpm build     # Build for production
pnpm start     # Start the production server
pnpm lint      # Run ESLint
pnpm test      # Run tests (Vitest)
```

---

## Environment Variables

Create a `.env.local` file in the project root with the following variables:

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | Yes | SQLite database file path | `file:./prisma/dev.db` |
| `NEXTAUTH_URL` | Yes | The public URL of your DeployDock instance | `http://localhost:3000` |
| `NEXTAUTH_SECRET` | Yes | A random string (32+ characters) used to sign JWT tokens. Generate with: `openssl rand -base64 32` | `k8J2m...` |
| `WEBHOOK_SECRET` | Yes | Shared secret for verifying GitHub webhook signatures. Must match the secret you set in your GitHub repo's webhook settings | `my-webhook-secret` |

Example `.env.local`:
```bash
DATABASE_URL="file:./prisma/dev.db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-random-secret-at-least-32-characters-long"
WEBHOOK_SECRET="your-github-webhook-secret"
```

---

## Step-by-Step Usage Guide

### 1. Logging In

1. Open `http://localhost:3000` in your browser.
2. You will see the landing page. Click **"Get Started"** or navigate to `/login`.
3. Enter the default credentials:
   - Email: `admin@droplets.local`
   - Password: `admin123`
4. You will be redirected to the dashboard.

### 2. Dashboard Overview

The main dashboard (`/dashboard`) shows:
- **Stat cards** at the top: total containers, running containers, stopped containers, and total images.
- **Quick Start Card** — a getting-started guide.
- **Pull Image Card** — pull Docker images from Docker Hub.
- **Run Container Card** — create and start a new container.
- **Container Status Card** — a live list of all containers with action buttons.

### 3. Pulling a Docker Image

1. On the dashboard, find the **"Pull Image"** card.
2. Enter an image name (e.g., `nginx`, `redis:7-alpine`, `ghost:5-alpine`).
3. Click **"Pull"**.
4. A live progress stream will show the download progress layer by layer.
5. Once complete, the image appears in your images list.

### 4. Running a Container

**From a custom image:**
1. On the dashboard, find the **"Run Container"** card.
2. Enter a container name (e.g., `my-nginx`).
3. Enter the image name (e.g., `nginx:latest`).
4. (Optional) Configure port mappings (e.g., host port `8080` to container port `80`).
5. (Optional) Add environment variables.
6. Click **"Run"** — the container starts immediately.

**From a template:**
1. Navigate to **Templates** (`/templates`) from the top navigation.
2. Browse the template gallery or filter by category (CMS, Dev, Productivity, Database).
3. Click on a template card to see its details (image, ports, environment variables).
4. Click **"Deploy"** — the container is created with all settings pre-configured.

### 5. Managing Containers

The **Container Status Card** on the dashboard (and the container list) shows every container with its current state.

For each container, you can:
- **Start** — start a stopped container
- **Stop** — gracefully stop a running container
- **Restart** — stop and start a container
- **Delete** — remove a container (admin only, force removes)

Click on a container name to open its **details modal**, which shows:
- Container ID, image, status, created time
- Port mappings
- Network connections
- Tabs for **Logs**, **Metrics**, and **Environment Variables**

### 6. Viewing Logs

1. Click on a container to open its details.
2. Switch to the **Logs** tab.
3. Logs stream in real-time — new output appears as it happens.
4. Stdout and stderr are displayed with different styling.
5. Use the **Clear** button to reset the log view, or **Scroll to Bottom** to follow new output.

### 7. Viewing Metrics

1. Click on a container to open its details.
2. Switch to the **Metrics** tab.
3. Live charts display:
   - **CPU usage** (percentage over time)
   - **Memory usage** (MB used vs. limit)
   - **Network I/O** (bytes received and transmitted)
4. Charts update in real-time as new data arrives.

### 8. Network Topology Graph

1. Navigate to **Network** (`/network`) from the top navigation.
2. The interactive graph shows:
   - **Circles** = containers (green = running, red = stopped, yellow = paused)
   - **Diamonds** = Docker networks (purple)
   - **Lines** = connections between containers and networks, labeled with IP addresses
3. **Drag** any node to rearrange the layout.
4. **Scroll** to zoom in/out.
5. **Hover** over a node to see details (container state, image, ports, or network driver).
6. The graph updates live when containers start, stop, or change networks.

### 9. Managing Images

1. Navigate to **Images** (`/images`) from the top navigation.
2. View all Docker images on the host with their repository tags, size, and creation date.
3. Use the search box to filter images by name.
4. Click the **delete** button on any image to remove it and free up disk space.

### 10. Deploying via GitHub Webhook

1. Navigate to **Deployments** (`/deployments`) from the top navigation.
2. This page shows the history of all deployments with their status (building, success, failed).
3. To set up auto-deploy from GitHub, see the [GitHub Webhook Deploy Setup](#github-webhook-deploy-setup) section below.
4. To manually re-deploy a previous deployment, click the **"Deploy again"** button on any history entry.
5. While a build is in progress, logs stream live in the deployment entry.

### 11. Managing Environment Variables

1. Click on a container to open its details modal.
2. Switch to the **Environment Variables** tab.
3. Add, edit, or remove key-value pairs.
4. Password-type values are masked by default — click to reveal.
5. Click **"Save & Restart"** to apply the changes. The container will restart with the new environment.

### 12. Using App Templates

1. Navigate to **Templates** (`/templates`).
2. Filter templates by category using the category tabs: All, CMS, Dev, Productivity, Database.
3. Each template card shows the service name, description, and icon.
4. Click a template to see full details: Docker image, port mappings, and required environment variables.
5. Click **"Deploy"** to instantly create and start a container with the template's configuration.
6. The deployed container appears in your container list on the dashboard.

---

## User Roles and Permissions

DeployDock uses role-based access control (RBAC) with three roles:

| Permission | Viewer | Developer | Admin |
|------------|--------|-----------|-------|
| View containers, images, networks | Yes | Yes | Yes |
| View container logs | Yes | Yes | Yes |
| View container metrics | Yes | Yes | Yes |
| View deployment history | Yes | Yes | Yes |
| Pull Docker images | No | Yes | Yes |
| Create and run containers | No | Yes | Yes |
| Start / stop / restart containers | No | Yes | Yes |
| Deploy apps (manual or webhook) | No | Yes | Yes |
| Edit environment variables | No | Yes | Yes |
| Edit app configuration | No | Yes | Yes |
| Delete containers | No | No | Yes |
| Delete images | No | No | Yes |

The default seeded user (`admin@droplets.local`) has the **admin** role.

---

## App Templates

DeployDock ships with 8 pre-configured templates for popular self-hosted services:

| Template | Category | Docker Image | Ports | Description |
|----------|----------|-------------|-------|-------------|
| Ghost CMS | CMS | `ghost:5-alpine` | 2368 | Modern publishing platform for blogs and newsletters |
| Gitea | Dev | `gitea/gitea:latest` | 3000, 222 (SSH) | Lightweight self-hosted Git service |
| Nextcloud | Productivity | `nextcloud:stable-apache` | 8080 | Self-hosted file sync, calendar, and collaboration |
| Uptime Kuma | Dev | `louislam/uptime-kuma:1` | 3001 | Self-hosted monitoring tool for your services |
| Vaultwarden | Productivity | `vaultwarden/server:latest` | 8081 | Lightweight Bitwarden-compatible password manager |
| n8n | Productivity | `n8nio/n8n:latest` | 5678 | Workflow automation — connects 400+ services |
| Redis | Database | `redis:7-alpine` | 6379 | In-memory data structure store, cache, and message broker |
| PostgreSQL | Database | `postgres:16-alpine` | 5432 | Advanced open-source relational database |

---

## GitHub Webhook Deploy Setup

DeployDock can automatically build and deploy your app every time you push to GitHub. Here's how to set it up:

**Step 1.** Make sure your DeployDock instance is accessible from the internet (or use a tunnel like ngrok/Cloudflare Tunnel for local development).

**Step 2.** In your GitHub repository, go to **Settings > Webhooks > Add webhook**.

**Step 3.** Configure the webhook:
- **Payload URL:** `https://<your-deploydock-host>/api/webhooks/deploy`
- **Content type:** `application/json`
- **Secret:** the same value as your `WEBHOOK_SECRET` environment variable
- **Events:** select **"Just the push event"**

**Step 4.** Click **"Add webhook"**.

**What happens on push:**

1. GitHub sends a POST request to your DeployDock webhook endpoint.
2. DeployDock verifies the HMAC-SHA256 signature using your `WEBHOOK_SECRET`.
3. The repository is cloned (or pulled if it already exists) to a temporary directory.
4. DeployDock detects the language:
   - `package.json` found → Node.js (uses Node 20 Alpine)
   - `requirements.txt` / `Pipfile` / `pyproject.toml` found → Python (uses Python 3.12)
   - `composer.json` / `index.php` found → PHP (uses PHP 8.3 Apache)
   - `index.html` found → Static site (uses nginx)
5. If no Dockerfile exists, one is auto-generated based on the detected language.
6. A Docker image is built from the repository.
7. The old container (if any) is stopped and removed.
8. A new container is started with the built image.
9. Build and deploy logs are saved and can be viewed in the Deployments page.

**Note:** This setup assumes public HTTPS Git clones. For private repositories, you'll need to use a deploy token or credentialed URL.

---

## API Reference

All API routes are under `/api/`. Routes marked with auth require a valid session.

### Docker Containers

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/docker/containers` | Required | List all containers |
| POST | `/api/docker/containers` | Developer+ | Create and start a container |
| GET | `/api/docker/containers/[id]` | Required | Inspect a container |
| PATCH | `/api/docker/containers/[id]` | Developer+ | Action: start, stop, restart, pause, unpause, kill |
| DELETE | `/api/docker/containers/[id]` | Admin | Force remove a container |
| GET | `/api/docker/containers/[id]/logs` | Required | SSE stream of container logs |
| GET | `/api/docker/containers/[id]/stats` | Required | SSE stream of container metrics |

### Docker Images

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/docker/images` | Required | List all images |
| POST | `/api/docker/images` | Required | Pull an image (returns SSE progress) |
| DELETE | `/api/docker/images/[id]` | Developer+ | Remove an image |

### Networks and Events

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/docker/networks` | Required | Get network topology data for D3 graph |
| GET | `/api/docker/events` | Required | SSE stream of all Docker events |

### App Configuration

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/docker/apps/[name]/env` | Required | Get environment variables for an app |
| PATCH | `/api/docker/apps/[name]/env` | Developer+ | Update env vars and restart container |
| GET | `/api/docker/apps/[name]/config` | Required | Get app config (port, domain, repo) |
| PATCH | `/api/docker/apps/[name]/config` | Developer+ | Update app config |

### Deployments

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/deployments` | Required | List last 50 deployments |
| POST | `/api/deployments` | Developer+ | Manually trigger a deploy |
| GET | `/api/deployments/[id]/stream` | Required | SSE stream of build/deploy logs |

### Webhooks

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/webhooks/deploy` | HMAC signature | GitHub push webhook receiver |

---

## Project Structure

```
app/
├── (landing)/                    # Public landing page (no auth required)
│   ├── layout.tsx
│   └── page.tsx
├── (dashboard)/                  # Authenticated dashboard pages
│   ├── layout.tsx                # SessionProvider + ThemeProvider wrapper
│   ├── dashboard/page.tsx        # Main dashboard with stats and cards
│   ├── images/page.tsx           # Image list and management
│   ├── network/page.tsx          # Network topology graph
│   ├── deployments/page.tsx      # Deployment history with live logs
│   ├── templates/page.tsx        # Template gallery
│   └── login/page.tsx            # Login form
├── api/
│   ├── auth/[...nextauth]/       # NextAuth route handlers
│   ├── docker/                   # Docker container, image, network, event APIs
│   ├── deployments/              # Deployment CRUD and log streaming
│   └── webhooks/deploy/          # GitHub webhook receiver
├── layout.tsx                    # Root layout
└── globals.css                   # Tailwind CSS + theme variables

components/
├── ui/                           # Shadcn/ui primitives (do not edit manually)
├── landing/                      # Landing page components
├── dashboard-header.tsx          # Navigation bar
├── container-status-card.tsx     # Container list with actions
├── container-logs.tsx            # Real-time log viewer
├── metrics-chart.tsx             # CPU/memory/network charts
├── network-graph.tsx             # D3.js topology graph
├── run-container-card.tsx        # Create container form
├── build-image-card.tsx          # Pull image with progress
├── template-gallery.tsx          # Template browser
├── env-vars-editor.tsx           # Key-value environment editor
└── quick-start-card.tsx          # Getting started guide

lib/
├── docker/
│   ├── client.ts                 # dockerode client (connects via /var/run/docker.sock)
│   ├── deploy.ts                 # buildAndDeploy() pipeline
│   └── buildpack.ts              # Language detection + Dockerfile generation
├── prisma.ts                     # Prisma client singleton
├── templates.ts                  # 8 app template definitions
├── auth-utils.ts                 # hasRole(), verifyGitHubSignature()
└── utils.ts                      # cn() Tailwind class merge

prisma/
├── schema.prisma                 # Data model (User, Deployment, AppConfig)
├── seed.ts                       # Seeds default admin user
└── migrations/                   # SQLite migrations

auth.ts                           # NextAuth main configuration
auth.config.ts                    # NextAuth callbacks (shared with middleware)
middleware.ts                     # Route protection (redirects to /login if not authenticated)
docker-compose.yml                # Docker Compose for running DeployDock itself
Dockerfile                        # Multi-stage production build
```

---

## Troubleshooting

### `next build` fails trying to delete `.next/`

A previous run may have created root-owned files inside `.next/`. This project uses `distDir: '.next-build'` in `next.config.mjs` to avoid this. If you still hit the issue, remove the directory with `sudo rm -rf .next/`.

### Prisma client missing (`Cannot find module '.prisma/client/default'`)

Run `pnpm prisma generate`. This can happen because pnpm may skip some postinstall scripts by default.

### Cannot connect to Docker

Make sure Docker is running and the current user has permission to access `/var/run/docker.sock`. On Linux, add your user to the `docker` group:
```bash
sudo usermod -aG docker $USER
```
Then log out and log back in for the change to take effect.

### Container actions fail with "permission denied"

If running via Docker Compose, the container runs as `root` (`user: "0:0"` in `docker-compose.yml`) to access the Docker socket. If running locally, ensure your user is in the `docker` group.

### Database is empty after starting

Run the seed command to create the default admin user:
```bash
pnpm prisma db seed
```

### Webhook deployments are not triggering

1. Verify your `WEBHOOK_SECRET` matches the secret configured in GitHub.
2. Ensure your DeployDock instance is reachable from the internet (or use a tunnel).
3. Check the GitHub webhook delivery log (Settings > Webhooks > Recent Deliveries) to see if GitHub is getting a response.
4. Check the DeployDock server logs for HMAC verification errors.

---

## License

This project is private and not licensed for redistribution.
