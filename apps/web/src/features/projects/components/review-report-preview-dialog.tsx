'use client';

import { Eye } from 'lucide-react';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { LoadingState } from '@/components/feedback/loading-state';
import { Button } from '@/components/ui/button';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  error: string | null;
  preview: {
    subject: string;
    title: string;
    text: string;
    html: string;
  } | null;
};

export function ReviewReportPreviewDialog({
  open,
  onOpenChange,
  loading,
  error,
  preview,
}: Props) {
  return (
    <StariumModal
      open={open}
      onOpenChange={onOpenChange}
      title="Prévisualisation du compte rendu"
      description="Aperçu du contenu qui sera envoyé par e-mail aux participants."
      icon={Eye}
      size="xl"
      contentClassName="flex max-h-[min(92vh,860px)] flex-col gap-0 overflow-hidden p-3 sm:p-4"
      bodyClassName="min-h-0 flex-1 overflow-y-auto py-2"
      footer={
        <Button type="button" variant="outline" className="min-h-11" onClick={() => onOpenChange(false)}>
          Fermer
        </Button>
      }
    >
      {loading ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            Génération de l&apos;aperçu…
          </p>
          <LoadingState rows={3} />
        </div>
      ) : error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : preview ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Objet du message :{' '}
            <span className="font-medium text-foreground">{preview.subject}</span>
          </p>
          <div
            className="overflow-hidden rounded-xl border border-border/70 bg-white shadow-sm [&_a]:underline [&_a:hover]:opacity-80"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: preview.html }}
            aria-label="Contenu du compte rendu"
          />
          <details className="rounded-lg border border-border/60 bg-card p-3 text-xs">
            <summary className="cursor-pointer font-medium text-foreground">
              Version texte brut
            </summary>
            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-muted-foreground">
              {preview.text}
            </pre>
          </details>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground" role="status">
          Aucun aperçu disponible.
        </p>
      )}
    </StariumModal>
  );
}
