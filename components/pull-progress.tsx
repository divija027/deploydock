'use client';

import { useEffect, useRef, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Globe,
  Layers,
  Download,
  CheckCircle2,
  HardDrive,
  Fingerprint,
  ArrowDown,
  PackageCheck,
  Info,
  Loader2,
  Database,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ── Types ─────────────────────────────────────────────────── */

interface LayerState {
  id: string;
  status: string;
  current: number;
  total: number;
  done: boolean;
  cached: boolean;
}

interface PullEvent {
  status?: string;
  id?: string;
  progressDetail?: { current?: number; total?: number };
  progress?: string;
  error?: string;
  done?: boolean;
}

type Phase = 'idle' | 'connecting' | 'discovering' | 'downloading' | 'extracting' | 'complete' | 'error';

/* ── Helpers ───────────────────────────────────────────────── */

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const phaseInfo: Record<Phase, { icon: React.ElementType; label: string; color: string }> = {
  idle: { icon: ArrowDown, label: 'Ready', color: 'text-muted-foreground' },
  connecting: { icon: Globe, label: 'Connecting to Docker Hub Registry', color: 'text-blue-400' },
  discovering: { icon: Layers, label: 'Discovering Image Layers', color: 'text-violet-400' },
  downloading: { icon: Download, label: 'Downloading Layers', color: 'text-cyan-400' },
  extracting: { icon: HardDrive, label: 'Extracting to Filesystem', color: 'text-amber-400' },
  complete: { icon: CheckCircle2, label: 'Pull Complete', color: 'text-green-400' },
  error: { icon: Info, label: 'Error', color: 'text-red-400' },
};

/* ── Concept Callout ───────────────────────────────────────── */

function ConceptCallout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs">
      <div className="flex items-center gap-1.5 font-semibold text-primary mb-1">
        <Info className="h-3 w-3" />
        {title}
      </div>
      <p className="text-muted-foreground leading-relaxed">{children}</p>
    </div>
  );
}

/* ── Phase Timeline Step ───────────────────────────────────── */

function PhaseStep({ phase, currentPhase, phaseOrder }: {
  phase: Phase;
  currentPhase: Phase;
  phaseOrder: Phase[];
}) {
  const info = phaseInfo[phase];
  const Icon = info.icon;
  const currentIdx = phaseOrder.indexOf(currentPhase);
  const thisIdx = phaseOrder.indexOf(phase);
  const isActive = phase === currentPhase;
  const isDone = currentIdx > thisIdx;
  const isPending = currentIdx < thisIdx;

  return (
    <div className={cn(
      "flex items-center gap-2 py-1 transition-all duration-300",
      isActive && "opacity-100",
      isDone && "opacity-60",
      isPending && "opacity-30",
    )}>
      <div className={cn(
        "flex items-center justify-center h-6 w-6 rounded-full border transition-all duration-300",
        isActive && `${info.color} border-current bg-current/10`,
        isDone && "border-green-500/50 bg-green-500/10 text-green-500",
        isPending && "border-border text-muted-foreground",
      )}>
        {isDone ? (
          <CheckCircle2 className="h-3 w-3" />
        ) : isActive ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Icon className="h-3 w-3" />
        )}
      </div>
      <span className={cn(
        "text-xs font-medium transition-colors duration-300",
        isActive && info.color,
        isDone && "text-green-500",
        isPending && "text-muted-foreground",
      )}>
        {info.label}
      </span>
    </div>
  );
}

/* ── Layer Row ─────────────────────────────────────────────── */

function LayerRow({ layer }: { layer: LayerState }) {
  const pct = layer.total > 0 ? Math.round((layer.current / layer.total) * 100) : 0;

  return (
    <div className="flex items-center gap-2 py-1">
      <code className="text-[10px] font-mono text-muted-foreground w-16 shrink-0 truncate">
        {layer.id}
      </code>
      {layer.cached ? (
        <div className="flex-1 flex items-center gap-1.5">
          <Database className="h-3 w-3 text-green-400" />
          <span className="text-[10px] text-green-400 font-medium">Cached — already exists</span>
        </div>
      ) : layer.done ? (
        <div className="flex-1 flex items-center gap-1.5">
          <CheckCircle2 className="h-3 w-3 text-green-400" />
          <span className="text-[10px] text-green-400 font-medium">Complete</span>
          {layer.total > 0 && (
            <span className="text-[10px] text-muted-foreground ml-auto">{formatBytes(layer.total)}</span>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center gap-2">
          <Progress value={pct} className="h-1.5 flex-1" />
          <span className="text-[10px] text-muted-foreground tabular-nums w-20 text-right shrink-0">
            {formatBytes(layer.current)} / {formatBytes(layer.total)}
          </span>
          <span className="text-[10px] font-mono text-muted-foreground w-8 text-right shrink-0">
            {pct}%
          </span>
        </div>
      )}
    </div>
  );
}

/* ── Main Component ────────────────────────────────────────── */

export interface PullProgressHandle {
  reset: () => void;
  processEvent: (event: PullEvent) => void;
}

export function PullProgress({ imageName, events }: {
  imageName: string;
  events: PullEvent[];
}) {
  const [phase, setPhase] = useState<Phase>('connecting');
  const [layers, setLayers] = useState<Map<string, LayerState>>(new Map());
  const [digest, setDigest] = useState<string | null>(null);
  const [totalDownloaded, setTotalDownloaded] = useState(0);
  const [cachedCount, setCachedCount] = useState(0);
  const prevLenRef = useRef(0);

  const phaseOrder: Phase[] = ['connecting', 'discovering', 'downloading', 'extracting', 'complete'];

  // Process new events as they come in
  useEffect(() => {
    if (events.length <= prevLenRef.current) return;
    const newEvents = events.slice(prevLenRef.current);
    prevLenRef.current = events.length;

    for (const evt of newEvents) {
      if (evt.error) {
        setPhase('error');
        continue;
      }
      if (evt.done) {
        setPhase('complete');
        // Calculate final totals
        setLayers(prev => {
          let total = 0;
          let cached = 0;
          for (const l of prev.values()) {
            total += l.total;
            if (l.cached) cached++;
          }
          setTotalDownloaded(total);
          setCachedCount(cached);
          return prev;
        });
        continue;
      }

      const status = evt.status ?? '';
      const id = evt.id;

      // Phase detection
      if (status.startsWith('Pulling from') || status.startsWith('Pulling image')) {
        setPhase('connecting');
      } else if (status === 'Pulling fs layer' || status === 'Already exists' || status === 'Waiting') {
        setPhase('discovering');
        if (id) {
          setLayers(prev => {
            const next = new Map(prev);
            if (!next.has(id)) {
              next.set(id, {
                id,
                status: status === 'Already exists' ? 'cached' : 'waiting',
                current: 0,
                total: 0,
                done: status === 'Already exists',
                cached: status === 'Already exists',
              });
            } else if (status === 'Already exists') {
              const existing = next.get(id)!;
              next.set(id, { ...existing, cached: true, done: true, status: 'cached' });
            }
            return next;
          });
        }
      } else if (status === 'Downloading') {
        setPhase('downloading');
        if (id) {
          setLayers(prev => {
            const next = new Map(prev);
            const existing = next.get(id) ?? { id, status: 'downloading', current: 0, total: 0, done: false, cached: false };
            next.set(id, {
              ...existing,
              status: 'downloading',
              current: evt.progressDetail?.current ?? existing.current,
              total: evt.progressDetail?.total ?? existing.total,
            });
            return next;
          });
        }
      } else if (status === 'Download complete') {
        if (id) {
          setLayers(prev => {
            const next = new Map(prev);
            const existing = next.get(id);
            if (existing) {
              next.set(id, { ...existing, status: 'downloaded', current: existing.total, done: false });
            }
            return next;
          });
        }
      } else if (status === 'Extracting') {
        setPhase('extracting');
        if (id) {
          setLayers(prev => {
            const next = new Map(prev);
            const existing = next.get(id);
            if (existing) {
              next.set(id, { ...existing, status: 'extracting' });
            }
            return next;
          });
        }
      } else if (status === 'Pull complete') {
        if (id) {
          setLayers(prev => {
            const next = new Map(prev);
            const existing = next.get(id);
            if (existing) {
              next.set(id, { ...existing, status: 'complete', done: true, current: existing.total });
            }
            return next;
          });
        }
      } else if (status.startsWith('Digest:')) {
        setDigest(status.replace('Digest: ', ''));
      }
    }
  }, [events]);

  const layerArray = Array.from(layers.values());
  const downloadingLayers = layerArray.filter(l => !l.done && !l.cached);
  const overallCurrent = layerArray.reduce((sum, l) => sum + l.current, 0);
  const overallTotal = layerArray.reduce((sum, l) => sum + l.total, 0);
  const overallPct = overallTotal > 0 ? Math.round((overallCurrent / overallTotal) * 100) : 0;

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PackageCheck className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Pulling: {imageName}</span>
          </div>
          {phase !== 'idle' && phase !== 'error' && (
            <Badge
              variant="outline"
              className={cn(
                "text-[10px]",
                phase === 'complete' ? "border-green-500/30 text-green-400" : "border-primary/30 text-primary",
              )}
            >
              {phase === 'complete' ? 'Done' : `${overallPct}%`}
            </Badge>
          )}
        </div>
        {overallTotal > 0 && phase !== 'complete' && (
          <Progress value={overallPct} className="h-1 mt-2" />
        )}
      </div>

      <div className="p-4 grid gap-4 md:grid-cols-[180px_1fr]">
        {/* Left: Phase timeline */}
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Pipeline</p>
          {phaseOrder.map(p => (
            <PhaseStep key={p} phase={p} currentPhase={phase} phaseOrder={phaseOrder} />
          ))}
        </div>

        {/* Right: Layer details + concepts */}
        <div className="space-y-4 min-w-0">
          {/* Phase-specific concept callouts */}
          {phase === 'connecting' && (
            <ConceptCallout title="Docker Registry Protocol">
              Your machine contacts Docker Hub (registry-1.docker.io) over HTTPS. It sends
              an authentication token and requests the image manifest — a JSON document listing
              all filesystem layers that compose this image.
            </ConceptCallout>
          )}
          {phase === 'discovering' && (
            <ConceptCallout title="Image Layers (UnionFS)">
              Docker images are built from stacked layers. Each layer is a filesystem diff — only the
              files that changed from the previous layer. Docker checks which layers already exist locally
              (cached) and skips re-downloading them. This is why subsequent pulls are much faster.
            </ConceptCallout>
          )}
          {phase === 'downloading' && (
            <ConceptCallout title="Content-Addressable Storage">
              Each layer is identified by its SHA-256 hash (content-addressable). This means if two
              different images share the same base layer (e.g. Alpine Linux), Docker only stores and
              downloads it once. Layers are downloaded in parallel for speed.
            </ConceptCallout>
          )}
          {phase === 'extracting' && (
            <ConceptCallout title="Filesystem Extraction">
              Downloaded layers are compressed tar archives (tar.gz). Docker extracts them into the
              local storage driver (overlay2 on Linux). The storage driver uses OverlayFS to stack
              layers on top of each other, creating a single unified filesystem view.
            </ConceptCallout>
          )}
          {phase === 'complete' && (
            <ConceptCallout title="Image Ready">
              The image is now stored locally. When you run a container from it, Docker creates a thin
              writable layer on top (copy-on-write) — the image layers stay read-only and shared across
              all containers using this image, saving disk space.
            </ConceptCallout>
          )}

          {/* Layer list */}
          {layerArray.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                  {layerArray.length} Layer{layerArray.length !== 1 ? 's' : ''}
                </p>
                {layerArray.some(l => l.cached) && (
                  <span className="text-[10px] text-green-400">
                    {layerArray.filter(l => l.cached).length} cached (reused)
                  </span>
                )}
              </div>
              <ScrollArea className="max-h-40">
                <div className="space-y-0.5">
                  {layerArray.map(layer => (
                    <LayerRow key={layer.id} layer={layer} />
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Completion summary */}
          {phase === 'complete' && (
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border bg-muted/30 p-2.5 text-center">
                <p className="text-lg font-bold text-foreground">{layerArray.length}</p>
                <p className="text-[10px] text-muted-foreground">Layers</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-2.5 text-center">
                <p className="text-lg font-bold text-green-400">{layerArray.filter(l => l.cached).length}</p>
                <p className="text-[10px] text-muted-foreground">Cached</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-2.5 text-center">
                <p className="text-lg font-bold text-foreground">{formatBytes(overallTotal)}</p>
                <p className="text-[10px] text-muted-foreground">Total Size</p>
              </div>
            </div>
          )}

          {/* Digest */}
          {digest && (
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <Fingerprint className="h-3 w-3 shrink-0" />
              <code className="font-mono truncate">{digest}</code>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
