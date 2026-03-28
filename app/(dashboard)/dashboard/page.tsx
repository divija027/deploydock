'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { DashboardHeader } from '@/components/dashboard-header';
import { QuickStartCard } from '@/components/quick-start-card';
import { BuildImageCard } from '@/components/build-image-card';
import { RunContainerCard } from '@/components/run-container-card';
import { ContainerStatusCard } from '@/components/container-status-card';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Box, CirclePlay, CircleStop, Images } from 'lucide-react';

interface StatsData {
  total: number;
  running: number;
  stopped: number;
  images: number;
}

function StatCard({ icon: Icon, label, value, color, loading }: {
  icon: React.ElementType;
  label: string;
  value: number;
  color?: string;
  loading: boolean;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-muted/50 ${color ?? ''}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          {loading ? (
            <Skeleton className="h-7 w-8 mb-1" />
          ) : (
            <p className="text-2xl font-bold">{value}</p>
          )}
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<StatsData>({ total: 0, running: 0, stopped: 0, images: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/docker/containers').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/docker/images').then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([containers, images]) => {
      setStats({
        total: containers.length,
        running: containers.filter((c: { State: string }) => c.State === 'running').length,
        stopped: containers.filter((c: { State: string }) => c.State === 'exited').length,
        images: images.length,
      });
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="container mx-auto p-4 md:p-6">
        <div className="animate-fade-in-up">
          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight">
              Welcome back{session?.user?.name ? `, ${session.user.name}` : ''}
            </h2>
            <p className="text-muted-foreground mt-1">Here is your Docker environment overview.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard icon={Box} label="Total Containers" value={stats.total} loading={loading} />
            <StatCard icon={CirclePlay} label="Running" value={stats.running} color="text-green-500" loading={loading} />
            <StatCard icon={CircleStop} label="Stopped" value={stats.stopped} color="text-red-500" loading={loading} />
            <StatCard icon={Images} label="Images" value={stats.images} color="text-primary" loading={loading} />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <QuickStartCard />
            <BuildImageCard />
            <RunContainerCard />
            <ContainerStatusCard />
          </div>
        </div>
      </main>
    </div>
  );
}
