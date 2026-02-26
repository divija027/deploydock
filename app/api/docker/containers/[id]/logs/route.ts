import { auth } from '@/auth';
import docker from '@/lib/docker/client';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const { id } = await params;
  const container = docker.getContainer(id);

  try {
    await container.inspect();
  } catch {
    return new Response('Container not found', { status: 404 });
  }

  let logStream: NodeJS.ReadableStream;
  try {
    logStream = await container.logs({
      stdout: true,
      stderr: true,
      follow: true,
      timestamps: true,
      tail: 100,
    }) as unknown as NodeJS.ReadableStream;
  } catch {
    return new Response('Failed to attach to container logs', { status: 500 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Controller may be closed
        }
      };

      logStream.on('data', (chunk: Buffer) => {
        let offset = 0;
        while (offset < chunk.length) {
          if (chunk.length < offset + 8) break;
          const streamType = chunk[offset];
          const size = chunk.readUInt32BE(offset + 4);
          const payload = chunk.slice(offset + 8, offset + 8 + size).toString('utf8');
          send({ text: payload, stream: streamType === 2 ? 'stderr' : 'stdout' });
          offset += 8 + size;
        }
      });

      logStream.on('end', () => {
        send({ done: true });
        try { controller.close(); } catch {}
      });

      logStream.on('error', (err) => {
        send({ error: err.message });
        try { controller.close(); } catch {}
      });

      req.signal.addEventListener('abort', () => {
        (logStream as any).destroy?.();
        try { controller.close(); } catch {}
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
