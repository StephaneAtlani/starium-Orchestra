'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  Cloud,
  FileText,
  Info,
  Layers,
  Lightbulb,
  RefreshCw,
  Send,
  Shield,
  X,
} from 'lucide-react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LoadingState } from '@/components/feedback/loading-state';
import { ErrorState } from '@/components/feedback/error-state';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { useAuth } from '@/context/auth-context';
import { toast } from '@/lib/toast';
import { displayLabel } from '@/lib/display-label';
import { cn } from '@/lib/utils';
import {
  createProjectRequest,
  getProjectRequest,
  previewCircuit,
  submitProjectRequest,
  updateProjectRequest,
  type ComputedCircuitDto,
} from '../api/project-requests.api';
import {
  formatBudgetKEuro,
  PROJECT_REQUEST_TYPE_META,
  PROJECT_REQUEST_TYPE_OPTIONS,
  typeLabel,
} from '../lib/project-request-display';
import { PROJECT_REQUEST_PRIORITY_LABELS } from '../constants/project-request-labels';
import '../styles/demandes.css';

const TYPE_ICONS = {
  TRANSFORMATION: Layers,
  INFRASTRUCTURE: Cloud,
  REGULATORY: Shield,
  PRODUCT: Lightbulb,
  EVOLUTION: RefreshCw,
} as const;

type FormState = {
  type: string;
  title: string;
  requestingDirection: string;
  sponsorLabel: string;
  businessContext: string;
  objectivesText: string;
  expectedBenefits: string;
  estimatedBudget: string;
  estimatedEffortDays: string;
  desiredDeadline: string;
  priorityRequested: 'HIGH' | 'MEDIUM' | 'LOW';
};

const EMPTY_FORM: FormState = {
  type: 'TRANSFORMATION',
  title: '',
  requestingDirection: '',
  sponsorLabel: '',
  businessContext: '',
  objectivesText: '',
  expectedBenefits: '',
  estimatedBudget: '',
  estimatedEffortDays: '',
  desiredDeadline: '',
  priorityRequested: 'MEDIUM',
};

function buildPayload(form: FormState) {
  const budgetRaw = form.estimatedBudget.trim().replace(/\s/g, '').replace(',', '.');
  const budget = budgetRaw ? Number.parseFloat(budgetRaw) : 0;
  const effortRaw = form.estimatedEffortDays.trim().replace(/\s/g, '').replace(',', '.');
  const effort = effortRaw ? Number.parseFloat(effortRaw) : undefined;
  const objectives = form.objectivesText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  return {
    title: form.title.trim(),
    type: form.type,
    requestingDirection: form.requestingDirection.trim(),
    sponsorLabel: form.sponsorLabel.trim() || undefined,
    businessContext: form.businessContext.trim() || undefined,
    objectives,
    expectedBenefits: form.expectedBenefits.trim() || undefined,
    estimatedBudget: Number.isFinite(budget) ? budget : 0,
    estimatedEffortDays:
      effort != null && Number.isFinite(effort) ? effort : undefined,
    desiredDeadline: form.desiredDeadline || undefined,
    priorityRequested: form.priorityRequested,
  };
}

export function ProjectRequestFormPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const { user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [createdId, setCreatedId] = useState<string | null>(editId);

  const editQuery = useQuery({
    queryKey: ['project-request', clientId, editId],
    queryFn: () => getProjectRequest(authFetch, editId!),
    enabled: !!clientId && !!editId,
  });

  useEffect(() => {
    if (!editQuery.data) return;
    const d = editQuery.data;
    setCreatedId(d.id);
    setForm({
      type: d.type ?? 'TRANSFORMATION',
      title: d.title ?? '',
      requestingDirection: d.requestingDirection ?? '',
      sponsorLabel: d.sponsorLabel ?? '',
      businessContext: d.businessContext ?? d.description ?? '',
      objectivesText: (d.objectives ?? []).join('\n'),
      expectedBenefits: d.expectedBenefits ?? '',
      estimatedBudget:
        d.estimatedBudget != null ? String(d.estimatedBudget) : '',
      estimatedEffortDays:
        d.estimatedEffortDays != null ? String(d.estimatedEffortDays) : '',
      desiredDeadline: d.desiredDeadline
        ? d.desiredDeadline.slice(0, 10)
        : '',
      priorityRequested:
        (d.priorityRequested as FormState['priorityRequested']) ?? 'MEDIUM',
    });
  }, [editQuery.data]);

  const requesterName = useMemo(() => {
    if (!user) return 'Vous';
    const full = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
    return displayLabel(full || user.email, 'Vous');
  }, [user]);

  const budgetNum = useMemo(() => {
    const raw = form.estimatedBudget.trim().replace(/\s/g, '').replace(',', '.');
    if (!raw) return 0;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : 0;
  }, [form.estimatedBudget]);

  const circuitQuery = useQuery({
    queryKey: ['project-request-preview-circuit', clientId, form.type, budgetNum],
    queryFn: () =>
      previewCircuit(authFetch, { type: form.type, budget: budgetNum }),
    enabled: !!clientId,
  });

  const circuit: ComputedCircuitDto | undefined = circuitQuery.data;

  const saveMutation = useMutation({
    mutationFn: async (submit: boolean) => {
      const payload = buildPayload(form);
      let row;
      if (createdId) {
        row = await updateProjectRequest(authFetch, createdId, payload);
      } else {
        row = await createProjectRequest(authFetch, payload);
        setCreatedId(row.id);
      }
      if (submit) {
        row = await submitProjectRequest(authFetch, row.id);
      }
      return { row, submit };
    },
    onSuccess: async ({ row, submit }) => {
      await qc.invalidateQueries({ queryKey: ['project-requests', clientId] });
      await qc.invalidateQueries({
        queryKey: ['project-requests-summary', clientId],
      });
      await qc.invalidateQueries({
        queryKey: ['project-request', clientId, row.id],
      });
      if (submit) {
        toast.success(`Demande « ${row.title} » soumise`);
      } else {
        toast.success(`Demande « ${row.title} » enregistrée en brouillon`);
      }
      router.push(`/projects/requests/${row.id}`);
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message ?? 'Enregistrement impossible.');
    },
  });

  const validate = (): boolean => {
    if (!form.title.trim()) {
      toast.error('Donnez un intitulé à la demande');
      return false;
    }
    if (!form.requestingDirection.trim()) {
      toast.error('Indiquez la direction demandeuse');
      return false;
    }
    return true;
  };

  const handleSave = (submit: boolean) => {
    if (!validate()) return;
    saveMutation.mutate(submit);
  };

  if (editId && editQuery.isLoading) {
    return (
      <RequireActiveClient>
        <PageContainer>
          <LoadingState rows={8} />
        </PageContainer>
      </RequireActiveClient>
    );
  }

  if (editId && editQuery.error) {
    return (
      <RequireActiveClient>
        <PageContainer>
          <ErrorState
            message="Impossible de charger la demande à modifier."
            onRetry={() => void editQuery.refetch()}
          />
        </PageContainer>
      </RequireActiveClient>
    );
  }

  return (
    <RequireActiveClient>
      <PageContainer>
        <PageHeader
          title={editId ? 'Modifier la demande' : 'Nouvelle demande de projet'}
          description={
            editId
              ? displayLabel(editQuery.data?.referenceCode, 'Brouillon')
              : 'Décrivez le besoin : le circuit de validation est déduit du type et du budget estimé.'
          }
          actions={
            <Link
              href={
                editId ? `/projects/requests/${editId}` : '/projects/requests'
              }
              className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                'min-h-11 sm:min-h-9',
              )}
            >
              <X className="mr-2 size-4" aria-hidden />
              Annuler
            </Link>
          }
        />

        <div className="dem-root">
          <div className="dem-form-grid">
            <div className="dem-dossier">
              <section className="dem-sec" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
                <h2 className="dem-sec-t">Nature de la demande</h2>
                <div
                  className="dem-type-grid"
                  role="radiogroup"
                  aria-label="Type de demande"
                >
                  {PROJECT_REQUEST_TYPE_OPTIONS.map((type) => {
                    const meta = PROJECT_REQUEST_TYPE_META[type];
                    const Icon = TYPE_ICONS[type as keyof typeof TYPE_ICONS];
                    const selected = form.type === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        className={cn('dem-typecard', selected && 'is-sel')}
                        onClick={() => setForm((f) => ({ ...f, type }))}
                      >
                        <span
                          className={cn(
                            'dem-typecard-ico',
                            meta.iconBg,
                            meta.iconFg,
                          )}
                        >
                          <Icon aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="dem-typecard-name">{meta.label}</span>
                          <span className="dem-typecard-desc">
                            {meta.description}
                          </span>
                        </span>
                        <span className="dem-typecard-check" aria-hidden>
                          <Check />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="dem-sec">
                <h2 className="dem-sec-t">Identification</h2>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="pr-title">
                      Intitulé de la demande{' '}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="pr-title"
                      value={form.title}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, title: e.target.value }))
                      }
                      placeholder="Ex. : Portail fournisseurs self-care"
                      className="min-h-11 sm:min-h-9"
                      required
                    />
                  </div>
                  <div className="dem-field-grid-2">
                    <div className="space-y-2">
                      <Label htmlFor="pr-dir">
                        Direction demandeuse{' '}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="pr-dir"
                        value={form.requestingDirection}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            requestingDirection: e.target.value,
                          }))
                        }
                        placeholder="Direction Achats"
                        className="min-h-11 sm:min-h-9"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pr-who">Demandeur</Label>
                      <Input
                        id="pr-who"
                        value={requesterName}
                        readOnly
                        className="min-h-11 sm:min-h-9"
                        aria-readonly
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pr-sponsor">Sponsor pressenti</Label>
                    <Input
                      id="pr-sponsor"
                      value={form.sponsorLabel}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, sponsorLabel: e.target.value }))
                      }
                      placeholder="Marc Delaunay — DSI"
                      className="min-h-11 sm:min-h-9"
                    />
                  </div>
                </div>
              </section>

              <section className="dem-sec">
                <h2 className="dem-sec-t">Besoin &amp; objectifs</h2>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="pr-need">Situation actuelle et besoin</Label>
                    <Textarea
                      id="pr-need"
                      rows={4}
                      value={form.businessContext}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          businessContext: e.target.value,
                        }))
                      }
                      placeholder="Décrivez le problème constaté, ses impacts et son origine."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pr-obj">Objectifs visés — un par ligne</Label>
                    <Textarea
                      id="pr-obj"
                      rows={3}
                      value={form.objectivesText}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          objectivesText: e.target.value,
                        }))
                      }
                      placeholder="Réduire le délai de traitement de 5 à 1 jour"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pr-benef">Bénéfices attendus</Label>
                    <Textarea
                      id="pr-benef"
                      rows={2}
                      value={form.expectedBenefits}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          expectedBenefits: e.target.value,
                        }))
                      }
                      placeholder="Gains quantifiés, conformité, réduction de risque…"
                    />
                  </div>
                </div>
              </section>

              <section className="dem-sec">
                <h2 className="dem-sec-t">Cadrage estimatif</h2>
                <div className="space-y-3">
                  <div className="dem-field-grid-3">
                    <div className="space-y-2">
                      <Label htmlFor="pr-budget">
                        Budget estimé (€){' '}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="pr-budget"
                        type="number"
                        step={5000}
                        min={0}
                        value={form.estimatedBudget}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            estimatedBudget: e.target.value,
                          }))
                        }
                        placeholder="120000"
                        className="min-h-11 sm:min-h-9"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pr-charge">Charge interne (j·h)</Label>
                      <Input
                        id="pr-charge"
                        type="number"
                        min={0}
                        value={form.estimatedEffortDays}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            estimatedEffortDays: e.target.value,
                          }))
                        }
                        placeholder="120"
                        className="min-h-11 sm:min-h-9"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pr-deadline">Échéance souhaitée</Label>
                      <Input
                        id="pr-deadline"
                        type="date"
                        value={form.desiredDeadline}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            desiredDeadline: e.target.value,
                          }))
                        }
                        className="min-h-11 sm:min-h-9"
                      />
                    </div>
                  </div>
                  <div>
                    <p className="mb-2.5 text-sm font-medium" id="pr-prio-label">
                      Priorité demandée
                    </p>
                    <div
                      className="dem-type-pills"
                      role="radiogroup"
                      aria-labelledby="pr-prio-label"
                    >
                      {(
                        [
                          ['HIGH', PROJECT_REQUEST_PRIORITY_LABELS.HIGH],
                          ['MEDIUM', PROJECT_REQUEST_PRIORITY_LABELS.MEDIUM],
                          ['LOW', PROJECT_REQUEST_PRIORITY_LABELS.LOW],
                        ] as const
                      ).map(([value, label]) => {
                        const selected = form.priorityRequested === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            className={cn(
                              'dem-type-pill',
                              selected && 'is-sel',
                            )}
                            onClick={() =>
                              setForm((f) => ({
                                ...f,
                                priorityRequested: value,
                              }))
                            }
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="dem-form-actions">
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 sm:min-h-9"
                    disabled={saveMutation.isPending}
                    onClick={() => handleSave(false)}
                  >
                    <FileText className="mr-2 size-4" aria-hidden />
                    Enregistrer en brouillon
                  </Button>
                  <Button
                    type="button"
                    className="min-h-11 sm:min-h-9"
                    disabled={saveMutation.isPending}
                    onClick={() => handleSave(true)}
                  >
                    <Send className="mr-2 size-4" aria-hidden />
                    Soumettre la demande
                  </Button>
                </div>
              </section>
            </div>

            <aside className="dem-prev" aria-live="polite">
              <p className="dem-prev-k">Circuit qui sera appliqué</p>
              {circuitQuery.isLoading && !circuit ? (
                <LoadingState rows={3} />
              ) : circuit ? (
                <>
                  <div className="dem-jrn">
                    {circuit.steps.map((step, i) => (
                      <div key={step.key} className="dem-jrn-i">
                        <div
                          className={cn('dem-jrn-d', i === 0 && 'is-head')}
                          aria-hidden
                        />
                        <div className="dem-jrn-b">
                          <div className="dem-jrn-t">{step.label}</div>
                          <div className="dem-jrn-m">{step.actorHint}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="dem-prev-row">
                    <span className="k">Type</span>
                    <span className="v">{typeLabel(form.type)}</span>
                  </div>
                  <div className="dem-prev-row">
                    <span className="k">Budget estimé</span>
                    <span className="v">
                      {budgetNum ? formatBudgetKEuro(budgetNum) : '—'}
                    </span>
                  </div>
                  <div className="dem-prev-row">
                    <span className="k">Cycle de pilotage</span>
                    <span
                      className={cn(
                        'v',
                        circuit.needsCycle
                          ? 'text-[color:var(--brand-gold-700)]'
                          : undefined,
                      )}
                    >
                      {circuit.needsCycle
                        ? `Requis · ${circuit.instance ?? 'COPIL'}`
                        : 'Non requis'}
                    </span>
                  </div>
                  <div className="dem-note">
                    <Info aria-hidden />
                    <span>
                      {circuit.needsCycle
                        ? `Au-delà de ${formatBudgetKEuro(circuit.copilThresholdAmount)}, la demande est arbitrée en ${circuit.instance ?? 'COPIL'} avant création du projet.`
                        : `En dessous du seuil${circuit.exemptRequestTypes.includes(form.type) ? ' ou pour un type exempté' : ''}, le PMO valide sans passer en comité.`}
                    </span>
                  </div>
                </>
              ) : (
                <p className="dem-body is-muted">
                  Aperçu indisponible pour le moment.
                </p>
              )}
            </aside>
          </div>
        </div>
      </PageContainer>
    </RequireActiveClient>
  );
}
