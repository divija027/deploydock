import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import docker from '@/lib/docker/client';

export async function GET() {
  const session = await auth();
  if (!session) return new Response('Unauthorized', { status: 401 });

  try {
    const images = await docker.listImages({ all: false });
    const sorted = images.sort((a, b) => b.Created - a.Created);
    return NextResponse.json(sorted);
  } catch {
    return NextResponse.json({ error: 'Docker unavailable' }, { status: 503 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || (session.user as any).role === 'viewer') {
    return new Response('Forbidden', { status: 403 });
  }

  const { name } = await req.json();

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      try {
        const pullStream = await docker.pull(name);
        await new Promise<void>((resolve, reject) => {
          docker.modem.followProgress(
            pullStream,
            (err: any, _output: any) => err ? reject(err) : resolve(),
            (event: any) => {
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
