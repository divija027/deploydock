'use client';
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
