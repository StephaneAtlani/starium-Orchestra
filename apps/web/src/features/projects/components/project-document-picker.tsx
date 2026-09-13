'use client';

import { useMemo, useRef, useState } from 'react';
import { Link2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { displayLabel } from '@/lib/display-label';
import { toast } from '@/lib/toast';
import { useProjectDocumentMutations } from '../hooks/use-project-document-mutations';
import { useProjectDocumentsQuery } from '../hooks/use-project-documents-query';
import {
  isAcceptedProjectDocumentFile,
  PROJECT_DOCUMENT_INPUT_ACCEPT,
  projectDocumentTypeLabel,
} from '../lib/project-document-accept';

export type ProjectDocumentPickerProps = {
  projectId: string;
  value?: string | null;
  onLinkDocument: (documentId: string) => void;
  onLinkExternalUrl?: (url: string, title: string) => void;
  /** Si true, propose upload puis appelle onLinkDocument avec le nouvel id. */
  enableUpload?: boolean;
  excludeIds?: string[];
  disabled?: boolean;
  id?: string;
  label?: string;
};

/**
 * Picker silo documents projet — libellés métier uniquement (RFC-PROJ-DOC-002).
 */
export function ProjectDocumentPicker({
  projectId,
  value,
  onLinkDocument,
  onLinkExternalUrl,
  enableUpload = false,
  excludeIds,
  disabled,
  id = 'project-document-picker',
  label = 'Document du projet',
}: ProjectDocumentPickerProps) {
  const documentsQuery = useProjectDocumentsQuery(projectId);
  const { upload } = useProjectDocumentMutations(projectId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [externalUrl, setExternalUrl] = useState('');
  const [externalTitle, setExternalTitle] = useState('');

  const options = useMemo(() => {
    const exclude = new Set(excludeIds ?? []);
    return (documentsQuery.data ?? []).filter(
      (d) => d.status === 'ACTIVE' && !exclude.has(d.id),
    );
  }, [documentsQuery.data, excludeIds]);

  const onFile = async (file: File | null) => {
    if (!file || !enableUpload) return;
    if (!isAcceptedProjectDocumentFile(file)) {
      toast.error(
        'Format non accepté. Pour Figma, collez un lien externe.',
      );
      return;
    }
    const created = await upload.mutateAsync({ file });
    onLinkDocument(created.id);
  };

  const submitExternal = () => {
    if (!onLinkExternalUrl) return;
    const url = externalUrl.trim();
    if (!url) {
      toast.error('Collez une URL.');
      return;
    }
    try {
      // eslint-disable-next-line no-new
      new URL(url);
    } catch {
      toast.error('URL invalide.');
      return;
    }
    onLinkExternalUrl(url, externalTitle.trim() || url);
    setExternalUrl('');
    setExternalTitle('');
  };

  return (
    <div className="space-y-3">
      <div className="starium-form-field">
        <Label htmlFor={id}>{label}</Label>
        <select
          id={id}
          className="starium-form-select min-h-11 w-full"
          value={value ?? ''}
          disabled={disabled || documentsQuery.isLoading}
          onChange={(e) => {
            const next = e.target.value;
            if (next) onLinkDocument(next);
          }}
        >
          <option value="">— Choisir un document —</option>
          {options.map((doc) => {
            const name = displayLabel(doc.name, 'Document sans titre');
            const type = projectDocumentTypeLabel(doc);
            return (
              <option key={doc.id} value={doc.id}>
                {name} ({type})
              </option>
            );
          })}
        </select>
      </div>

      {enableUpload ? (
        <div>
          <input
            ref={fileRef}
            type="file"
            accept={PROJECT_DOCUMENT_INPUT_ACCEPT}
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            disabled={disabled || upload.isPending}
            onChange={(e) => {
              void onFile(e.target.files?.[0] ?? null);
              e.target.value = '';
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full sm:min-h-9"
            disabled={disabled || upload.isPending}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="size-4" aria-hidden />
            {upload.isPending ? 'Upload…' : 'Joindre un fichier maintenant'}
          </Button>
        </div>
      ) : null}

      {onLinkExternalUrl ? (
        <div className="space-y-2 rounded-lg border border-border/70 p-3">
          <p className="text-xs font-medium text-muted-foreground">
            Ou coller un lien externe
          </p>
          <Input
            className="min-h-11"
            placeholder="Titre (optionnel)"
            value={externalTitle}
            onChange={(e) => setExternalTitle(e.target.value)}
            disabled={disabled}
            aria-label="Titre du lien externe"
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              className="min-h-11 flex-1"
              type="url"
              placeholder="https://…"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              disabled={disabled}
              aria-label="URL externe"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  submitExternal();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="min-h-11 sm:min-h-9"
              disabled={disabled}
              onClick={submitExternal}
            >
              <Link2 className="size-4" aria-hidden />
              Lier
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
