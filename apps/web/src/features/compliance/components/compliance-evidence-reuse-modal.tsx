'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Recycle } from 'lucide-react';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/feedback/empty-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { ErrorState } from '@/components/feedback/error-state';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { displayLabel, firstDisplayLabel } from '@/lib/display-label';
import { cn } from '@/lib/utils';
import {
  searchComplianceEvidence,
  type ComplianceEvidenceSearchHitApi,
} from '../api/compliance.api';
import { complianceEvidenceKindLabel } from '../lib/compliance-evidence-display';

export function ComplianceEvidenceReuseModal({
  open,
  onOpenChange,
  requirementId,
  pending,
  onReuse,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requirementId: string;
  pending: boolean;
  onReuse: (sourceEvidenceId: string) => void;
}) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const searchQ = useQuery({
    queryKey: ['compliance', 'evidence-search', clientId, requirementId, q],
    queryFn: () =>
      searchComplianceEvidence(authFetch, {
        q: q.trim() || undefined,
        excludeRequirementId: requirementId,
      }),
    enabled: open && Boolean(clientId) && Boolean(requirementId),
  });

  const hits = searchQ.data ?? [];

  return (
    <StariumModal
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setSelectedId(null);
          setQ('');
        }
        onOpenChange(next);
      }}
      title="Réutiliser une preuve"
      description="Copie les métadonnées d’une preuve existante vers cette exigence."
      icon={Recycle}
      size="lg"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 sm:min-h-9"
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
          <Button
            type="button"
            className="min-h-11 sm:min-h-9"
            disabled={!selectedId || pending}
            onClick={() => selectedId && onReuse(selectedId)}
          >
            {pending ? 'Copie…' : 'Réutiliser'}
          </Button>
        </>
      }
    >
      <div className="starium-form space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="ev-reuse-q">Rechercher</Label>
          <Input
            id="ev-reuse-q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Titre, description…"
            className="min-h-11"
          />
        </div>

        {searchQ.isLoading ? <LoadingState rows={3} /> : null}
        {searchQ.isError ? (
          <ErrorState
            message={
              searchQ.error instanceof Error
                ? searchQ.error.message
                : 'Recherche impossible.'
            }
            onRetry={() => void searchQ.refetch()}
          />
        ) : null}
        {!searchQ.isLoading && !searchQ.isError && hits.length === 0 ? (
          <EmptyState
            title="Aucune preuve trouvée"
            description="Élargissez la recherche ou créez une nouvelle preuve."
          />
        ) : null}
        {!searchQ.isLoading && !searchQ.isError && hits.length > 0 ? (
          <ul
            className="flex max-h-64 flex-col gap-2 overflow-y-auto"
            role="listbox"
            aria-label="Preuves réutilisables"
          >
            {hits.map((hit) => (
              <EvidenceReuseRow
                key={hit.id}
                hit={hit}
                selected={selectedId === hit.id}
                onSelect={() => setSelectedId(hit.id)}
              />
            ))}
          </ul>
        ) : null}
      </div>
    </StariumModal>
  );
}

function EvidenceReuseRow({
  hit,
  selected,
  onSelect,
}: {
  hit: ComplianceEvidenceSearchHitApi;
  selected: boolean;
  onSelect: () => void;
}) {
  const reqLabel = firstDisplayLabel(
    [
      hit.requirementCode
        ? `${hit.requirementCode} — ${hit.requirementTitle}`
        : hit.requirementTitle,
    ],
    'Exigence',
  );
  return (
    <li>
      <button
        type="button"
        role="option"
        aria-selected={selected}
        onClick={onSelect}
        className={cn(
          'flex min-h-11 w-full flex-col gap-0.5 rounded-[var(--radius-md)] border-[1.5px] px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
          selected
            ? 'border-[color:var(--brand-gold)] bg-[color:var(--brand-gold-050)]'
            : 'border-border bg-card hover:bg-muted/40',
        )}
      >
        <span className="truncate text-sm font-bold text-foreground">
          {displayLabel(hit.name, 'Preuve')}
        </span>
        <span className="truncate text-[11.5px] text-muted-foreground">
          {complianceEvidenceKindLabel(hit.kind)} · {reqLabel}
        </span>
      </button>
    </li>
  );
}
