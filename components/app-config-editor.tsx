'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

type AppConfig = {
  appName: string;
  repoUrl: string | null;
  domain: string | null;
  port: number | null;
  updatedAt: string | null;
};

export function AppConfigEditor({ appName }: { appName: string }) {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [repoUrl, setRepoUrl] = useState('');
  const [domain, setDomain] = useState('');
  const [port, setPort] = useState('');
  const [saving, setSaving] = useState(false);
  const [deploying, setDeploying] = useState(false);

  const webhookUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/api/webhooks/deploy`;
  }, []);

  useEffect(() => {
    fetch(`/api/docker/apps/${appName}/config`)
      .then(r => r.json())
      .then((d: AppConfig) => {
        setConfig(d);
        setRepoUrl(d.repoUrl ?? '');
        setDomain(d.domain ?? '');
        setPort(d.port?.toString() ?? '');
      })
      .catch(() => {});
  }, [appName]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/docker/apps/${appName}/config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoUrl: repoUrl.trim() ? repoUrl.trim() : null,
          domain: domain.trim() ? domain.trim() : null,
          port: port.trim() ? Number(port) : null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error ?? 'Failed to save app config');
        return;
      }

      toast.success('App config saved');

      const refreshed = await fetch(`/api/docker/apps/${appName}/config`).then(r => r.json());
      setConfig(refreshed);
    } finally {
      setSaving(false);
    }
  };

  const manualDeploy = async () => {
    setDeploying(true);
    try {
      const res = await fetch('/api/deployments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appName }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error ?? 'Failed to trigger deploy');
        return;
      }
      toast.success('Deploy triggered');
    } finally {
      setDeploying(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">App config</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="repoUrl">Git repo URL</Label>
          <Input
            id="repoUrl"
            placeholder="https://github.com/org/repo.git"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Used by webhook + manual deploy.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label htmlFor="port">Host port</Label>
            <Input
              id="port"
              inputMode="numeric"
              placeholder="3001"
              value={port}
              onChange={(e) => setPort(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Maps container `3000/tcp` to this host port.</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="domain">Domain (optional)</Label>
            <Input
              id="domain"
              placeholder="app.example.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
          <Button variant="secondary" onClick={manualDeploy} disabled={deploying || !repoUrl.trim()}>
            {deploying ? 'Deploying…' : 'Manual deploy'}
          </Button>
        </div>

        <div className="rounded-md border p-3 text-xs space-y-1">
          <div className="font-medium">Webhook endpoint</div>
          <div className="font-mono break-all">{webhookUrl || '/api/webhooks/deploy'}</div>
          <div className="text-muted-foreground">
            GitHub must be configured with the same secret as `WEBHOOK_SECRET`.
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Last updated: {config?.updatedAt ? new Date(config.updatedAt).toLocaleString() : '—'}
        </div>
      </CardContent>
    </Card>
  );
}

