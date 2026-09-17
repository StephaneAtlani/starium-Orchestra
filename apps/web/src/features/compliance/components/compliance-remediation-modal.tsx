'use client';

import { ListChecks } from 'lucide-react';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/feedback/empty-state';
import type { ComplianceFrameworkOverviewRequirementApi } from '../api/compliance.api';
import { ComplianceStatusDisplay } from './compliance-status-display';
import { displayLabel } from '@/lib/display-label';

export function ComplianceRemediationModal({
  open,
  onOpenChange,
  frameworkLabel,
  items,
  onEvaluate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  frameworkLabel: string;
  items: ComplianceFrameworkOverviewRequirementApi[];
  onEvaluate: (requirementId: string) => void;
}) {
  return (
    <StariumModal
      open={open}
      onOpenChange={onOpenChange}
      title="Plan de remédiation"
      description={`Écarts et partiels — ${frameworkLabel}`}
      icon={ListChecks}
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
      {items.length === 0 ? (
        <EmptyState
          title="Aucun écart ouvert"
          description="Les exigences partielles ou en écart apparaîtront ici."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead>
              <tr className="border-b border-border/70 text-xs text-muted-foreground">
                <th className="py-2 pr-3 font-semibold">Réf.</th>
                <th className="py-2 pr-3 font-semibold">Exigence</th>
                <th className="py-2 pr-3 font-semibold">État</th>
                <th className="py-2 font-semibold">
                  <span className="sr-only">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-b border-border/50">
                  <td className="py-2.5 pr-3 font-mono text-xs font-semibold text-muted-foreground">
                    {displayLabel(row.code, 'Code')}
                  </td>
                  <td className="py-2.5 pr-3 font-medium text-foreground">
                    {displayLabel(row.title, 'Exigence')}
                  </td>
                  <td className="py-2.5 pr-3">
                    <ComplianceStatusDisplay status={row.status} />
                  </td>
                  <td className="py-2.5 text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-h-11 sm:min-h-9"
                      onClick={() => {
                        onEvaluate(row.id);
                        onOpenChange(false);
                      }}
                    >
                      Évaluer
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </StariumModal>
  );
}
