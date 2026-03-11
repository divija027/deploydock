import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { hasRole } from '@/lib/auth-utils';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const session = await auth();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const { name } = await params;
  const config = await prisma.appConfig.findUnique({ where: { appName: name } });
  return NextResponse.json({
    appName: name,
    repoUrl: config?.repoUrl ?? null,
    domain: config?.domain ?? null,
    port: config?.port ?? null,
    updatedAt: config?.updatedAt ?? null,
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const session = await auth();
  if (!hasRole(session, 'developer')) return new Response('Forbidden', { status: 403 });

  const { name } = await params;
  const body = await req.json().catch(() => ({}));

  const repoUrl = body.repoUrl === null || body.repoUrl === undefined ? undefined : String(body.repoUrl);
  const domain = body.domain === null || body.domain === undefined ? undefined : String(body.domain);
  const port =
    body.port === null || body.port === undefined
      ? undefined
      : Number.isFinite(Number(body.port))
        ? Number(body.port)
        : NaN;

  if (port !== undefined && (!Number.isInteger(port) || port <= 0 || port > 65535)) {
    return NextResponse.json({ error: 'port must be an integer 1-65535' }, { status: 400 });
  }

  await prisma.appConfig.upsert({
    where: { appName: name },
    update: {
      ...(repoUrl !== undefined ? { repoUrl } : {}),
      ...(domain !== undefined ? { domain } : {}),
      ...(port !== undefined ? { port } : {}),
    },
    create: {
      appName: name,
      envVars: '[]',
      ...(repoUrl !== undefined ? { repoUrl } : {}),
      ...(domain !== undefined ? { domain } : {}),
      ...(port !== undefined ? { port } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}

