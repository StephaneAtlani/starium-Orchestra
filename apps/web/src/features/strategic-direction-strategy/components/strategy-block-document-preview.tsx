'use client';

import { Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/feedback/loading-state';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { displayLabel } from '@/lib/display-label';
import { toast } from '@/lib/toast';
import { downloadStrategicDirectionStrategyDocument } from '../api/strategic-direction-strategy.api';
import { useStrategicDirectionStrategyDocumentsQuery } from '../hooks/use-strategic-direction-strategy-queries';

function formatBytes(size: number | null | undefined): string {
  if (size == null || size <= 0) return '';
  if (size >= 1_000_000) return `${(size / 1_000_000).toFixed(1).replace('.', ',')} Mo`;
  if (size >= 1000) return `${Math.round(size / 1000)} ko`;
  return `${size} o`;
}

export function StrategyBlockDocumentPreview({
  strategyId,
  documentId,
  title,
  description,
}: {
  strategyId: string;
  documentId: string;
  title: string;
  description?: string;
}) {
  const authFetch = useAuthenticatedFetch();
  const documentsQuery = useStrategicDirectionStrategyDocumentsQuery(strategyId);
  const doc = documentsQuery.data?.find((d) => d.id === documentId);

  const handleDownload = async () => {
    try {
      const blob = await downloadStrategicDirectionStrategyDocument(
        authFetch,
        strategyId,
        documentId,
      );
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = displayLabel(
        doc?.originalFilename ?? doc?.name,
        'Document',
      );
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Téléchargement impossible.');
    }
  };

  if (documentsQuery.isLoading) {
    return <LoadingState />;
  }

  const label = displayLabel(doc?.name ?? doc?.originalFilename, title || 'Document');
  const meta = [doc?.mimeType?.replace('application/', ''), formatBytes(doc?.sizeBytes)]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="stg-doc-block flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <div
          className="flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-muted/50 text-muted-foreground"
          aria-hidden
        >
          <FileText className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{label}</p>
          {meta ? <p className="text-xs text-muted-foreground">{meta}</p> : null}
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{description}</p>
          ) : null}
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        className="min-h-11 shrink-0"
        onClick={(e) => {
          e.stopPropagation();
          void handleDownload();
        }}
      >
        <Download className="size-4" aria-hidden />
        Télécharger
      </Button>
    </div>
  );
}
