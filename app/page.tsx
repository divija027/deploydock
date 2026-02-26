import { DashboardHeader } from '@/components/dashboard-header';
import { QuickStartCard } from '@/components/quick-start-card';
import { BuildImageCard } from '@/components/build-image-card';
import { RunContainerCard } from '@/components/run-container-card';
import { ContainerStatusCard } from '@/components/container-status-card';

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="container mx-auto p-4 md:p-6">
        <div className="grid gap-6 md:grid-cols-2">
          <QuickStartCard />
          <BuildImageCard />
          <RunContainerCard />
          <ContainerStatusCard />
        </div>
      </main>
    </div>
  );
}
