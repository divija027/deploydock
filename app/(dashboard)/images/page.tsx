'use client';
import { useEffect, useState } from 'react';
import { DashboardHeader } from '@/components/dashboard-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Trash2, RefreshCw, Images, Search, AlertTriangle } from 'lucide-react';
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
  const [filter, setFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<DockerImage | null>(null);

  const fetchImages = async () => {
    try {
      const res = await fetch('/api/docker/images');
      if (res.ok) setImages(await res.json());
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchImages(); }, []);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteTarget(null);
    await fetch(`/api/docker/images/${encodeURIComponent(deleteTarget.Id)}`, { method: 'DELETE' });
    fetchImages();
  };

  const filtered = filter
    ? images.filter(img =>
        (img.RepoTags ?? []).some(tag => tag.toLowerCase().includes(filter.toLowerCase()))
      )
    : images;

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="container mx-auto p-4 md:p-6">
        <div className="animate-fade-in-up">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Images className="h-6 w-6 text-primary" /> Docker Images
              </h1>
              <p className="text-muted-foreground text-sm mt-1">{images.length} image{images.length !== 1 ? 's' : ''} on this host</p>
            </div>
            <Button variant="outline" size="icon" onClick={fetchImages}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          <div className="relative max-w-sm mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter images..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="pl-9"
            />
          </div>

          {loading ? (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Image</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[1, 2, 3, 4, 5].map(i => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : filtered.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Images className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-medium">
                {filter ? 'No matching images' : 'No images found'}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {filter ? 'Try a different search term' : 'Pull an image to get started'}
              </p>
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Image</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(img => (
                      <TableRow key={img.Id}>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1">
                            {(img.RepoTags ?? ['<none>']).map(tag => (
                              <Badge key={tag} variant="secondary" className="font-mono text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatSize(img.Size)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDistanceToNow(img.Created * 1000, { addSuffix: true })}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{img.Id.slice(7, 19)}</TableCell>
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-destructive h-8 w-8"
                                onClick={() => setDeleteTarget(img)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete image</TooltipContent>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Delete confirmation dialog */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Delete Image?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove{' '}
                <span className="font-semibold text-foreground">
                  {(deleteTarget?.RepoTags ?? ['<none>'])[0]}
                </span>
                {deleteTarget && (
                  <span> ({formatSize(deleteTarget.Size)})</span>
                )}
                . You will need to pull it again from Docker Hub if you need it later.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={confirmDelete}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
