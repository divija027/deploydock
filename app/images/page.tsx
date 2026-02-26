'use client';
import { useEffect, useState } from 'react';
import { DashboardHeader } from '@/components/dashboard-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, RefreshCw, Images } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface DockerImage {
  Id: string;
  RepoTags: string[] | null;
  Size: number;
  Created: number;
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export default function ImagesPage() {
  const [images, setImages] = useState<DockerImage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchImages = async () => {
    try {
      const res = await fetch('/api/docker/images');
      if (res.ok) setImages(await res.json());
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchImages(); }, []);

  const deleteImage = async (id: string) => {
    await fetch(`/api/docker/images/${encodeURIComponent(id)}`, { method: 'DELETE' });
    fetchImages();
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="container mx-auto p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Images className="h-6 w-6" /> Docker Images
            </h1>
            <p className="text-muted-foreground text-sm">{images.length} images on this host</p>
          </div>
          <Button variant="outline" size="icon" onClick={fetchImages}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : (
          <div className="space-y-2">
            {images.map(img => (
              <Card key={img.Id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      {(img.RepoTags ?? ['<none>']).map(tag => (
                        <Badge key={tag} variant="secondary" className="font-mono text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                      <span>{formatSize(img.Size)}</span>
                      <span>{formatDistanceToNow(img.Created * 1000, { addSuffix: true })}</span>
                      <span className="font-mono">{img.Id.slice(7, 19)}</span>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => deleteImage(img.Id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
