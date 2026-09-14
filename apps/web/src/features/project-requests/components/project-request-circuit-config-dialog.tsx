'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Info, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { LoadingState } from '@/components/feedback/loading-state';
import { ErrorState } from '@/components/feedback/error-state';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import {
  fetchWorkflowSettings,
  patchWorkflowSettings,
} from '../api/project-requests.api';
import {
  formatBudgetKEuro,
  PROJECT_REQUEST_TYPE_META,
  PROJECT_REQUEST_TYPE_OPTIONS,
} from '../lib/project-request-display';
import '../styles/demandes.css';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type FormState = {
  copilThresholdAmount: string;
  codirThresholdAmount: string;
  instructionSlaBusinessDays: string;
  requireN1Validation: boolean;
  requirePmoInstruction: boolean;
  autoCreateProjectOnApproval: boolean;
  exemptRequestTypes: string[];
};

const EMPTY: FormState = {
  copilThresholdAmount: '50000',
  codirThresholdAmount: '250000',
  instructionSlaBusinessDays: '10',
  requireN1Validation: true,
  requirePmoInstruction: true,
  autoCreateProjectOnApproval: false,
  exemptRequestTypes: ['REGULATORY'],
};

export function ProjectRequestCircuitConfigDialog({ open, onOpenChange }: Props) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(EMPTY);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['project-request-workflow-settings', clientId],
    queryFn: () => fetchWorkflowSettings(authFetch),
    enabled: !!clientId && open,
  });

  useEffect(() => {
    if (!data?.resolved || !open) return;
    const r = data.resolved;
    setForm({
      copilThresholdAmount: String(r.copilThresholdAmount ?? 50000),
      codirThresholdAmount: String(r.codirThresholdAmount ?? 250000),
      instructionSlaBusinessDays: String(r.instructionSlaBusinessDays ?? 10),
      requireN1Validation: r.requireN1Validation ?? true,
      requirePmoInstruction: r.requirePmoInstruction ?? true,
      autoCreateProjectOnApproval: r.autoCreateProjectOnApproval ?? false,
      exemptRequestTypes: [...(r.exemptRequestTypes ?? [])],
    });
  }, [data, open]);

  const mutation = useMutation({
    mutationFn: () =>
      patchWorkflowSettings(authFetch, {
        copilThresholdAmount: Number.parseFloat(form.copilThresholdAmount) || 0,
        codirThresholdAmount: Number.parseFloat(form.codirThresholdAmount) || 0,
        instructionSlaBusinessDays:
          Number.parseInt(form.instructionSlaBusinessDays, 10) || 10,
        requireN1Validation: form.requireN1Validation,
        requirePmoInstruction: form.requirePmoInstruction,
        autoCreateProjectOnApproval: form.autoCreateProjectOnApproval,
        exemptRequestTypes: form.exemptRequestTypes,
      }),
    onSuccess: (res) => {
      void qc.invalidateQueries({
        queryKey: ['project-request-workflow-settings', clientId],
      });
      void qc.invalidateQueries({ queryKey: ['project-requests', clientId] });
      void qc.invalidateQueries({
        queryKey: ['project-requests-summary', clientId],
      });
      const seuil = res.resolved.copilThresholdAmount ?? 0;
      toast.success(
        `Configuration enregistrée · passage en cycle à partir de ${formatBudgetKEuro(seuil)}`,
      );
      onOpenChange(false);
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message ?? 'Enregistrement impossible.');
    },
  });

  const toggleExempt = (type: string) => {
    setForm((f) => ({
      ...f,
      exemptRequestTypes: f.exemptRequestTypes.includes(type)
        ? f.exemptRequestTypes.filter((t) => t !== type)
        : [...f.exemptRequestTypes, type],
    }));
  };

  return (
    <StariumModal
      open={open}
      onOpenChange={onOpenChange}
      title="Configuration du circuit de demande"
      description="Détermine les étapes imposées et le déclenchement du passage en cycle de pilotage."
      icon={Settings2}
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
            disabled={mutation.isPending || isLoading}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Enregistrement…' : 'Enregistrer la configuration'}
          </Button>
        </>
      }
    >
      {isLoading ? (
        <LoadingState rows={4} />
      ) : error ? (
        <ErrorState
          message="Impossible de charger la configuration."
          onRetry={() => void refetch()}
        />
      ) : (
        <div className="dem-root starium-form space-y-5">
          <div className="dem-field-grid-3">
            <div className="starium-form-field space-y-2">
              <Label htmlFor="cfg-copil">Seuil COPIL (€)</Label>
              <Input
                id="cfg-copil"
                type="number"
                min={0}
                step={1000}
                value={form.copilThresholdAmount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, copilThresholdAmount: e.target.value }))
                }
              />
            </div>
            <div className="starium-form-field space-y-2">
              <Label htmlFor="cfg-codir">Seuil CODIR (€)</Label>
              <Input
                id="cfg-codir"
                type="number"
                min={0}
                step={1000}
                value={form.codirThresholdAmount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, codirThresholdAmount: e.target.value }))
                }
              />
            </div>
            <div className="starium-form-field space-y-2">
              <Label htmlFor="cfg-delai">Délai d&apos;instruction (j)</Label>
              <Input
                id="cfg-delai"
                type="number"
                min={1}
                max={365}
                value={form.instructionSlaBusinessDays}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    instructionSlaBusinessDays: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div>
            <p className="dem-sec-t">Étapes du circuit</p>
            {(
              [
                {
                  key: 'requireN1Validation' as const,
                  label: 'Validation hiérarchique (N+1)',
                  meta: 'Le responsable de la direction demandeuse valide avant instruction.',
                },
                {
                  key: 'requirePmoInstruction' as const,
                  label: 'Instruction par le PMO',
                  meta: 'Étude de faisabilité, chiffrage et alignement au schéma directeur.',
                },
                {
                  key: 'autoCreateProjectOnApproval' as const,
                  label: 'Création automatique du projet',
                  meta: 'Le projet est créé dès la validation, sans action manuelle du PMO.',
                },
              ] as const
            ).map((row) => (
              <div key={row.key} className="dem-cfg-row">
                <div className="dem-cfg-b">
                  <div className="dem-cfg-l">{row.label}</div>
                  <div className="dem-cfg-m">{row.meta}</div>
                </div>
                <Switch
                  checked={form[row.key]}
                  onCheckedChange={(v) =>
                    setForm((f) => ({ ...f, [row.key]: Boolean(v) }))
                  }
                  aria-label={row.label}
                />
              </div>
            ))}
          </div>

          <div>
            <p className="dem-sec-t">Types exemptés de cycle de pilotage</p>
            <div className="dem-pillrow" role="group" aria-label="Types exemptés">
              {PROJECT_REQUEST_TYPE_OPTIONS.map((type) => {
                const meta = PROJECT_REQUEST_TYPE_META[type];
                const selected = form.exemptRequestTypes.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    className={cn('dem-pill', selected && 'is-sel')}
                    aria-pressed={selected}
                    onClick={() => toggleExempt(type)}
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>
            <p className="dem-note">
              <Info aria-hidden />
              <span>
                Les demandes déjà engagées conservent leur historique ; le circuit
                restant est recalculé avec les nouvelles règles.
              </span>
            </p>
          </div>
        </div>
      )}
    </StariumModal>
  );
}
