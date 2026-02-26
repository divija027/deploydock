import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import docker from '@/lib/docker/client';
import type { ContainerAction } from '@/types/docker';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const { id } = await params;
  try {
    const container = docker.getContainer(id);
    const info = await container.inspect();
    return NextResponse.json(info);
  } catch {
    return new Response('Container not found', { status: 404 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || (session.user as any).role === 'viewer') {
    return new Response('Forbidden', { status: 403 });
  }

  const { id } = await params;
  const { action }: { action: ContainerAction } = await req.json();
  const allowed: ContainerAction[] = ['start', 'stop', 'restart', 'pause', 'unpause', 'kill'];
  if (!allowed.includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  try {
    const container = docker.getContainer(id);
    await (container as any)[action]();
    return NextResponse.json({ ok: true, action });
  } catch (err: any) {
    if (err.statusCode === 304) return NextResponse.json({ ok: true });
    return NextResponse.json({ error: err.message }, { status: err.statusCode || 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || (session.user as any).role !== 'admin') {
    return new Response('Forbidden', { status: 403 });
  }

  const { id } = await params;
  try {
    const container = docker.getContainer(id);
    await container.remove({ force: true });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.statusCode || 500 });
  }
}
