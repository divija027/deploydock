import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const { id } = await params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (data: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const close = () => {
        if (closed) return;
        closed = true;
        try { controller.close(); } catch {}
      };

      req.signal.addEventListener('abort', close);

      let lastLogsLen = 0;
      let lastStatus: string | null = null;

      // Initial snapshot
      const first = await prisma.deployment.findUnique({
        where: { id },
        select: { logs: true, status: true, createdAt: true, appName: true, imageTag: true }
      });
      if (!first) {
        send({ error: 'Not found' });
        close();
        return;
      }

      const logs = first.logs ?? '';
      lastLogsLen = logs.length;
      lastStatus = first.status;
      send({ status: first.status, logs });

      // Poll for updates (simple + works on all Next runtimes)
      const interval = setInterval(async () => {
        try {
          const d = await prisma.deployment.findUnique({
            where: { id },
            select: { logs: true, status: true }
          });
          if (!d) {
            send({ error: 'Not found' });
            clearInterval(interval);
            close();
            return;
          }

          const nextLogs = d.logs ?? '';
          const delta = nextLogs.length > lastLogsLen ? nextLogs.slice(lastLogsLen) : '';

          const statusChanged = d.status !== lastStatus;
          if (delta || statusChanged) {
            lastLogsLen = nextLogs.length;
            lastStatus = d.status;
            send({ status: d.status, delta, logs: nextLogs });
          }

          if (d.status === 'success' || d.status === 'failed') {
            send({ done: true, status: d.status });
            clearInterval(interval);
            close();
          }
        } catch (e: any) {
          send({ error: e?.message ?? 'stream error' });
          clearInterval(interval);
          close();
        }
      }, 1000);
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

