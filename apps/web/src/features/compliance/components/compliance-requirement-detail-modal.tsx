'use client';

import { useQuery } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/feedback/loading-state';
import { ErrorState } from '@/components/feedback/error-state';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { displayLabel } from '@/lib/display-label';
import { PROJECT_RISK_CRITICALITY_LABEL } from '@/features/projects/constants/project-enum-labels';
import {
  getComplianceRequirementDetail,
  type ComplianceRequirementRowApi,
} from '../api/compliance.api';
import { frameworkDisplayLabel } from '../lib/compliance-labels';
import { ComplianceStatusDisplay } from './compliance-status-display';

export function ComplianceRequirementDetailModal({
  open,
  onOpenChange,
  requirementId,
  preview,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requirementId: string | null;
  /** Ligne liste — titre immédiat avant le fetch détail. */
  preview?: Pick<
    ComplianceRequirementRowApi,
    'code' | 'title' | 'framework'
  > | null;
}) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  const q = useQuery({
    queryKey: ['compliance', 'requirement', clientId, requirementId],
    queryFn: () => getComplianceRequirementDetail(authFetch, requirementId!),
    enabled: open && Boolean(clientId) && Boolean(requirementId),
  });

  const titleCode = displayLabel(
    q.data?.requirement.code ?? preview?.code,
    'Exigence',
  );
  const titleLabel = displayLabel(
    q.data?.requirement.title ?? preview?.title,
    'Détail de l’exigence',
  );
  const frameworkLabel = preview
    ? frameworkDisplayLabel(preview.framework)
    : q.data?.requirement.framework
      ? frameworkDisplayLabel(q.data.requirement.framework)
      : null;

  return (
    <StariumModal
      open={open}
      onOpenChange={onOpenChange}
      title={titleLabel}
      description={
        frameworkLabel
          ? `${titleCode} · ${frameworkLabel}`
          : titleCode
      }
      icon={ShieldCheck}
      size="lg"
      footer={
        <Button
          type="button"
          variant="outline"
          className="min-h-11 sm:min-h-9"
          onClick={() => onOpenChange(false)}
        >
          Fermer
        </Button>
      }
    >
      {q.isLoading ? (
        <LoadingState rows={4} />
      ) : q.isError ? (
        <ErrorState
          message={
            q.error instanceof Error
              ? q.error.message
              : 'Impossible de charger l’exigence.'
          }
          onRetry={() => void q.refetch()}
        />
      ) : q.data ? (
        <div className="starium-form space-y-5">
          {q.data.requirement.description ? (
            <section>
              <h3 className="starium-modal-seg-title">Description</h3>
              <p className="text-sm leading-relaxed text-foreground">
                {q.data.requirement.description}
              </p>
            </section>
          ) : null}

          <section>
            <h3 className="starium-modal-seg-title">État d’évaluation</h3>
            <div className="space-y-2">
              <ComplianceStatusDisplay
                status={q.data.status?.status ?? 'NOT_ASSESSED'}
              />
              {q.data.status?.comment ? (
                <p className="text-sm text-muted-foreground">
                  {q.data.status.comment}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aucun commentaire d’analyse.
                </p>
              )}
            </div>
          </section>

          <section>
            <h3 className="starium-modal-seg-title">
              Preuves ({q.data.evidences.length})
            </h3>
            {q.data.evidences.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune preuve jointe.</p>
            ) : (
              <ul className="space-y-2">
                {q.data.evidences.map((e) => (
                  <li
                    key={e.id}
                    className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-foreground">
                      {displayLabel(e.name, 'Preuve')}
                    </span>
                    {e.url ? (
                      <>
                        {' '}
                        <a
                          href={e.url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-[color:var(--brand-gold-700)] underline-offset-4 hover:underline"
                        >
                          Ouvrir le lien
                        </a>
                      </>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="starium-modal-seg-title">
              Risques projet liés ({q.data.linkedRiskCount})
            </h3>
            {q.data.linkedRisks.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun risque lié.</p>
            ) : (
              <ul className="space-y-2">
                {q.data.linkedRisks.map((r) => (
                  <li
                    key={r.code}
                    className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-sm"
                  >
                    <div className="font-medium text-foreground">
                      {displayLabel(r.title, 'Risque')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {displayLabel(r.code, 'Code risque')}
                      {' · '}
                      {displayLabel(
                        PROJECT_RISK_CRITICALITY_LABEL[r.criticalityLevel],
                        'Criticité non renseignée',
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : (
        <p className="text-sm text-destructive" role="alert">
          Exigence introuvable.
        </p>
      )}
    </StariumModal>
  );
}
