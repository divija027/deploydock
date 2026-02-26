'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardHeader } from '@/components/dashboard-header';
import { TemplateGallery } from '@/components/template-gallery';
import type { AppTemplate } from '@/lib/templates';
import { toast } from 'sonner';

export default function TemplatesPage() {
  const router = useRouter();
  const [deploying, setDeploying] = useState(false);

  const handleDeploy = async (template: AppTemplate) => {
    setDeploying(true);
    try {
      const res = await fetch('/api/docker/containers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: template.image,
          name: template.id,
          env: template.env.map(e => `${e.key}=${e.value}`),
          portBindings: template.ports,
        }),
      });

      if (res.ok) {
        toast.success(`${template.name} deployed successfully!`);
        router.push('/');
      } else {
        const data = await res.json();
        toast.error(data.error ?? 'Failed to deploy');
      }
    } catch {
      toast.error('Failed to deploy template');
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="container mx-auto p-4 md:p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">App Templates</h1>
          <p className="text-muted-foreground text-sm">
            One-click deploy for popular self-hosted services
          </p>
        </div>
        <TemplateGallery onSelect={handleDeploy} />
      </main>
    </div>
  );
}
