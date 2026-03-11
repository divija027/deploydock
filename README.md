## DeployDock

Lightweight **Docker container management + self-hosted deployment dashboard** built with **Next.js (App Router)**, **Prisma + SQLite**, and **Docker Engine**.

### Features

- **Container lifecycle UI**: list / inspect / start / stop / restart / remove
- **Real-time logs & metrics**: Server-Sent Events (SSE) streaming
- **Network visualization**: container-to-network graph
- **Deployments**:
  - **GitHub webhook** triggers build + deploy on push
  - **Manual deploy** from the Deploy History page
- **Auth + RBAC (JWT sessions)**:
  - `viewer`: read-only
  - `developer`: can deploy, pull images, run/start/stop containers, edit app env/config
  - `admin`: all developer permissions + delete containers/images

### Local setup

```bash
pnpm install
pnpm prisma generate
pnpm prisma migrate dev
pnpm prisma db seed
pnpm dev
```

Default login: `admin@droplets.local` / `admin123`

### Environment variables

Create `.env.local`:

- **DATABASE_URL**: `file:./dev.db`
- **NEXTAUTH_URL**: `http://localhost:3000`
- **NEXTAUTH_SECRET**: any 32+ char secret
- **WEBHOOK_SECRET**: shared secret for GitHub webhook signature validation

### Docker requirements

This app talks to Docker via the Unix socket at `/var/run/docker.sock` (see `lib/docker/client.ts`).

- Run on a host with Docker installed.
- Ensure the user running the Next.js server can read/write the Docker socket (often by being in the `docker` group).

### Run with Docker Compose

`docker-compose.yml` mounts the Docker socket and runs database migrations + seeds the default admin user on startup.

```bash
docker compose up --build
```

### GitHub webhook deploy

1. Expose your DeployDock instance publicly (or via a tunnel).
2. In your GitHub repo: Settings → Webhooks
   - Payload URL: `https://<your-host>/api/webhooks/deploy`
   - Content type: `application/json`
   - Secret: same as `WEBHOOK_SECRET`
   - Events: **Just the push event**

When a push hits the repo’s default branch, DeployDock will:

- clone/pull the repository to `/tmp/ddd-deploys/<appName>`
- build a Docker image
- replace the running container named `<appName>`
- stream build/deploy logs into Deploy History

### Troubleshooting

- **`next build` fails to delete `.next/`**: a previous run may have created root-owned files. This repo uses `distDir: '.next-build'` in `next.config.mjs` to avoid requiring sudo.
- **Prisma client missing** (`Cannot find module '.prisma/client/default'`): run `pnpm prisma generate` (pnpm may skip some postinstall scripts by default).

