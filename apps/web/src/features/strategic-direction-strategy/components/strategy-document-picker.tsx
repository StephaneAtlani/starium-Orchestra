'use client';

import { useRef } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { displayLabel } from '@/lib/display-label';
import { toast } from '@/lib/toast';
import {
  useStrategicDirectionStrategyDocumentsQuery,
  useUploadStrategicDirectionStrategyDocumentMutation,
} from '../hooks/use-strategic-direction-strategy-queries';

const ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,application/pdf';

export function StrategyDocumentPicker({
  strategyId,
  value,
  onLinkDocument,
  disabled,
  id = 'stg-document-picker',
  label = 'Document du schéma',
  enableUpload = true,
}: {
  strategyId: string;
  value?: string | null;
  onLinkDocument: (documentId: string, document?: { name?: string | null }) => void;
  disabled?: boolean;
  id?: string;
  label?: string;
  enableUpload?: boolean;
}) {
  const documentsQuery = useStrategicDirectionStrategyDocumentsQuery(strategyId);
  const upload = useUploadStrategicDirectionStrategyDocumentMutation(strategyId);
  const fileRef = useRef<HTMLInputElement>(null);

  const options = (documentsQuery.data ?? []).filter((d) => d.status === 'ACTIVE');

  const onFile = async (file: File | null) => {
    if (!file || !enableUpload) return;
    if (!ACCEPT.split(',').some((t) => file.type === t || file.type.startsWith('image/'))) {
      toast.error('Formats acceptés : PNG, JPEG, WebP, GIF, PDF.');
      return;
    }
    try {
      const created = await upload.mutateAsync(file);
      onLinkDocument(created.id, created);
      toast.success('Document joint.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload impossible.');
    }
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
            if (next) {
              const picked = options.find((d) => d.id === next);
              onLinkDocument(next, picked);
            }
          }}
          aria-label={label}
        >
          <option value="">— Choisir un document —</option>
          {options.map((doc) => (
            <option key={doc.id} value={doc.id}>
              {displayLabel(doc.name, 'Document sans titre')}
              {doc.mimeType ? ` (${doc.mimeType.replace('image/', '')})` : ''}
            </option>
          ))}
        </select>
      </div>
      {enableUpload ? (
        <div>
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
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
            {upload.isPending ? 'Upload…' : 'Joindre un fichier'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
