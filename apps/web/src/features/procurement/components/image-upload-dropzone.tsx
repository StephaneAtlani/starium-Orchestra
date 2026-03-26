'use client';

import { ImagePlus, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ImageUploadDropzoneProps = {
  id: string;
  title: string;
  helperText?: string;
  previewUrl: string | null;
  onFileSelected: (file: File | null) => void;
  onRemove?: () => void;
  disabled?: boolean;
};

export function ImageUploadDropzone({
  id,
  title,
  helperText,
  previewUrl,
  onFileSelected,
  onRemove,
  disabled,
}: ImageUploadDropzoneProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {title}
      </label>
      <input
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        disabled={disabled}
        onChange={(event) => {
          const next = event.target.files?.[0] ?? null;
          onFileSelected(next);
          event.target.value = '';
        }}
      />
      <label
        htmlFor={id}
        onDragOver={(event) => {
          event.preventDefault();
          if (disabled) return;
        }}
        onDrop={(event) => {
          event.preventDefault();
          if (disabled) return;
          const dropped = event.dataTransfer.files?.[0] ?? null;
          onFileSelected(dropped);
        }}
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/80 bg-muted/30 p-4 text-center transition hover:border-primary/50 hover:bg-muted/50"
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- object URL local preview
          <img
            src={previewUrl}
            alt="Aperçu logo"
            className="h-20 w-20 rounded-lg border border-border/70 object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-border/70 bg-background">
            <ImagePlus className="size-6 text-muted-foreground" />
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Upload className="size-3.5" />
          <span>Glisse-dépose une image ou clique pour choisir</span>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {helperText ?? 'JPEG, PNG, WebP ou GIF - 2 Mo max'}
        </p>
      </label>
      {onRemove ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={onRemove}
          className="h-7 px-2 text-xs"
        >
          <Trash2 className="mr-1 size-3.5" />
          Supprimer le logo
        </Button>
      ) : null}
    </div>
  );
}
