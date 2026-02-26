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

const MAX_POINTS = 60;

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
