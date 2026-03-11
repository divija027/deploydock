import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { hasRole } from '@/lib/auth-utils';
import { buildAndDeploy } from '@/lib/docker/deploy';

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

export async function POST(req: Request) {
  const session = await auth();
  if (!hasRole(session, 'developer')) return new Response('Forbidden', { status: 403 });

  const { appName } = await req.json().catch(() => ({}));
  if (!appName || typeof appName !== 'string') {
    return NextResponse.json({ error: 'appName is required' }, { status: 400 });
  }

  const config = await prisma.appConfig.findUnique({ where: { appName } });
  if (!config?.repoUrl) {
    return NextResponse.json({ error: 'No repoUrl configured for this app' }, { status: 400 });
  }

  const tag = `${appName}:${Date.now().toString(36)}`;
  const deployment = await prisma.deployment.create({
    data: {
      appName,
      imageTag: tag,
      status: 'building',
      triggeredBy: 'manual',
      userId: (session.user as any).id,
      logs: `Manual deploy triggered at ${new Date().toISOString()}\n`,
    }
  });

  buildAndDeploy({
    appName,
    repoUrl: config.repoUrl,
    imageTag: tag,
    deploymentId: deployment.id,
  }).catch(console.error);

  return NextResponse.json({ deploymentId: deployment.id, status: 'building' });
}
