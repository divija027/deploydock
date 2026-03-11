import { auth } from '@/auth';
import docker from '@/lib/docker/client';

function safeJsonParse(line: string): any | null {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return new Response('Unauthorized', { status: 401 });

  let dockerStream: NodeJS.ReadableStream;
  try {
    // Docker emits a JSON object per line.
    dockerStream = (await docker.getEvents({})) as unknown as NodeJS.ReadableStream;
  } catch {
    return new Response('Docker unavailable', { status: 503 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // ignore
        }
      };

      let buffer = '';

      dockerStream.on('data', (chunk: Buffer) => {
        buffer += chunk.toString('utf8');
        let idx = buffer.indexOf('\n');
        while (idx !== -1) {
          const line = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 1);
          if (line) {
            const evt = safeJsonParse(line);
            if (evt) send(evt);
          }
          idx = buffer.indexOf('\n');
        }
      });

      dockerStream.on('end', () => {
        send({ done: true });
        try { controller.close(); } catch {}
      });

      dockerStream.on('error', (err) => {
        send({ error: err?.message ?? 'events stream error' });
        try { controller.close(); } catch {}
      });

      req.signal.addEventListener('abort', () => {
        (dockerStream as any).destroy?.();
        try { controller.close(); } catch {}
      });

      // Keep-alive ping so proxies don't kill the connection.
      const ping = setInterval(() => {
        try { controller.enqueue(encoder.encode(': ping\n\n')); } catch {}
      }, 15000);

      req.signal.addEventListener('abort', () => clearInterval(ping));
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

