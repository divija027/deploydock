'use client';

import { useState } from 'react';
import { Check, ChevronsUpDown, Loader2, Package, Clock, HardDrive } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { POPULAR_IMAGES, POPULAR_CATEGORIES } from '@/lib/popular-images';
import type { ImageSummary } from '@/types/docker';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

interface ImageComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  mode: 'registry' | 'local';
  localImages?: ImageSummary[];
  loading?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export function ImageCombobox({
  value,
  onValueChange,
  mode,
  localImages = [],
  loading = false,
  placeholder,
  disabled = false,
}: ImageComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const defaultPlaceholder = mode === 'registry'
    ? 'Browse popular images or type any name...'
    : 'Select a downloaded image...';

  // Build the set of known values for detecting custom input
  const knownValues = mode === 'registry'
    ? POPULAR_IMAGES.map(i => `${i.name}:${i.tag}`)
    : localImages.flatMap(img => (img.RepoTags ?? []).filter(t => !t.includes('<none>')));

  const showCustomOption = search.length > 0 && !knownValues.some(
    v => v.toLowerCase() === search.toLowerCase()
  );

  // Flatten local images into tag entries with metadata
  const localEntries = localImages.flatMap(img =>
    (img.RepoTags ?? [])
      .filter(tag => !tag.includes('<none>'))
      .map(tag => ({ tag, size: img.Size, created: img.Created }))
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full h-10 justify-between font-normal',
            !value && 'text-muted-foreground',
          )}
        >
          <span className="truncate">
            {value || (placeholder ?? defaultPlaceholder)}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="p-0"
        style={{ width: 'var(--radix-popover-trigger-width)' }}
        align="start"
      >
        <Command shouldFilter={true}>
          <CommandInput
            placeholder={mode === 'registry' ? 'Search images...' : 'Search local images...'}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {mode === 'registry'
                ? 'No matching images — type any image:tag to pull'
                : 'No images found — pull one first!'}
            </CommandEmpty>

            {/* Custom value option */}
            {showCustomOption && (
              <CommandGroup>
                <CommandItem
                  value={`custom-entry:${search}`}
                  keywords={[search]}
                  onSelect={() => {
                    onValueChange(search);
                    setSearch('');
                    setOpen(false);
                  }}
                >
                  <Package className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>
                    Use <span className="font-semibold">&quot;{search}&quot;</span>
                  </span>
                </CommandItem>
              </CommandGroup>
            )}

            {/* Registry mode: popular images grouped by category */}
            {mode === 'registry' && POPULAR_CATEGORIES.map(category => (
              <CommandGroup key={category} heading={category}>
                {POPULAR_IMAGES
                  .filter(img => img.category === category)
                  .map(img => {
                    const fullName = `${img.name}:${img.tag}`;
                    const isSelected = value === fullName;
                    return (
                      <CommandItem
                        key={fullName}
                        value={fullName}
                        keywords={[img.name, img.tag, img.description, img.category]}
                        onSelect={() => {
                          onValueChange(fullName);
                          setSearch('');
                          setOpen(false);
                        }}
                      >
                        <Check className={cn('mr-2 h-4 w-4 shrink-0', isSelected ? 'opacity-100' : 'opacity-0')} />
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-baseline gap-1">
                            <span className="font-medium">{img.name}</span>
                            <span className="text-xs text-muted-foreground">:{img.tag}</span>
                          </div>
                          <span className="text-xs text-muted-foreground truncate">{img.description}</span>
                        </div>
                      </CommandItem>
                    );
                  })}
              </CommandGroup>
            ))}

            {/* Local mode: downloaded images */}
            {mode === 'local' && loading && (
              <CommandGroup heading="Local Images">
                <CommandItem disabled>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading images...
                </CommandItem>
              </CommandGroup>
            )}

            {mode === 'local' && !loading && localEntries.length > 0 && (
              <CommandGroup heading="Downloaded Images">
                {localEntries.map(entry => {
                  const isSelected = value === entry.tag;
                  return (
                    <CommandItem
                      key={entry.tag}
                      value={entry.tag}
                      onSelect={() => {
                        onValueChange(entry.tag);
                        setSearch('');
                        setOpen(false);
                      }}
                    >
                      <Check className={cn('mr-2 h-4 w-4 shrink-0', isSelected ? 'opacity-100' : 'opacity-0')} />
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="font-mono text-sm">{entry.tag}</span>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(entry.created * 1000, { addSuffix: true })}
                          </span>
                          <span className="flex items-center gap-1">
                            <HardDrive className="h-3 w-3" />
                            {formatSize(entry.size)}
                          </span>
                        </div>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
