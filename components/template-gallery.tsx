'use client';
import { useState } from 'react';
import { TEMPLATES, CATEGORIES, type AppTemplate } from '@/lib/templates';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface Props {
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
                  {Object.entries(preview.ports).map(([container, bindings]) => (
                    <Badge key={container} variant="outline">
                      {bindings[0].HostPort} -&gt; {container.replace('/tcp', '')}
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
