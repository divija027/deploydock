# Real-Time Streaming with SSE

## Why SSE (not WebSocket)?

Server-Sent Events are built on plain HTTP, work natively in browsers, require zero extra libraries, and are supported directly by Next.js App Router via `ReadableStream`. They're perfect for one-directional pushes like log tailing and metrics.

```
Container logs → dockerode stream → Next.js ReadableStream → SSE (text/event-stream)
                                                                    ↓
                                               Browser EventSource API → React state → UI
```

---

## Server: Log Streaming Route

**`app/api/docker/containers/[id]/logs/route.ts`**

```typescript
import { auth } from '@/auth';
import docker from '@/lib/docker/client';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const container = docker.getContainer(params.id);

  // Verify container exists before streaming
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
      follow: true,       // keep connection open for new logs
      timestamps: true,   // prefix each line with RFC3339 timestamp
      tail: 100,          // send last 100 lines immediately on connect
    }) as unknown as NodeJS.ReadableStream;
  } catch {
    return new Response('Failed to attach to container logs', { status: 500 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      logStream.on('data', (chunk: Buffer) => {
        // Docker log format: 8-byte header + payload
        // Header: [stream_type(1), 0, 0, 0, size(4 bytes big-endian)]
        // stream_type: 1 = stdout, 2 = stderr
        let offset = 0;
        while (offset < chunk.length) {
          if (chunk.length < offset + 8) break;
          const streamType = chunk[offset];    // 1=stdout, 2=stderr
          const size = chunk.readUInt32BE(offset + 4);
          const payload = chunk.slice(offset + 8, offset + 8 + size).toString('utf8');
          send({ text: payload, stream: streamType === 2 ? 'stderr' : 'stdout' });
          offset += 8 + size;
        }
      });

      logStream.on('end', () => {
        send({ done: true });
        controller.close();
      });

      logStream.on('error', (err) => {
        send({ error: err.message });
        controller.close();
      });

      // Clean up when client disconnects
      req.signal.addEventListener('abort', () => {
        (logStream as any).destroy?.();
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // disable Nginx buffering if behind proxy
    },
  });
}
```

---

## Server: Metrics Streaming Route

**`app/api/docker/containers/[id]/stats/route.ts`**

```typescript
import { auth } from '@/auth';
import docker from '@/lib/docker/client';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const container = docker.getContainer(params.id);
  const statsStream = await container.stats({ stream: true }) as unknown as NodeJS.ReadableStream;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      statsStream.on('data', (data: Buffer) => {
        try {
          const s = JSON.parse(data.toString());

          // CPU % calculation (Linux containers)
          const cpuDelta =
            s.cpu_stats.cpu_usage.total_usage - s.precpu_stats.cpu_usage.total_usage;
          const sysDelta =
            (s.cpu_stats.system_cpu_usage ?? 0) - (s.precpu_stats.system_cpu_usage ?? 0);
          const numCpus = s.cpu_stats.online_cpus ?? s.cpu_stats.cpu_usage.percpu_usage?.length ?? 1;
          const cpuPercent = sysDelta > 0 ? (cpuDelta / sysDelta) * numCpus * 100 : 0;

          // Memory
          const memUsage = s.memory_stats.usage ?? 0;
          const memLimit = s.memory_stats.limit ?? 1;
          // Subtract cache for accurate usage (Linux kernel reports cache in usage)
          const memCache = s.memory_stats.stats?.cache ?? 0;
          const memActual = memUsage - memCache;

          // Network I/O (sum across all interfaces)
          const networks = s.networks ?? {};
          const netRx = Object.values(networks).reduce((acc: number, n: any) => acc + (n.rx_bytes ?? 0), 0);
          const netTx = Object.values(networks).reduce((acc: number, n: any) => acc + (n.tx_bytes ?? 0), 0);

          // Block I/O
          const blkio = s.blkio_stats?.io_service_bytes_recursive ?? [];
          const blkRead = blkio.find((b: any) => b.op === 'Read')?.value ?? 0;
          const blkWrite = blkio.find((b: any) => b.op === 'Write')?.value ?? 0;

          const payload = {
            timestamp: Date.now(),
            cpuPercent: Math.min(cpuPercent, 100), // clamp to 100%
            memUsage: memActual,
            memLimit,
            memPercent: (memActual / memLimit) * 100,
            netRx,
            netTx,
            blkRead,
            blkWrite,
          };

          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch {
          // Malformed stats chunk — skip
        }
      });

      statsStream.on('end', () => controller.close());
      req.signal.addEventListener('abort', () => {
        (statsStream as any).destroy?.();
        controller.close();
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
```

---

## Client: Generic SSE Hook

**`hooks/use-sse.ts`**

```typescript
import { useEffect, useRef, useState } from 'react';

interface UseSSEOptions {
  enabled?: boolean;
}

export function useSSE<T>(url: string | null, options: UseSSEOptions = {}) {
  const { enabled = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!url || !enabled) return;

    const es = new EventSource(url);
    esRef.current = es;

    es.onopen = () => setConnected(true);

    es.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as T;
        setData(parsed);
      } catch {
        setError('Failed to parse server message');
      }
    };

    es.onerror = () => {
      setConnected(false);
      setError('Connection lost');
      es.close();
    };

    return () => {
      es.close();
      esRef.current = null;
      setConnected(false);
    };
  }, [url, enabled]);

  return { data, error, connected };
}
```

---

## Client: Log Viewer Component

**`components/container-logs.tsx`**

```typescript
'use client';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface LogLine {
  text: string;
  stream: 'stdout' | 'stderr';
  id: number;
}

export function ContainerLogs({ containerId }: { containerId: string }) {
  const [lines, setLines] = useState<LogLine[]>([]);
  const [connected, setConnected] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef(0);

  useEffect(() => {
    const es = new EventSource(`/api/docker/containers/${containerId}/logs`);
    setConnected(true);

    es.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.done) { es.close(); setConnected(false); return; }
      if (data.text) {
        setLines(prev => [
          ...prev.slice(-999), // keep last 1000 lines
          { text: data.text, stream: data.stream, id: ++counterRef.current }
        ]);
      }
    };

    es.onerror = () => { setConnected(false); es.close(); };
    return () => { es.close(); setConnected(false); };
  }, [containerId]);

  useEffect(() => {
    if (autoScroll) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines, autoScroll]);

  return (
    <div className="flex flex-col h-96 border rounded-lg bg-black text-green-400 font-mono text-xs">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
        <Badge variant={connected ? 'default' : 'secondary'}>
          {connected ? 'Live' : 'Disconnected'}
        </Badge>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => setLines([])}>Clear</Button>
          <Button size="sm" variant="ghost" onClick={() => setAutoScroll(a => !a)}>
            {autoScroll ? 'Pause scroll' : 'Auto scroll'}
          </Button>
        </div>
      </div>

      {/* Log output */}
      <ScrollArea className="flex-1 p-3">
        {lines.map(line => (
          <div
            key={line.id}
            className={line.stream === 'stderr' ? 'text-red-400' : ''}
          >
            {line.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </ScrollArea>
    </div>
  );
}
```

---

## Client: Metrics Chart Component

**`components/metrics-chart.tsx`**

```typescript
'use client';
import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DataPoint {
  timestamp: number;
  cpuPercent: number;
  memPercent: number;
  netRx: number;
  netTx: number;
}

const MAX_POINTS = 60; // 60 seconds of data

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function MetricsChart({ containerId }: { containerId: string }) {
  const [data, setData] = useState<DataPoint[]>([]);
  const [latest, setLatest] = useState<DataPoint | null>(null);

  useEffect(() => {
    const es = new EventSource(`/api/docker/containers/${containerId}/stats`);
    es.onmessage = (event) => {
      const point: DataPoint = JSON.parse(event.data);
      setLatest(point);
      setData(prev => [...prev.slice(-(MAX_POINTS - 1)), point]);
    };
    es.onerror = () => es.close();
    return () => es.close();
  }, [containerId]);

  const chartData = data.map(d => ({
    ...d,
    time: new Date(d.timestamp).toLocaleTimeString(),
  }));

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'CPU', value: `${latest?.cpuPercent.toFixed(1) ?? '—'}%` },
          { label: 'Memory', value: `${latest?.memPercent.toFixed(1) ?? '—'}%` },
          { label: 'Net Rx', value: latest ? formatBytes(latest.netRx) : '—' },
          { label: 'Net Tx', value: latest ? formatBytes(latest.netTx) : '—' },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardHeader className="pb-1"><CardTitle className="text-xs">{label}</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{value}</p></CardContent>
          </Card>
        ))}
      </div>

      {/* CPU & Memory Chart */}
      <Card>
        <CardHeader><CardTitle className="text-sm">CPU & Memory %</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
              <Line type="monotone" dataKey="cpuPercent" stroke="#3b82f6" name="CPU" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="memPercent" stroke="#10b981" name="Memory" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## SSE Best Practices

1. **Always clean up** — close EventSource in `useEffect` cleanup and destroy the dockerode stream on `req.signal.abort`.
2. **Handle reconnection** — EventSource auto-reconnects on error. Add `es.onerror` to track state.
3. **Rate limit metrics** — Docker stats sends ~1 update/sec by default. That's fine.
4. **Nginx buffering** — If behind Nginx, add `X-Accel-Buffering: no` header or `proxy_buffering off` in nginx.conf.
5. **Max lines** — Cap log lines in React state (e.g., 1000) to prevent memory growth.
