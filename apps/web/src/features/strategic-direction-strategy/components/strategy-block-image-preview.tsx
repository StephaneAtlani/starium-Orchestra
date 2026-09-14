'use client';

import { useEffect } from 'react';
import { useStrategicDirectionStrategyDocumentPreview } from '../hooks/use-strategic-direction-strategy-queries';
import { displayLabel } from '@/lib/display-label';
import { LoadingState } from '@/components/feedback/loading-state';

export function StrategyBlockImagePreview({
  strategyId,
  documentId,
  alt,
}: {
  strategyId: string;
  documentId: string;
  alt: string;
}) {
  const previewQ = useStrategicDirectionStrategyDocumentPreview(strategyId, documentId);

  useEffect(() => {
    const url = previewQ.data;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [previewQ.data]);

  if (previewQ.isLoading) return <LoadingState />;
  if (previewQ.isError || !previewQ.data) {
    return (
      <div className="stg-drop">
        {displayLabel(alt, 'Aperçu indisponible')}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={previewQ.data}
      alt={displayLabel(alt, 'Schéma')}
      className="max-h-80 w-full rounded-md object-contain"
    />
  );
}
