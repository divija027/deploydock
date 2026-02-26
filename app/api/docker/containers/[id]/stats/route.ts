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

  let statsStream: NodeJS.ReadableStream;
  try {
    statsStream = await container.stats({ stream: true }) as unknown as NodeJS.ReadableStream;
  } catch {
    return new Response('Failed to get container stats', { status: 500 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      statsStream.on('data', (data: Buffer) => {
        try {
          const s = JSON.parse(data.toString());

          const cpuDelta =
            s.cpu_stats.cpu_usage.total_usage - s.precpu_stats.cpu_usage.total_usage;
          const sysDelta =
            (s.cpu_stats.system_cpu_usage ?? 0) - (s.precpu_stats.system_cpu_usage ?? 0);
          const numCpus = s.cpu_stats.online_cpus ?? s.cpu_stats.cpu_usage.percpu_usage?.length ?? 1;
          const cpuPercent = sysDelta > 0 ? (cpuDelta / sysDelta) * numCpus * 100 : 0;

          const memUsage = s.memory_stats.usage ?? 0;
          const memLimit = s.memory_stats.limit ?? 1;
          const memCache = s.memory_stats.stats?.cache ?? 0;
          const memActual = memUsage - memCache;

          const networks = s.networks ?? {};
          const netRx = Object.values(networks).reduce((acc: number, n: any) => acc + (n.rx_bytes ?? 0), 0);
          const netTx = Object.values(networks).reduce((acc: number, n: any) => acc + (n.tx_bytes ?? 0), 0);

          const payload = {
            timestamp: Date.now(),
            cpuPercent: Math.min(cpuPercent, 100),
            memUsage: memActual,
            memLimit,
            memPercent: (memActual / memLimit) * 100,
            netRx,
            netTx,
          };

          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch {
          // Malformed stats chunk
        }
      });

      statsStream.on('end', () => {
        try { controller.close(); } catch {}
      });

      req.signal.addEventListener('abort', () => {
        (statsStream as any).destroy?.();
        try { controller.close(); } catch {}
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store',
      'X-Accel-Buffering': 'no',
    },
  });
}
