import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import docker from '@/lib/docker/client';
import { hasRole } from '@/lib/auth-utils';

interface EnvEntry { key: string; value: string }

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const session = await auth();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const { name } = await params;
  const config = await prisma.appConfig.findUnique({
    where: { appName: name }
  });

  const envVars: EnvEntry[] = config ? JSON.parse(config.envVars) : [];
  return NextResponse.json(envVars);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const session = await auth();
  if (!hasRole(session, 'developer')) {
    return new Response('Forbidden', { status: 403 });
  }

  const { name } = await params;
  const envVars: EnvEntry[] = await req.json();

  const keys = envVars.map(e => e.key.trim()).filter(Boolean);
  if (new Set(keys).size !== keys.length) {
    return NextResponse.json({ error: 'Duplicate keys' }, { status: 400 });
  }

  await prisma.appConfig.upsert({
    where: { appName: name },
    update: { envVars: JSON.stringify(envVars) },
    create: { appName: name, envVars: JSON.stringify(envVars) }
  });

  try {
    const container = docker.getContainer(name);
    const info = await container.inspect();

    await container.remove({ force: true });

    const newContainer = await docker.createContainer({
      Image: info.Config.Image,
      name: name,
      Env: envVars.map(e => `${e.key}=${e.value}`),
      HostConfig: info.HostConfig,
    });
    await newContainer.start();
  } catch (err: any) {
    if (!err.statusCode || err.statusCode !== 404) {
      // Container might not exist yet — that's fine
    }
  }

  return NextResponse.json({ ok: true });
}
