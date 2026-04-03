'use client';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Play,
  CheckCircle2,
  Loader2,
  Info,
  Box,
  Network,
  Shield,
  HardDrive,
  Cpu,
  CircleHelp,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TemplateGallery } from '@/components/template-gallery';
import type { AppTemplate } from '@/lib/templates';
import type { ImageSummary } from '@/types/docker';
import { ImageCombobox } from '@/components/image-combobox';
import { cn } from '@/lib/utils';

/* ── Behind-the-scenes step data ───────────────────────────── */

interface BootStep {
  id: string;
  icon: React.ElementType;
  label: string;
  concept: string;
  color: string;
}

const bootSteps: BootStep[] = [
  {
    id: 'namespace',
    icon: Shield,
    label: 'Creating Linux Namespaces',
    concept: 'Linux namespaces isolate the container\'s view of the system — it gets its own PID tree, network stack, mount points, and hostname. The process inside thinks it\'s the only thing running.',
    color: 'text-violet-400',
  },
  {
    id: 'cgroup',
    icon: Cpu,
    label: 'Setting up Cgroups',
    concept: 'Control Groups (cgroups) limit how much CPU, memory, and I/O the container can consume. This prevents a single container from starving the host machine of resources.',
    color: 'text-amber-400',
  },
  {
    id: 'filesystem',
    icon: HardDrive,
    label: 'Mounting Filesystem (OverlayFS)',
    concept: 'Docker creates a thin writable layer on top of the read-only image layers using OverlayFS (copy-on-write). Any file changes the container makes happen only in this layer — the original image stays untouched.',
    color: 'text-cyan-400',
  },
  {
    id: 'network',
    icon: Network,
    label: 'Attaching to Bridge Network',
    concept: 'The container gets a virtual ethernet interface (veth pair) connected to Docker\'s bridge network (docker0). Port bindings use iptables NAT rules to forward host ports into the container\'s network namespace.',
    color: 'text-green-400',
  },
  {
    id: 'start',
    icon: Play,
    label: 'Starting Process (PID 1)',
    concept: 'Docker runs the image\'s entrypoint command as PID 1 inside the container. This process becomes the init process — if it exits, the container stops. Signals like SIGTERM are forwarded to it for graceful shutdown.',
    color: 'text-blue-400',
  },
];

/* ── Boot animation component ──────────────────────────────── */

function ContainerBootSequence({ active, done }: { active: boolean; done: boolean }) {
  const [currentStep, setCurrentStep] = useState(-1);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!active) return;
    setCurrentStep(0);
    let step = 0;

    intervalRef.current = setInterval(() => {
      step++;
      if (step >= bootSteps.length) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        return;
      }
      setCurrentStep(step);
    }, 600);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [active]);

  if (!active && !done) return null;

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-2">
        <Box className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">Container Boot Sequence</span>
        {done && (
          <Badge variant="outline" className="ml-auto border-green-500/30 text-green-400 text-[10px]">
            Running
          </Badge>
        )}
      </div>
      <div className="p-4 space-y-3">
        {bootSteps.map((step, i) => {
          const Icon = step.icon;
          const isActive = i === currentStep && !done;
          const isDone = done || i < currentStep;
          const isPending = i > currentStep && !done;

          return (
            <div key={step.id} className={cn(
              "transition-all duration-300",
              isPending && "opacity-30",
            )}>
              <div className="flex items-center gap-2">
                <div className={cn(
                  "flex items-center justify-center h-6 w-6 rounded-full border transition-all duration-300",
                  isActive && `${step.color} border-current bg-current/10`,
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
                  isActive && step.color,
                  isDone && "text-green-500",
                  isPending && "text-muted-foreground",
                )}>
                  {step.label}
                </span>
              </div>
              {(isActive || isDone) && !isPending && (
                <div className="ml-8 mt-1.5 rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-[11px]">
                  <div className="flex items-center gap-1 font-semibold text-primary mb-0.5">
                    <Info className="h-2.5 w-2.5" />
                    OS Concept
                  </div>
                  <p className="text-muted-foreground leading-relaxed">{step.concept}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Main Component ────────────────────────────────────────── */

export function RunContainerCard() {
  const [containerName, setContainerName] = useState('');
  const [image, setImage] = useState('');
  const [hostPort, setHostPort] = useState('');
  const [containerPort, setContainerPort] = useState('');
  const [envVars, setEnvVars] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [resultPort, setResultPort] = useState('');
  const [showBoot, setShowBoot] = useState(false);
  const [bootDone, setBootDone] = useState(false);
  const [localImages, setLocalImages] = useState<ImageSummary[]>([]);
  const [imagesLoading, setImagesLoading] = useState(true);

  useEffect(() => {
    fetch('/api/docker/images')
      .then(res => res.ok ? res.json() : [])
      .then(setLocalImages)
      .catch(() => setLocalImages([]))
      .finally(() => setImagesLoading(false));
  }, []);

  const handleTemplateSelect = (template: AppTemplate) => {
    setContainerName(template.id);
    setImage(template.image);
    const firstPort = Object.entries(template.ports)[0];
    if (firstPort) {
      setContainerPort(firstPort[0].replace('/tcp', ''));
      setHostPort(firstPort[1][0].HostPort);
    }
    setEnvVars(template.env.map(e => `${e.key}=${e.value}`).join('\n'));
  };

  const runContainer = async () => {
    if (!image.trim()) return;
    setRunning(true);
    setResult(null);
    setShowBoot(true);
    setBootDone(false);

    try {
      const env = envVars.split('\n').filter(l => l.includes('='));
      const portBindings: Record<string, Array<{ HostPort: string }>> = {};
      if (hostPort && containerPort) {
        portBindings[`${containerPort}/tcp`] = [{ HostPort: hostPort }];
      }

      const res = await fetch('/api/docker/containers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image,
          name: containerName || undefined,
          env,
          portBindings,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setBootDone(true);
        setResultPort(hostPort);
        setResult(`Container started: ${data.name ?? data.id}`);
        setContainerName('');
        setImage('');
        setHostPort('');
        setContainerPort('');
        setEnvVars('');
      } else {
        setShowBoot(false);
        setResult(`Error: ${data.error}`);
      }
    } catch {
      setShowBoot(false);
      setResult('Failed to create container');
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-5 w-5 text-primary" />
          Run Container
        </CardTitle>
        <CardDescription>Create and start a new container</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="custom">
          <TabsList className="mb-4">
            <TabsTrigger value="custom">Custom</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="custom" className="space-y-4">
            <div className="grid gap-2">
              <Label>Image</Label>
              <ImageCombobox
                mode="local"
                value={image}
                onValueChange={setImage}
                localImages={localImages}
                loading={imagesLoading}
                placeholder="Select a downloaded image..."
                disabled={running}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="run-name" className="flex items-center gap-1">
                Container Name
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="run-name"
                placeholder="my-container"
                value={containerName}
                onChange={e => setContainerName(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '-'))}
              />
              {containerName && !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(containerName) && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Must start with a letter or number
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-2">
                <Label htmlFor="host-port" className="flex items-center gap-1">
                  Host Port
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <CircleHelp className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[220px]">
                      The port on your machine. You&apos;ll access the app at localhost:this_port
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Input
                  id="host-port"
                  placeholder="8080"
                  type="number"
                  min={1}
                  max={65535}
                  value={hostPort}
                  onChange={e => setHostPort(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="container-port" className="flex items-center gap-1">
                  Container Port
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <CircleHelp className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[220px]">
                      The port the app listens on inside the container (check the image docs)
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Input
                  id="container-port"
                  placeholder="80"
                  type="number"
                  min={1}
                  max={65535}
                  value={containerPort}
                  onChange={e => setContainerPort(e.target.value)}
                />
              </div>
            </div>
            {hostPort && containerPort && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <ExternalLink className="h-3 w-3" />
                Access at <span className="font-mono font-medium text-foreground">localhost:{hostPort}</span> &rarr; container port {containerPort}
              </p>
            )}
            <div className="grid gap-2">
              <Label htmlFor="env">Env Vars (one per line: KEY=value)</Label>
              <Textarea
                id="env"
                className="font-mono"
                placeholder="NODE_ENV=production"
                value={envVars}
                onChange={e => setEnvVars(e.target.value)}
              />
            </div>
            <Button className="w-full" onClick={runContainer} disabled={running || !image.trim()}>
              {running ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Starting...
                </>
              ) : 'Run Container'}
            </Button>

            {/* Behind the scenes: container boot sequence */}
            <ContainerBootSequence active={running || showBoot} done={bootDone} />

            {result && !running && (
              result.startsWith('Error') ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
                  <p className="font-medium text-destructive flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4" />
                    Failed to start container
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {result.includes('port is already allocated')
                      ? 'That port is already in use — try a different host port.'
                      : result.includes('No such image')
                        ? 'Image not found locally — pull it first from the Pull Image card.'
                        : result.replace('Error: ', '')}
                  </p>
                </div>
              ) : bootDone ? (
                <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3 text-sm">
                  <p className="font-medium text-green-600 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" />
                    {result}
                  </p>
                  {resultPort && (
                    <p className="text-muted-foreground mt-1 text-xs flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" />
                      Access at{' '}
                      <a
                        href={`http://localhost:${resultPort}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline underline-offset-2"
                      >
                        localhost:{resultPort}
                      </a>
                    </p>
                  )}
                </div>
              ) : null
            )}
          </TabsContent>

          <TabsContent value="templates">
            <TemplateGallery onSelect={handleTemplateSelect} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
