'use client';

import { useRef, useState } from 'react';
import { FileType2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import {
  CONTRACT_ATTACHMENT_INPUT_ACCEPT,
  isAcceptedContractAttachmentFile,
} from '../lib/contract-attachment-accept';

function formatPickSize(bytes: number): string {
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} Mo`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${bytes} o`;
}

/**
 * Zone déposer / parcourir pour un fichier contrat (PDF, PNG, JPEG) — même esprit que le panneau GED procurement.
 */
export function ContractAttachmentFilePicker(props: {
  id: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
  /** Incrémenter pour réinitialiser l’input fichier (ex. après envoi). */
  inputKey?: number;
}) {
  const { id, file, onFileChange, disabled, inputKey = 0 } = props;
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const pick = (f: File | null) => {
    if (!f) {
      onFileChange(null);
      return;
    }
    if (!isAcceptedContractAttachmentFile(f)) {
      toast.error('Format non accepté (PDF, PNG, JPEG).');
      return;
    }
    onFileChange(f);
  };

  const openPicker = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium text-foreground">
        Fichier
      </Label>
      <input
        key={inputKey}
        ref={inputRef}
        id={id}
        type="file"
        accept={CONTRACT_ATTACHMENT_INPUT_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        disabled={disabled}
        onChange={(e) => {
          pick(e.target.files?.[0] ?? null);
          e.target.value = '';
        }}
      />
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const next = e.relatedTarget;
          if (next instanceof Node && e.currentTarget.contains(next)) return;
          setIsDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(false);
          if (disabled) return;
          const f = e.dataTransfer.files?.[0];
          if (f) pick(f);
        }}
        className={cn(
          'rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors',
          disabled
            ? 'cursor-not-allowed border-muted-foreground/20 bg-muted/20 opacity-60'
            : isDragging
              ? 'border-primary bg-primary/[0.06]'
              : 'border-muted-foreground/30 bg-muted/20 hover:border-primary/35',
        )}
      >
        {file ? (
          <div className="space-y-3">
            <FileType2
              className="mx-auto size-9 text-muted-foreground/70"
              strokeWidth={1.25}
              aria-hidden
            />
            <p className="truncate text-sm font-medium text-foreground" title={file.name}>
              {file.name}
            </p>
            <p className="text-xs text-muted-foreground">{formatPickSize(file.size)}</p>
            {!disabled ? (
              <div className="flex flex-wrap justify-center gap-2 pt-1">
                <Button type="button" variant="outline" size="sm" onClick={openPicker}>
                  Choisir un autre fichier
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => pick(null)}>
                  Retirer
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <>
            <Upload
              className="mx-auto mb-2 size-9 text-muted-foreground/70"
              strokeWidth={1.25}
              aria-hidden
            />
            <p className="text-sm font-medium text-foreground">Déposez un fichier ou parcourez</p>
            <p className="mt-1 text-xs text-muted-foreground">
              PDF, PNG ou JPEG — taille max. selon politique serveur (souvent 15&nbsp;Mo).
            </p>
            {!disabled ? (
              <Button type="button" variant="secondary" className="mt-4" onClick={openPicker}>
                Parcourir…
              </Button>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
