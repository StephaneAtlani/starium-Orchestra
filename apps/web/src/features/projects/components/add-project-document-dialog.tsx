'use client';

import { useRef, useState } from 'react';
import { FilePlus2, Link2, Upload } from 'lucide-react';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { PROJECT_DOCUMENT_CATEGORY_LABEL } from '../constants/project-enum-labels';
import { useProjectDocumentMutations } from '../hooks/use-project-document-mutations';
import {
  isAcceptedProjectDocumentFile,
  PROJECT_DOCUMENT_INPUT_ACCEPT,
} from '../lib/project-document-accept';
import type { ProjectDocumentCategory } from '../types/project.types';

type Mode = 'upload' | 'link';

type Props = {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AddProjectDocumentDialog({ projectId, open, onOpenChange }: Props) {
  const { upload, createExternal } = useProjectDocumentMutations(projectId);
  const [mode, setMode] = useState<Mode>('upload');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProjectDocumentCategory>('GENERAL');
  const [description, setDescription] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [inputKey, setInputKey] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const pending = upload.isPending || createExternal.isPending;

  const reset = () => {
    setMode('upload');
    setName('');
    setCategory('GENERAL');
    setDescription('');
    setExternalUrl('');
    setFile(null);
    setInputKey((k) => k + 1);
  };

  const pickFile = (f: File | null) => {
    if (!f) {
      setFile(null);
      return;
    }
    if (!isAcceptedProjectDocumentFile(f)) {
      toast.error(
        'Format non accepté (PDF, Office, images, texte, CSV, ZIP). Pour Figma, utilisez un lien.',
      );
      return;
    }
    setFile(f);
    if (!name.trim()) setName(f.name.replace(/\.[^.]+$/, ''));
  };

  const submit = async () => {
    if (mode === 'upload') {
      if (!file) {
        toast.error('Sélectionnez un fichier.');
        return;
      }
      await upload.mutateAsync({
        file,
        name: name.trim() || undefined,
        category,
        description: description.trim() || undefined,
      });
    } else {
      const url = externalUrl.trim();
      if (!url) {
        toast.error('L’URL est obligatoire.');
        return;
      }
      if (!name.trim()) {
        toast.error('Le nom du document est obligatoire.');
        return;
      }
      try {
        // eslint-disable-next-line no-new
        new URL(url);
      } catch {
        toast.error('URL invalide.');
        return;
      }
      await createExternal.mutateAsync({
        name: name.trim(),
        storageType: 'EXTERNAL',
        externalUrl: url,
        category,
        description: description.trim() || undefined,
      });
    }
    reset();
    onOpenChange(false);
  };

  return (
    <StariumModal
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
      title="Ajouter un document"
      description="Déposez un fichier dans le silo projet ou rattachez un lien externe."
      icon={FilePlus2}
      size="md"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 sm:min-h-9"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
          <Button
            type="button"
            className="min-h-11 sm:min-h-9"
            disabled={pending}
            onClick={() => void submit()}
          >
            {pending ? 'Enregistrement…' : 'Ajouter'}
          </Button>
        </>
      }
    >
      <div className="starium-form space-y-4">
        <div
          className="starium-tab-group inline-flex w-full gap-1 rounded-xl bg-muted/90 p-1"
          role="tablist"
          aria-label="Mode d’ajout"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'upload'}
            className={cn(
              'starium-tab-btn min-h-11 flex-1 rounded-lg px-3 text-sm font-medium sm:min-h-9',
              mode === 'upload' && 'bg-background shadow-sm',
            )}
            onClick={() => setMode('upload')}
          >
            Fichier
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'link'}
            className={cn(
              'starium-tab-btn min-h-11 flex-1 rounded-lg px-3 text-sm font-medium sm:min-h-9',
              mode === 'link' && 'bg-background shadow-sm',
            )}
            onClick={() => setMode('link')}
          >
            Lien externe
          </button>
        </div>

        {mode === 'upload' ? (
          <div className="space-y-2">
            <Label htmlFor="proj-doc-file">Fichier</Label>
            <input
              key={inputKey}
              ref={inputRef}
              id="proj-doc-file"
              type="file"
              accept={PROJECT_DOCUMENT_INPUT_ACCEPT}
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              disabled={pending}
              onChange={(e) => {
                pickFile(e.target.files?.[0] ?? null);
                e.target.value = '';
              }}
            />
            <div
              className={cn(
                'flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/80 bg-muted/30 px-4 py-8 text-center',
                dragging && 'border-primary bg-muted/50',
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                pickFile(e.dataTransfer.files?.[0] ?? null);
              }}
            >
              <Upload className="size-5 text-muted-foreground" aria-hidden />
              <p className="text-sm text-muted-foreground">
                {file
                  ? file.name
                  : 'Glissez un fichier ou parcourez (PDF, Office, images…).'}
              </p>
              <p className="text-xs text-muted-foreground">
                Pour Figma ou un fichier non listé, utilisez un lien externe.
              </p>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 sm:min-h-9"
                disabled={pending}
                onClick={() => inputRef.current?.click()}
              >
                Parcourir
              </Button>
            </div>
          </div>
        ) : (
          <div className="starium-form-field">
            <Label htmlFor="proj-doc-url">
              <span className="inline-flex items-center gap-1.5">
                <Link2 className="size-3.5" aria-hidden />
                URL
              </span>
            </Label>
            <Input
              id="proj-doc-url"
              type="url"
              className="starium-form-input min-h-11"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder="https://…"
              disabled={pending}
            />
          </div>
        )}

        <div className="starium-form-field">
          <Label htmlFor="proj-doc-name">Nom</Label>
          <Input
            id="proj-doc-name"
            className="starium-form-input min-h-11"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={pending}
          />
        </div>

        <div className="starium-form-field">
          <Label htmlFor="proj-doc-cat">Catégorie</Label>
          <select
            id="proj-doc-cat"
            className="starium-form-select min-h-11 w-full"
            value={category}
            onChange={(e) => setCategory(e.target.value as ProjectDocumentCategory)}
            disabled={pending}
          >
            {Object.entries(PROJECT_DOCUMENT_CATEGORY_LABEL).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="starium-form-field">
          <Label htmlFor="proj-doc-desc">Description (optionnel)</Label>
          <textarea
            id="proj-doc-desc"
            className="starium-form-textarea min-h-20 w-full"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={pending}
          />
        </div>
      </div>
    </StariumModal>
  );
}
