# Docker Integration

## Setup

Install dockerode and create the singleton client.

```bash
pnpm add dockerode @types/dockerode
```

**`lib/docker/client.ts`**
```typescript
import Docker from 'dockerode';

// Process-level singleton — reuse across all API route invocations
const globalForDocker = global as unknown as { docker: Docker };

export const docker =
  globalForDocker.docker ??
  new Docker({ socketPath: '/var/run/docker.sock' });

if (process.env.NODE_ENV !== 'production') globalForDocker.docker = docker;

export default docker;
```

> The singleton pattern mirrors what Prisma recommends for Next.js development mode (hot-reload creates multiple instances otherwise).

---

## TypeScript Types

**`types/docker.ts`**
```typescript
export interface ContainerSummary {
  Id: string;
  Names: string[];
  Image: string;
  State: 'created' | 'restarting' | 'running' | 'removing' | 'paused' | 'exited' | 'dead';
  Status: string;
  Ports: Array<{ IP?: string; PrivatePort: number; PublicPort?: number; Type: string }>;
  Created: number;
  NetworkSettings: {
    Networks: Record<string, { IPAddress: string; NetworkID: string }>;
  };
}

export interface ImageSummary {
  Id: string;
  RepoTags: string[];
  Size: number;
  Created: number;
}

export interface ContainerStats {
  cpuPercent: number;
  memUsage: number;    // bytes
  memLimit: number;    // bytes
  netRx: number;       // bytes
  netTx: number;       // bytes
}

export type ContainerAction = 'start' | 'stop' | 'restart' | 'pause' | 'unpause' | 'kill';
```

---

## API Routes

### GET /api/docker/containers — List all containers

**`app/api/docker/containers/route.ts`**
```typescript
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import docker from '@/lib/docker/client';

export async function GET() {
  const session = await auth();
  if (!session) return new Response('Unauthorized', { status: 401 });

  try {
    const containers = await docker.listContainers({ all: true });
    return NextResponse.json(containers);
  } catch (err) {
    return NextResponse.json({ error: 'Docker unavailable' }, { status: 503 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role === 'viewer') {
    return new Response('Forbidden', { status: 403 });
  }

  const { image, name, env = [], portBindings = {}, cmd } = await req.json();

  const container = await docker.createContainer({
    Image: image,
    name,
    Env: env,          // format: ["KEY=value", "KEY2=value2"]
    Cmd: cmd,
    HostConfig: {
      PortBindings: portBindings,
      // Example: { "80/tcp": [{ HostPort: "8080" }] }
      RestartPolicy: { Name: 'unless-stopped' }
    },
  });

  await container.start();
  const info = await container.inspect();
  return NextResponse.json({ id: container.id, name: info.Name, status: info.State.Status });
}
```

### PATCH /api/docker/containers/[id] — Container lifecycle actions

**`app/api/docker/containers/[id]/route.ts`**
```typescript
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import docker from '@/lib/docker/client';
import type { ContainerAction } from '@/types/docker';

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session || session.user.role === 'viewer') {
    return new Response('Forbidden', { status: 403 });
  }

  const { action }: { action: ContainerAction } = await req.json();
  const allowed: ContainerAction[] = ['start', 'stop', 'restart', 'pause', 'unpause', 'kill'];
  if (!allowed.includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const container = docker.getContainer(params.id);
  await container[action]();
  return NextResponse.json({ ok: true, action });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return new Response('Forbidden', { status: 403 });
  }

  const container = docker.getContainer(params.id);
  // Force remove (stops if running, then removes)
  await container.remove({ force: true });
  return NextResponse.json({ ok: true });
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const container = docker.getContainer(params.id);
  const info = await container.inspect();
  return NextResponse.json(info);
}
```

### GET /api/docker/images — Image management

**`app/api/docker/images/route.ts`**
```typescript
import { NextResponse } from 'next/server';
import docker from '@/lib/docker/client';

export async function GET() {
  const images = await docker.listImages({ all: false });
  // Sort by creation date descending
  const sorted = images.sort((a, b) => b.Created - a.Created);
  return NextResponse.json(sorted);
}

// Pull an image — returns SSE progress stream
export async function POST(req: Request) {
  const { name } = await req.json(); // e.g. "nginx:latest"

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      try {
        const pullStream = await docker.pull(name);
        await new Promise((resolve, reject) => {
          docker.modem.followProgress(
            pullStream,
            (err, output) => err ? reject(err) : resolve(output),
            (event) => {
              // event = { status, progressDetail, id }
              controller.enqueue(enc.encode(`data: ${JSON.stringify(event)}\n\n`));
            }
          );
        });
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
      } catch (err) {
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ error: String(err) })}\n\n`));
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store' }
  });
}
```

### GET /api/docker/networks — Network topology data

**`app/api/docker/networks/route.ts`**
```typescript
import { NextResponse } from 'next/server';
import docker from '@/lib/docker/client';

export async function GET() {
  const [containers, networks] = await Promise.all([
    docker.listContainers({ all: true }),
    docker.listNetworks()
  ]);

  // Build D3-compatible graph data
  const nodes = [
    ...containers.map(c => ({
      id: c.Id.slice(0, 12),
      label: c.Names[0]?.replace('/', '') ?? c.Id.slice(0, 8),
      type: 'container' as const,
      state: c.State,
      image: c.Image,
      ports: c.Ports,
    })),
    ...networks
      .filter(n => !['none', 'host'].includes(n.Name)) // skip virtual networks
      .map(n => ({
        id: n.Id.slice(0, 12),
        label: n.Name,
        type: 'network' as const,
        driver: n.Driver,
      }))
  ];

  const links = containers.flatMap(c => {
    const containerNode = nodes.find(n => n.id === c.Id.slice(0, 12));
    if (!containerNode) return [];

    return Object.entries(c.NetworkSettings?.Networks ?? {}).flatMap(([netName, netInfo]) => {
      const netNode = nodes.find(n => n.type === 'network' && n.label === netName);
      if (!netNode) return [];
      return [{
        source: containerNode.id,
        target: netNode.id,
        ip: netInfo.IPAddress,
      }];
    });
  });

  return NextResponse.json({ nodes, links });
}
```

---

## Buildpack — Language Auto-Detection

**`lib/docker/buildpack.ts`**
```typescript
import fs from 'fs';
import path from 'path';

export type Language = 'node' | 'python' | 'php' | 'static' | 'unknown';

export function detectLanguage(projectPath: string): Language {
  const has = (file: string) => fs.existsSync(path.join(projectPath, file));

  if (has('package.json')) return 'node';
  if (has('requirements.txt') || has('Pipfile') || has('pyproject.toml')) return 'python';
  if (has('composer.json') || has('index.php')) return 'php';
  if (has('index.html')) return 'static';
  return 'unknown';
}

export function generateDockerfile(lang: Language, projectPath: string): string {
  switch (lang) {
    case 'node':
      const pkg = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf8'));
      const startCmd = pkg.scripts?.start ?? 'node index.js';
      return `FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["sh", "-c", "${startCmd}"]`;

    case 'python':
      return `FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["python", "app.py"]`;

    case 'php':
      return `FROM php:8.3-apache
COPY . /var/www/html/
EXPOSE 80`;

    case 'static':
      return `FROM nginx:alpine
COPY . /usr/share/nginx/html
EXPOSE 80`;

    default:
      throw new Error(`Cannot auto-detect language. Please provide a Dockerfile.`);
  }
}
```

---

## Common Patterns & Gotchas

### Docker log chunk format
Docker multiplexes stdout/stderr in a single stream. Each chunk has an 8-byte header:
- Byte 0: stream type (1=stdout, 2=stderr)
- Bytes 4-7: payload length (big-endian uint32)

Strip the header: `chunk.slice(8).toString('utf8')`

Or use `container.modem.demuxStream(stream, stdoutStream, stderrStream)` to split automatically.

### Docker socket permissions
The Next.js process must have read/write access to `/var/run/docker.sock`. In development, your user account typically has this. In production (Docker-in-Docker), mount the socket: `-v /var/run/docker.sock:/var/run/docker.sock`

### Error handling
Always wrap dockerode calls in try/catch. Common errors:
- `ENOENT` on socket path → Docker is not running
- `StatusCodeError: 404` → container not found
- `StatusCodeError: 409` → container already in desired state (start when running)

```typescript
try {
  await container.start();
} catch (err: any) {
  if (err.statusCode === 304) return NextResponse.json({ ok: true }); // already started — fine
  throw err;
}
```
