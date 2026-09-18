'use client';

import { useState } from 'react';
import { ImagePlus } from 'lucide-react';
import type { Editor } from '@tiptap/react';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { AuthFetch } from '@/features/budgets/api/budget-management.api';
import { uploadProcedureAsset } from '../api/procedures.api';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editor: Editor;
  procedureId: string;
  authFetch: AuthFetch;
};

export function ProcedureMediaInsertDialog({
  open,
  onOpenChange,
  editor,
  procedureId,
  authFetch,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isImage = file?.type.startsWith('image/') ?? false;
  const isPdf = file?.type === 'application/pdf';

  const reset = () => {
    setFile(null);
    setAlt('');
    setError(null);
    setPending(false);
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const submit = async () => {
    if (!file) {
      setError('Choisissez un fichier image ou PDF.');
      return;
    }
    if (isImage && !alt.trim()) {
      setError('Le texte alternatif est obligatoire pour une image.');
      return;
    }
    setPending(true);
    setError(null);
    try {
      const asset = await uploadProcedureAsset(authFetch, procedureId, file);
      if (isImage) {
        editor
          .chain()
          .focus()
          .insertContent({
            type: 'procedureImage',
            attrs: { assetId: asset.id, alt: alt.trim() },
          })
          .run();
      } else {
        editor
          .chain()
          .focus()
          .insertContent({
            type: 'procedureFile',
            attrs: {
              assetId: asset.id,
              label: asset.label || file.name.replace(/\.[^.]+$/, ''),
            },
          })
          .run();
      }
      handleClose(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Échec de l’upload');
    } finally {
      setPending(false);
    }
  };

  return (
    <StariumModal
      open={open}
      onOpenChange={handleClose}
      size="sm"
      icon={ImagePlus}
      title="Insérer un média"
      description="Image (PNG, JPEG, WebP, GIF) ou PDF. Texte alternatif obligatoire pour les images."
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 sm:min-h-9"
            onClick={() => handleClose(false)}
            disabled={pending}
          >
            Annuler
          </Button>
          <Button
            type="button"
            className="min-h-11 sm:min-h-9"
            onClick={() => void submit()}
            disabled={pending || !file || (isImage && !alt.trim())}
          >
            {pending ? 'Envoi…' : 'Insérer'}
          </Button>
        </>
      }
    >
      <div className="starium-form space-y-4">
        {error ? (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <div className="starium-form-field">
          <Label htmlFor="procedure-media-file" className="starium-form-label">
            Fichier
          </Label>
          <Input
            id="procedure-media-file"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
            className="starium-form-input min-h-11"
            onChange={(e) => {
              const next = e.target.files?.[0] ?? null;
              setFile(next);
              setError(null);
              if (next && !next.type.startsWith('image/')) {
                setAlt('');
              }
            }}
          />
          {file && !isImage && !isPdf ? (
            <p className="text-sm text-muted-foreground" role="status">
              Type non supporté côté client — l’API refusera aussi.
            </p>
          ) : null}
        </div>
        {isImage ? (
          <div className="starium-form-field">
            <Label htmlFor="procedure-media-alt" className="starium-form-label">
              Texte alternatif
            </Label>
            <Input
              id="procedure-media-alt"
              className="starium-form-input min-h-11"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              aria-required
              aria-invalid={Boolean(error && !alt.trim())}
              placeholder="Décrivez l’image pour l’accessibilité"
            />
          </div>
        ) : null}
      </div>
    </StariumModal>
  );
}
