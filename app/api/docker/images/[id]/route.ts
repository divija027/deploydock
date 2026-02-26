import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import docker from '@/lib/docker/client';

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
    const image = docker.getImage(id);
    await image.remove({ force: true });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.statusCode || 500 });
  }
}
