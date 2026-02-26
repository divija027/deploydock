# Environment Variables Editor & App Templates

---

## Part 1: Environment Variables Management

### Purpose
Let users configure per-app environment variables through the UI — no need to SSH into the server. Values are masked by default (security UX), and changes trigger a container restart with updated env.

### API Routes

**`app/api/docker/apps/[name]/env/route.ts`**

```typescript
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import docker from '@/lib/docker/client';
import { hasRole } from '@/lib/auth-utils';

interface EnvEntry { key: string; value: string }

// GET — fetch current env vars for an app
export async function GET(
  _req: Request,
  { params }: { params: { name: string } }
) {
  const session = await auth();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const config = await prisma.appConfig.findUnique({
    where: { appName: params.name }
  });

  const envVars: EnvEntry[] = config ? JSON.parse(config.envVars) : [];
  return NextResponse.json(envVars);
}

// PATCH — update env vars and restart container
export async function PATCH(
  req: Request,
  { params }: { params: { name: string } }
) {
  const session = await auth();
  if (!hasRole(session, 'developer')) {
    return new Response('Forbidden', { status: 403 });
  }

  const envVars: EnvEntry[] = await req.json();

  // Validate: no empty keys, no duplicate keys
  const keys = envVars.map(e => e.key.trim()).filter(Boolean);
  if (new Set(keys).size !== keys.length) {
    return NextResponse.json({ error: 'Duplicate keys' }, { status: 400 });
  }

  // Save to DB
  await prisma.appConfig.upsert({
    where: { appName: params.name },
    update: { envVars: JSON.stringify(envVars) },
    create: { appName: params.name, envVars: JSON.stringify(envVars) }
  });

  // Restart container with new env vars
  try {
    const container = docker.getContainer(params.name);
    const info = await container.inspect();

    // Stop & remove old container
    await container.remove({ force: true });

    // Recreate with same image + new env
    const newContainer = await docker.createContainer({
      Image: info.Config.Image,
      name: params.name,
      Env: envVars.map(e => `${e.key}=${e.value}`),
      HostConfig: info.HostConfig,
    });
    await newContainer.start();
  } catch (err: any) {
    // Container might not exist yet — that's fine, env is saved for next deploy
    if (!err.statusCode || err.statusCode !== 404) throw err;
  }

  return NextResponse.json({ ok: true });
}
```

### Component

**`components/env-vars-editor.tsx`**

```typescript
'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, Plus, Trash2, Save } from 'lucide-react';

interface EnvEntry { key: string; value: string; masked?: boolean }

export function EnvVarsEditor({ appName }: { appName: string }) {
  const [entries, setEntries] = useState<EnvEntry[]>([]);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load on mount
  useEffect(() => {
    fetch(`/api/docker/apps/${appName}/env`)
      .then(r => r.json())
      .then(setEntries);
  }, [appName]);

  const addRow = () => setEntries(e => [...e, { key: '', value: '' }]);
  const removeRow = (i: number) => setEntries(e => e.filter((_, idx) => idx !== i));
  const update = (i: number, field: 'key' | 'value', val: string) =>
    setEntries(e => e.map((entry, idx) => idx === i ? { ...entry, [field]: val } : entry));
  const toggleReveal = (i: number) =>
    setRevealed(s => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; });

  const save = async () => {
    setSaving(true);
    await fetch(`/api/docker/apps/${appName}/env`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entries.filter(e => e.key.trim())),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 text-xs font-medium text-muted-foreground px-1">
        <span>KEY</span><span>VALUE</span><span /><span />
      </div>

      {entries.map((entry, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-center">
          <Input
            value={entry.key}
            onChange={e => update(i, 'key', e.target.value)}
            placeholder="KEY"
            className="font-mono text-sm"
          />
          <Input
            type={revealed.has(i) ? 'text' : 'password'}
            value={entry.value}
            onChange={e => update(i, 'value', e.target.value)}
            placeholder="value"
            className="font-mono text-sm"
          />
          <Button size="icon" variant="ghost" onClick={() => toggleReveal(i)}>
            {revealed.has(i) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
          <Button size="icon" variant="ghost" onClick={() => removeRow(i)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}

      <div className="flex gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={addRow}>
          <Plus className="h-4 w-4 mr-1" /> Add variable
        </Button>
        <Button size="sm" onClick={save} disabled={saving}>
          <Save className="h-4 w-4 mr-1" />
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save & Restart'}
        </Button>
      </div>
    </div>
  );
}
```

---

## Part 2: One-Click App Templates

### Purpose
Pre-configured templates for popular self-hosted apps. User picks a template, it fills the "Run Container" form with the correct image, ports, and env vars. One step from template → running service.

### Template Definitions

**`lib/templates.ts`**

```typescript
export interface AppTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;           // emoji or URL
  category: 'cms' | 'dev' | 'media' | 'productivity' | 'database';
  image: string;          // Docker image:tag
  ports: Record<string, [{ HostPort: string }]>;
  env: Array<{ key: string; value: string; description?: string }>;
  volumes?: string[];     // host:container mount paths
  docs?: string;          // documentation URL
}

export const TEMPLATES: AppTemplate[] = [
  {
    id: 'ghost',
    name: 'Ghost CMS',
    description: 'Modern publishing platform for blogs and newsletters',
    icon: '👻',
    category: 'cms',
    image: 'ghost:5-alpine',
    ports: { '2368/tcp': [{ HostPort: '2368' }] },
    env: [
      { key: 'url', value: 'http://localhost:2368', description: 'Public URL of your Ghost blog' },
      { key: 'NODE_ENV', value: 'production' }
    ],
  },
  {
    id: 'gitea',
    name: 'Gitea',
    description: 'Lightweight self-hosted Git service',
    icon: '🐙',
    category: 'dev',
    image: 'gitea/gitea:latest',
    ports: {
      '3000/tcp': [{ HostPort: '3000' }],
      '22/tcp': [{ HostPort: '222' }]
    },
    env: [
      { key: 'GITEA__database__DB_TYPE', value: 'sqlite3' },
      { key: 'GITEA__database__PATH', value: '/data/gitea/gitea.db' }
    ],
  },
  {
    id: 'nextcloud',
    name: 'Nextcloud',
    description: 'Self-hosted file sync, calendar, and collaboration',
    icon: '☁️',
    category: 'productivity',
    image: 'nextcloud:stable-apache',
    ports: { '80/tcp': [{ HostPort: '8080' }] },
    env: [
      { key: 'NEXTCLOUD_ADMIN_USER', value: 'admin', description: 'Initial admin username' },
      { key: 'NEXTCLOUD_ADMIN_PASSWORD', value: 'changeme', description: 'Change this!' },
    ],
  },
  {
    id: 'uptime-kuma',
    name: 'Uptime Kuma',
    description: 'Self-hosted monitoring tool for your services',
    icon: '📊',
    category: 'dev',
    image: 'louislam/uptime-kuma:1',
    ports: { '3001/tcp': [{ HostPort: '3001' }] },
    env: [],
  },
  {
    id: 'vaultwarden',
    name: 'Vaultwarden',
    description: 'Lightweight Bitwarden-compatible password manager',
    icon: '🔐',
    category: 'productivity',
    image: 'vaultwarden/server:latest',
    ports: { '80/tcp': [{ HostPort: '8081' }] },
    env: [
      { key: 'ADMIN_TOKEN', value: '', description: 'Set a strong random token' },
      { key: 'SIGNUPS_ALLOWED', value: 'false' }
    ],
  },
  {
    id: 'n8n',
    name: 'n8n',
    description: 'Workflow automation — connects 400+ services',
    icon: '⚡',
    category: 'productivity',
    image: 'n8nio/n8n:latest',
    ports: { '5678/tcp': [{ HostPort: '5678' }] },
    env: [
      { key: 'N8N_BASIC_AUTH_ACTIVE', value: 'true' },
      { key: 'N8N_BASIC_AUTH_USER', value: 'admin' },
      { key: 'N8N_BASIC_AUTH_PASSWORD', value: 'changeme' }
    ],
  },
  {
    id: 'redis',
    name: 'Redis',
    description: 'In-memory data structure store, cache, and message broker',
    icon: '🟥',
    category: 'database',
    image: 'redis:7-alpine',
    ports: { '6379/tcp': [{ HostPort: '6379' }] },
    env: [],
  },
  {
    id: 'postgres',
    name: 'PostgreSQL',
    description: 'Advanced open-source relational database',
    icon: '🐘',
    category: 'database',
    image: 'postgres:16-alpine',
    ports: { '5432/tcp': [{ HostPort: '5432' }] },
    env: [
      { key: 'POSTGRES_USER', value: 'postgres' },
      { key: 'POSTGRES_PASSWORD', value: 'changeme', description: 'Change this!' },
      { key: 'POSTGRES_DB', value: 'mydb' }
    ],
  },
];

export const CATEGORIES = ['all', 'cms', 'dev', 'media', 'productivity', 'database'] as const;
```

### Template Gallery Component

**`components/template-gallery.tsx`**

```typescript
'use client';
import { useState } from 'react';
import { TEMPLATES, CATEGORIES, type AppTemplate } from '@/lib/templates';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface Props {
  /** Called when user clicks Deploy — fills parent form with template config */
  onSelect?: (template: AppTemplate) => void;
}

export function TemplateGallery({ onSelect }: Props) {
  const [category, setCategory] = useState<string>('all');
  const [preview, setPreview] = useState<AppTemplate | null>(null);

  const filtered = category === 'all'
    ? TEMPLATES
    : TEMPLATES.filter(t => t.category === category);

  return (
    <div className="space-y-4">
      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(cat => (
          <Button
            key={cat}
            size="sm"
            variant={category === cat ? 'default' : 'outline'}
            onClick={() => setCategory(cat)}
            className="capitalize"
          >
            {cat}
          </Button>
        ))}
      </div>

      {/* Template grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(t => (
          <Card
            key={t.id}
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => setPreview(t)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{t.icon}</span>
                <div>
                  <CardTitle className="text-base">{t.name}</CardTitle>
                  <Badge variant="secondary" className="text-xs capitalize">{t.category}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-xs line-clamp-2">{t.description}</CardDescription>
              <p className="text-xs font-mono text-muted-foreground mt-2">{t.image}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Preview/deploy dialog */}
      {preview && (
        <Dialog open onOpenChange={() => setPreview(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="text-2xl">{preview.icon}</span> {preview.name}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">{preview.description}</p>

              <div>
                <p className="font-medium mb-1">Image</p>
                <code className="bg-muted px-2 py-1 rounded text-xs">{preview.image}</code>
              </div>

              <div>
                <p className="font-medium mb-1">Ports</p>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(preview.ports).map(([container, [{ HostPort }]]) => (
                    <Badge key={container} variant="outline">
                      {HostPort} → {container.replace('/tcp', '')}
                    </Badge>
                  ))}
                </div>
              </div>

              {preview.env.length > 0 && (
                <div>
                  <p className="font-medium mb-1">Environment variables</p>
                  <div className="space-y-1">
                    {preview.env.map(e => (
                      <div key={e.key} className="flex gap-2 text-xs">
                        <code className="font-mono bg-muted px-1 rounded">{e.key}</code>
                        <span className="text-muted-foreground">{e.description ?? e.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setPreview(null)}>Cancel</Button>
              <Button onClick={() => { onSelect?.(preview); setPreview(null); }}>
                Deploy {preview.name}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
```

### Wiring to RunContainerCard

In `components/run-container-card.tsx`, import `TemplateGallery` and add state:

```typescript
const [selectedTemplate, setSelectedTemplate] = useState<AppTemplate | null>(null);

// When template selected, pre-fill form fields:
const handleTemplateSelect = (template: AppTemplate) => {
  setSelectedTemplate(template);
  setContainerName(template.id);
  setImage(template.image);
  setEnvVars(template.env);
  // ... set port binding state
};

// Add tab switcher: "Custom" | "Templates"
// Show <TemplateGallery onSelect={handleTemplateSelect} /> in Templates tab
```
