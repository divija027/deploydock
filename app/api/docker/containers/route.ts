import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import docker from '@/lib/docker/client';

export async function GET() {
  const session = await auth();
  if (!session) return new Response('Unauthorized', { status: 401 });

  try {
    const containers = await docker.listContainers({ all: true });
    return NextResponse.json(containers);
  } catch {
    return NextResponse.json({ error: 'Docker unavailable' }, { status: 503 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || (session.user as any).role === 'viewer') {
    return new Response('Forbidden', { status: 403 });
  }

  try {
    const { image, name, env = [], portBindings = {}, cmd } = await req.json();

    const container = await docker.createContainer({
      Image: image,
      name,
      Env: env,
      Cmd: cmd,
      HostConfig: {
        PortBindings: portBindings,
        RestartPolicy: { Name: 'unless-stopped' },
      },
    });

    await container.start();
    const info = await container.inspect();
    return NextResponse.json({ id: container.id, name: info.Name, status: info.State.Status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
