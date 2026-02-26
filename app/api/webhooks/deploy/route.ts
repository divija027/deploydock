import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyGitHubSignature } from '@/lib/auth-utils';
import { buildAndDeploy } from '@/lib/docker/deploy';

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('x-hub-signature-256');

  if (!verifyGitHubSignature(signature, body, process.env.WEBHOOK_SECRET!)) {
    return new Response('Invalid signature', { status: 401 });
  }

  const payload = JSON.parse(body);

  const event = req.headers.get('x-github-event');
  if (event !== 'push') {
    return NextResponse.json({ skipped: true, reason: 'Not a push event' });
  }

  const defaultBranch = payload.repository.default_branch;
  const pushedBranch = payload.ref?.replace('refs/heads/', '');
  if (pushedBranch !== defaultBranch) {
    return NextResponse.json({ skipped: true, reason: 'Not the default branch' });
  }

  const repoUrl = payload.repository.clone_url;
  const appName = payload.repository.name;
  const commitSha = payload.after;
  const pusher = payload.pusher?.name ?? 'unknown';

  const deployment = await prisma.deployment.create({
    data: {
      appName,
      imageTag: `${appName}:${commitSha.slice(0, 8)}`,
      status: 'building',
      triggeredBy: 'webhook',
      logs: `Deploy triggered by ${pusher} at ${new Date().toISOString()}\nCommit: ${commitSha}\n`,
    }
  });

  buildAndDeploy({
    appName,
    repoUrl,
    imageTag: `${appName}:${commitSha.slice(0, 8)}`,
    deploymentId: deployment.id,
  }).catch(console.error);

  return NextResponse.json({ deploymentId: deployment.id, status: 'building' });
}
