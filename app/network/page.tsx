import { DashboardHeader } from '@/components/dashboard-header';
import { NetworkGraph } from '@/components/network-graph';

export default function NetworkPage() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="container mx-auto p-4 md:p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Container Network</h1>
          <p className="text-muted-foreground text-sm">
            Interactive graph of container-to-network connections. Drag nodes to rearrange.
          </p>
        </div>
        <NetworkGraph />
      </main>
    </div>
  );
}
