# Git Push Auto-Deploy

## Overview

When a developer pushes to a GitHub repository, GitHub calls your webhook URL. The dashboard then:
1. Verifies the request signature (HMAC-SHA256)
2. Clones/pulls the repository
3. Auto-detects the language and generates a Dockerfile if missing
4. Builds a Docker image
5. Stops the old container, starts a new one
6. Records the deployment result in the database

This replicates the core feature of Dokku/Heroku: `git push` → live update.

---

## Install

```bash
pnpm add simple-git @types/node  # node crypto is built-in
```

---

## 1. HMAC Signature Verification

GitHub signs every webhook payload with your secret using HMAC-SHA256.

**`lib/auth-utils.ts`** (add this function)
```typescript
import crypto from 'crypto';

export function verifyGitHubSignature(
  signature: string | null,
  body: string,
  secret: string
): boolean {
  if (!signature) return false;
  const expected = `sha256=${crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex')}`;
  // Use timingSafeEqual to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```

---

## 2. Webhook Route

**`app/api/webhooks/deploy/route.ts`**

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyGitHubSignature } from '@/lib/auth-utils';
import { buildAndDeploy } from '@/lib/docker/deploy';

export async function POST(req: Request) {
  // 1. Read raw body (must be done before parsing)
  const body = await req.text();
  const signature = req.headers.get('x-hub-signature-256');

  // 2. Verify GitHub webhook secret
  if (!verifyGitHubSignature(signature, body, process.env.WEBHOOK_SECRET!)) {
    return new Response('Invalid signature', { status: 401 });
  }

  // 3. Parse payload
  const payload = JSON.parse(body);

  // Only respond to push events on the default branch
  const event = req.headers.get('x-github-event');
  if (event !== 'push') {
    return NextResponse.json({ skipped: true, reason: 'Not a push event' });
  }

  const defaultBranch = payload.repository.default_branch;
  const pushedBranch = payload.ref?.replace('refs/heads/', '');
  if (pushedBranch !== defaultBranch) {
    return NextResponse.json({ skipped: true, reason: 'Not the default branch' });
  }

  const repoUrl = payload.repository.clone_url;   // https://github.com/owner/repo.git
  const appName = payload.repository.name;         // repo name becomes the container name
  const commitSha = payload.after;                 // latest commit hash
  const pusher = payload.pusher?.name ?? 'unknown';

  // 4. Create a "building" deployment record
  const deployment = await prisma.deployment.create({
    data: {
      appName,
      imageTag: `${appName}:${commitSha.slice(0, 8)}`,
      status: 'building',
      triggeredBy: 'webhook',
      logs: `Deploy triggered by ${pusher} at ${new Date().toISOString()}\nCommit: ${commitSha}\n`,
    }
  });

  // 5. Kick off build pipeline asynchronously (respond to GitHub immediately)
  buildAndDeploy({
    appName,
    repoUrl,
    imageTag: `${appName}:${commitSha.slice(0, 8)}`,
    deploymentId: deployment.id,
  }).catch(console.error);

  return NextResponse.json({ deploymentId: deployment.id, status: 'building' });
}
```

---

## 3. Build & Deploy Pipeline

**`lib/docker/deploy.ts`**

```typescript
import path from 'path';
import fs from 'fs';
import simpleGit from 'simple-git';
import docker from '@/lib/docker/client';
import { prisma } from '@/lib/prisma';
import { detectLanguage, generateDockerfile } from './buildpack';

interface DeployOptions {
  appName: string;
  repoUrl: string;
  imageTag: string;
  deploymentId: string;
}

const DEPLOY_BASE = '/tmp/ddd-deploys'; // base dir for repo clones

export async function buildAndDeploy(opts: DeployOptions): Promise<void> {
  const { appName, repoUrl, imageTag, deploymentId } = opts;
  const repoPath = path.join(DEPLOY_BASE, appName);
  const appendLog = async (text: string) => {
    await prisma.deployment.update({
      where: { id: deploymentId },
      data: { logs: { set: (await prisma.deployment.findUnique({ where: { id: deploymentId }, select: { logs: true } }))?.logs + text + '\n' } }
    });
  };

  try {
    // ── Step 1: Clone or pull ────────────────────────────────────
    await appendLog('[1/4] Fetching repository...');
    if (fs.existsSync(repoPath)) {
      await simpleGit(repoPath).pull();
    } else {
      fs.mkdirSync(repoPath, { recursive: true });
      await simpleGit().clone(repoUrl, repoPath);
    }
    await appendLog('Repository ready.');

    // ── Step 2: Ensure Dockerfile exists ─────────────────────────
    await appendLog('[2/4] Preparing Dockerfile...');
    const dockerfilePath = path.join(repoPath, 'Dockerfile');
    if (!fs.existsSync(dockerfilePath)) {
      const lang = detectLanguage(repoPath);
      const dockerfile = generateDockerfile(lang, repoPath);
      fs.writeFileSync(dockerfilePath, dockerfile);
      await appendLog(`Auto-generated Dockerfile for ${lang} project.`);
    } else {
      await appendLog('Using existing Dockerfile.');
    }

    // ── Step 3: Build Docker image ───────────────────────────────
    await appendLog('[3/4] Building Docker image...');
    const buildStream = await docker.buildImage(
      { context: repoPath, src: ['.'] },
      { t: imageTag }
    );

    // Collect build output
    await new Promise<void>((resolve, reject) => {
      docker.modem.followProgress(
        buildStream,
        async (err, _output) => {
          if (err) { await appendLog(`Build error: ${err.message}`); reject(err); }
          else { await appendLog('Image built successfully.'); resolve(); }
        },
        async (event) => {
          if (event.stream) await appendLog(event.stream.trim());
          if (event.error) await appendLog(`ERROR: ${event.error}`);
        }
      );
    });

    // ── Step 4: Stop old container, start new one ─────────────────
    await appendLog('[4/4] Deploying container...');
    const containerName = appName;

    // Stop and remove old container if exists
    try {
      const old = docker.getContainer(containerName);
      await old.stop({ t: 10 });
      await old.remove();
      await appendLog(`Removed old container: ${containerName}`);
    } catch {
      // Container didn't exist — that's fine for first deploy
    }

    // Read port from AppConfig if set, else default to auto-assign
    const config = await prisma.appConfig.findUnique({ where: { appName } });
    const hostPort = config?.port?.toString() ?? '';

    // Create and start new container
    const container = await docker.createContainer({
      Image: imageTag,
      name: containerName,
      Env: config?.envVars ? JSON.parse(config.envVars).map((kv: any) => `${kv.key}=${kv.value}`) : [],
      HostConfig: {
        PortBindings: hostPort ? { '3000/tcp': [{ HostPort: hostPort }] } : {},
        RestartPolicy: { Name: 'unless-stopped' },
      },
    });
    await container.start();
    await appendLog(`Container started: ${containerName}`);

    // ── Mark success ─────────────────────────────────────────────
    await prisma.deployment.update({
      where: { id: deploymentId },
      data: { status: 'success' }
    });

  } catch (err: any) {
    await prisma.deployment.update({
      where: { id: deploymentId },
      data: {
        status: 'failed',
        logs: { set: (await prisma.deployment.findUnique({ where: { id: deploymentId }, select: { logs: true } }))?.logs + `\nFATAL: ${err.message}` }
      }
    });
    throw err;
  }
}
```

---

## 4. Deployment History UI

**`app/api/deployments/route.ts`**
```typescript
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const deployments = await prisma.deployment.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { user: { select: { name: true, email: true } } }
  });

  return NextResponse.json(deployments);
}
```

**`app/deployments/page.tsx`**
```typescript
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

const statusVariant: Record<string, 'default' | 'destructive' | 'secondary'> = {
  success: 'default',
  failed: 'destructive',
  building: 'secondary',
};

export default async function DeploymentsPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const deployments = await prisma.deployment.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { user: { select: { name: true } } }
  });

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Deploy History</h1>
      <div className="space-y-2">
        {deployments.map(d => (
          <details key={d.id} className="border rounded-lg p-4">
            <summary className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-3">
                <Badge variant={statusVariant[d.status]}>{d.status}</Badge>
                <span className="font-mono text-sm">{d.appName}</span>
                <span className="text-muted-foreground text-xs">{d.imageTag}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{d.triggeredBy === 'webhook' ? '⚡ webhook' : '🖱️ manual'}</span>
                <span>{formatDistanceToNow(d.createdAt, { addSuffix: true })}</span>
                {d.user && <span>by {d.user.name}</span>}
              </div>
            </summary>
            {d.logs && (
              <pre className="mt-3 bg-black text-green-400 text-xs p-3 rounded overflow-auto max-h-48 font-mono">
                {d.logs}
              </pre>
            )}
          </details>
        ))}
      </div>
    </div>
  );
}
```

---

## 5. GitHub Setup

1. Go to **GitHub repo → Settings → Webhooks → Add webhook**
2. Payload URL: `https://your-server.com/api/webhooks/deploy`
3. Content type: `application/json`
4. Secret: match `WEBHOOK_SECRET` in `.env.local`
5. Events: Just the push event

For local dev, use [ngrok](https://ngrok.com) to expose localhost:
```bash
ngrok http 3000
# Copy the https://xxx.ngrok.io URL → use as payload URL
```

---

## Demo Flow for Presentation

```
1. Show dashboard with current containers
2. Make a small code change in a demo repo (e.g., change an HTML heading)
3. git push origin main
4. Switch to Deployments tab — show "building" status appear
5. Watch logs fill in: clone → Dockerfile → build → deploy
6. Status turns "success"
7. Open the deployed container's URL in browser — show the change is live
```

This end-to-end demo in ~30 seconds is the most impressive thing you can show evaluators.
