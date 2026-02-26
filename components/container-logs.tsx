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
          ...prev.slice(-999),
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
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
        <Badge variant={connected ? 'default' : 'secondary'}>
          {connected ? 'Live' : 'Disconnected'}
        </Badge>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" className="text-zinc-400" onClick={() => setLines([])}>Clear</Button>
          <Button size="sm" variant="ghost" className="text-zinc-400" onClick={() => setAutoScroll(a => !a)}>
            {autoScroll ? 'Pause scroll' : 'Auto scroll'}
          </Button>
        </div>
      </div>
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
