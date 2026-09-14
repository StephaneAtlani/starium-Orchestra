'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Check,
  ClipboardList,
  FileCheck2,
  Info,
  X,
} from 'lucide-react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { LoadingState } from '@/components/feedback/loading-state';
import { ErrorState } from '@/components/feedback/error-state';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { usePermissions } from '@/hooks/use-permissions';
import { toast } from '@/lib/toast';
import { displayLabel } from '@/lib/display-label';
import { cn } from '@/lib/utils';
import {
  agendaProjectRequest,
  committeeDecideProjectRequest,
  convertProjectRequest,
  getProjectRequest,
  instructProjectRequest,
  n1DecideProjectRequest,
  previewCircuit,
  reopenProjectRequest,
  submitProjectRequest,
  type ProjectRequestDto,
} from '../api/project-requests.api';
import {
  PROJECT_REQUEST_OPINION_LABELS,
  PROJECT_REQUEST_PRIORITY_LABELS,
} from '../constants/project-request-labels';
import {
  circuitStepVisualState,
  decisionPanelCopy,
  formatBudgetEuro,
  formatBudgetKEuro,
  formatProjectRequestDate,
  isCommitteeAuthor,
  natureLabel,
  natureShortLabel,
  personInitials,
  PROJECT_REQUEST_TYPE_META,
  statusBadgeClass,
  statusLabel,
} from '../lib/project-request-display';
import {
  resolvePortfolioCategoryColor,
  resolvePortfolioCategoryLucideIcon,
} from '@/features/projects/lib/project-portfolio-category-icons';
import '../styles/demandes.css';

type ModalKind = 'instruct' | 'agenda' | 'committee' | null;

export function ProjectRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const qc = useQueryClient();
  const { has } = usePermissions();
  const [modal, setModal] = useState<ModalKind>(null);

  const canUpdate =
    has('project_requests.create') || has('project_requests.update');
  const canValidate = has('project_requests.validate');
  const canInstruct =
    has('project_requests.instruct') || has('project_requests.route');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['project-request', clientId, id],
    queryFn: () => getProjectRequest(authFetch, id),
    enabled: !!clientId && !!id,
  });

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ['project-request', clientId, id] });
    await qc.invalidateQueries({ queryKey: ['project-requests', clientId] });
    await qc.invalidateQueries({
      queryKey: ['project-requests-summary', clientId],
    });
  };

  const submitMut = useMutation({
    mutationFn: () => submitProjectRequest(authFetch, id),
    onSuccess: async () => {
      await invalidate();
      toast.success('Demande soumise');
    },
    onError: (e: { message?: string }) =>
      toast.error(e.message ?? 'Soumission impossible.'),
  });

  const n1Mut = useMutation({
    mutationFn: (outcome: 'APPROVE' | 'REJECT') =>
      n1DecideProjectRequest(authFetch, id, { outcome }),
    onSuccess: async (_row, outcome) => {
      await invalidate();
      toast.success(
        outcome === 'APPROVE'
          ? 'Validation N+1 enregistrée'
          : 'Demande refusée par le N+1',
      );
    },
    onError: (e: { message?: string }) =>
      toast.error(e.message ?? 'Décision impossible.'),
  });

  const convertMut = useMutation({
    mutationFn: () => convertProjectRequest(authFetch, id),
    onSuccess: async (row) => {
      await invalidate();
      const name = row.convertedProjectSummary?.name;
      toast.success(
        name
          ? `Projet « ${name} » créé`
          : 'Projet créé à partir de la demande',
      );
    },
    onError: (e: { message?: string }) =>
      toast.error(e.message ?? 'Conversion impossible.'),
  });

  const reopenMut = useMutation({
    mutationFn: () => reopenProjectRequest(authFetch, id),
    onSuccess: async () => {
      await invalidate();
      toast.success('Demande rouverte pour complément de dossier');
    },
    onError: (e: { message?: string }) =>
      toast.error(e.message ?? 'Réouverture impossible.'),
  });

  const actions = useMemo(() => {
    if (!data) return [];
    const out: Array<{
      label: string;
      variant?: 'default' | 'outline' | 'destructive';
      onClick: () => void;
      disabled?: boolean;
    }> = [];

    if (data.status === 'DRAFT' || data.status === 'NEEDS_MORE_INFO') {
      if (canUpdate) {
        out.push({
          label: 'Modifier',
          variant: 'outline',
          onClick: () =>
            router.push(`/projects/requests/new?edit=${data.id}`),
        });
        out.push({
          label: 'Soumettre',
          onClick: () => submitMut.mutate(),
          disabled: submitMut.isPending,
        });
      }
    } else if (data.status === 'SUBMITTED' && canValidate) {
      out.push({
        label: 'Refuser',
        variant: 'outline',
        onClick: () => n1Mut.mutate('REJECT'),
        disabled: n1Mut.isPending,
      });
      out.push({
        label: 'Valider',
        onClick: () => n1Mut.mutate('APPROVE'),
        disabled: n1Mut.isPending,
      });
    } else if (data.status === 'IN_REVIEW' && canInstruct) {
      out.push({
        label: "Conclure l'instruction",
        onClick: () => setModal('instruct'),
      });
    } else if (data.status === 'IN_CYCLE' && canInstruct) {
      if (!data.meetingLabel) {
        out.push({
          label: "Inscrire à l'ordre du jour",
          onClick: () => setModal('agenda'),
        });
      } else {
        out.push({
          label: 'Enregistrer la décision',
          onClick: () => setModal('committee'),
        });
      }
    } else if (data.status === 'APPROVED' && canInstruct) {
      out.push({
        label: 'Créer le projet',
        onClick: () => convertMut.mutate(),
        disabled: convertMut.isPending,
      });
    } else if (
      data.status === 'CONVERTED_TO_PROJECT' &&
      data.convertedProjectSummary
    ) {
      out.push({
        label: 'Ouvrir le projet',
        onClick: () =>
          router.push(`/projects/${data.convertedProjectSummary!.id}`),
      });
    } else if (
      (data.status === 'REJECTED' || data.status === 'POSTPONED') &&
      canInstruct
    ) {
      out.push({
        label: 'Rouvrir la demande',
        onClick: () => reopenMut.mutate(),
        disabled: reopenMut.isPending,
      });
    }

    return out.slice(0, 2);
  }, [
    data,
    canUpdate,
    canValidate,
    canInstruct,
    router,
    submitMut,
    n1Mut,
    convertMut,
    reopenMut,
  ]);

  if (isLoading) {
    return (
      <RequireActiveClient>
        <PageContainer>
          <LoadingState rows={8} />
        </PageContainer>
      </RequireActiveClient>
    );
  }

  if (error || !data) {
    return (
      <RequireActiveClient>
        <PageContainer>
          <ErrorState
            message="Demande introuvable."
            onRetry={() => void refetch()}
          />
        </PageContainer>
      </RequireActiveClient>
    );
  }

  const cat = data.portfolioCategory;
  const typeMeta = data.type ? PROJECT_REQUEST_TYPE_META[data.type] : undefined;
  const accent = cat
    ? resolvePortfolioCategoryColor({
        color: cat.color,
        icon: cat.icon,
        categoryName: cat.name,
        parentName: cat.parentName,
        projectKind: 'PROJECT',
      })
    : null;
  const TypeIcon = cat
    ? resolvePortfolioCategoryLucideIcon({
        icon: cat.icon,
        categoryName: cat.name,
        parentName: cat.parentName,
        projectKind: 'PROJECT',
      })
    : FileCheck2;
  const circuit = data.computedCircuit;
  const steps = circuit?.steps ?? [];
  const requester = displayLabel(
    data.requesterSummary?.displayName,
    'Demandeur inconnu',
  );
  const decisionCopy = decisionPanelCopy(data);
  const sponsorName =
    data.sponsorLabel?.split(' — ')[0]?.trim() || data.sponsorLabel;

  return (
    <RequireActiveClient>
      <PageContainer>
        <div className="dem-root">
          <div className="dem-back">
            <Link
              href="/projects/requests"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                'min-h-11 sm:min-h-9',
              )}
            >
              <ArrowLeft className="mr-2 size-4" aria-hidden />
              Toutes les demandes
            </Link>
            <p className="dem-back-meta">
              {displayLabel(data.referenceCode, 'Sans référence')} · déposée le{' '}
              {formatProjectRequestDate(data.createdAt)}
            </p>
          </div>

          <section className="dem-hero">
            <span
              className={cn(
                'dem-hero-ico',
                !accent && (typeMeta?.iconBg ?? 'bg-muted'),
                !accent && (typeMeta?.iconFg ?? 'text-foreground'),
              )}
              style={
                accent
                  ? {
                      background: `color-mix(in srgb, ${accent} 16%, transparent)`,
                      color: accent,
                    }
                  : undefined
              }
            >
              <TypeIcon aria-hidden />
            </span>
            <div className="dem-hero-mid">
              <h1>{displayLabel(data.title, 'Sans titre')}</h1>
              <div className="dem-hero-meta">
                <span
                  className={cn('starium-ds-badge', statusBadgeClass(data.status))}
                >
                  {statusLabel(data.status)}
                </span>
                <span
                  className={cn(
                    'dem-route',
                    !accent && typeMeta?.iconBg,
                    !accent && typeMeta?.iconFg,
                  )}
                  style={
                    accent
                      ? {
                          background: `color-mix(in srgb, ${accent} 14%, transparent)`,
                          color: accent,
                        }
                      : undefined
                  }
                  title={natureLabel(data)}
                >
                  {natureShortLabel(data)}
                </span>
                <span>
                  {displayLabel(
                    data.requestingDirection,
                    'Direction non renseignée',
                  )}
                </span>
                <span className="dem-av">
                  <span className="dem-av-bubble dem-av-bubble--xs" aria-hidden>
                    {personInitials(requester)}
                  </span>
                  <span className="dem-av-n">{requester}</span>
                  <span>· Demandeur</span>
                </span>
                {sponsorName ? (
                  <span className="dem-av">
                    <span
                      className="dem-av-bubble dem-av-bubble--xs"
                      aria-hidden
                    >
                      {personInitials(sponsorName)}
                    </span>
                    <span className="dem-av-n">{sponsorName}</span>
                    <span>· Sponsor</span>
                  </span>
                ) : null}
              </div>
            </div>
            <div className="dem-hero-acts">
              {actions.map((a) => (
                <Button
                  key={a.label}
                  type="button"
                  size="sm"
                  variant={a.variant ?? 'default'}
                  className="min-h-11 sm:min-h-9"
                  disabled={a.disabled}
                  onClick={a.onClick}
                >
                  {a.label}
                </Button>
              ))}
            </div>
          </section>

          {steps.length > 0 ? (
            <nav className="dem-flow" aria-label="Circuit de validation">
              {steps.map((step, i) => {
                const state = circuitStepVisualState({
                  stepKey: step.key,
                  stepIndex: i,
                  steps,
                  status: data.status,
                  circuit,
                  failedAtStep: data.failedAtStep,
                });
                return (
                  <div
                    key={step.key}
                    data-state={state}
                    className={cn(
                      'dem-step',
                      state === 'done' && 'is-done',
                      state === 'cur' && 'is-cur',
                      state === 'ko' && 'is-ko',
                      state === 'todo' && 'is-todo',
                    )}
                  >
                    <div className="dem-step-n" aria-hidden>
                      {state === 'done' ? (
                        <Check />
                      ) : state === 'ko' ? (
                        <X />
                      ) : (
                        i + 1
                      )}
                    </div>
                    <div className="dem-step-l">{step.label}</div>
                    <div className="dem-step-s">{step.actorHint}</div>
                  </div>
                );
              })}
            </nav>
          ) : null}

          <div className="dem-grid">
            <section className="dem-dossier">
              <div className="dem-sec" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
                <h2 className="dem-sec-t">Besoin exprimé</h2>
                <p className="dem-body">
                  {displayLabel(
                    data.businessContext ?? data.description,
                    'Non renseigné',
                  )}
                </p>
              </div>
              {data.objectives?.length ? (
                <div className="dem-sec">
                  <h3 className="dem-sec-t">Objectifs visés</h3>
                  <div className="dem-obj">
                    {data.objectives.map((obj) => (
                      <div key={obj} className="dem-obj-i">
                        <Check aria-hidden />
                        <span>{obj}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {data.expectedBenefits ? (
                <div className="dem-sec">
                  <h3 className="dem-sec-t">Bénéfices attendus</h3>
                  <p className="dem-body is-muted">{data.expectedBenefits}</p>
                </div>
              ) : null}
              <div className="dem-sec">
                <h3 className="dem-sec-t">Cadrage estimatif</h3>
                <div className="dem-kv">
                  <div className="dem-kv-i">
                    <div className="dem-kv-k">Budget estimé</div>
                    <div className="dem-kv-v">
                      {formatBudgetEuro(data.estimatedBudget)}
                    </div>
                  </div>
                  <div className="dem-kv-i">
                    <div className="dem-kv-k">Charge interne</div>
                    <div className="dem-kv-v">
                      {data.estimatedEffortDays != null
                        ? `${data.estimatedEffortDays} j·h`
                        : '—'}
                    </div>
                  </div>
                  <div className="dem-kv-i">
                    <div className="dem-kv-k">Échéance souhaitée</div>
                    <div className="dem-kv-v">
                      {formatProjectRequestDate(data.desiredDeadline)}
                    </div>
                  </div>
                  <div className="dem-kv-i">
                    <div className="dem-kv-k">Priorité demandée</div>
                    <div className="dem-kv-v">
                      {data.priorityRequested
                        ? displayLabel(
                            PROJECT_REQUEST_PRIORITY_LABELS[
                              data.priorityRequested
                            ],
                            'Non renseignée',
                          )
                        : 'Non renseignée'}
                    </div>
                  </div>
                  {data.retainedBudget != null ? (
                    <div className="dem-kv-i">
                      <div className="dem-kv-k">Budget retenu</div>
                      <div className="dem-kv-v">
                        {formatBudgetEuro(data.retainedBudget)}
                      </div>
                    </div>
                  ) : null}
                  {data.instructionOpinion ? (
                    <div className="dem-kv-i">
                      <div className="dem-kv-k">Avis PMO</div>
                      <div className="dem-kv-v">
                        {displayLabel(
                          PROJECT_REQUEST_OPINION_LABELS[
                            data.instructionOpinion
                          ],
                          'Avis non renseigné',
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </section>

            <div>
              <section className="dem-panel">
                <h2 className="dem-panel-t">{decisionCopy.title}</h2>
                <p className="dem-panel-s">{decisionCopy.subtitle}</p>
                <div className="dem-prev-row">
                  <span className="k">Circuit appliqué</span>
                  <span className="v">
                    {circuit?.needsCycle
                      ? `Cycle · ${circuit.instance ?? data.arbitrationInstance ?? 'COPIL'}`
                      : 'Hors cycle'}
                  </span>
                </div>
                <div className="dem-prev-row">
                  <span className="k">Validation N+1</span>
                  <span className="v">
                    {circuit?.requireN1Validation ? 'Requise' : 'Désactivée'}
                  </span>
                </div>
                <div className="dem-prev-row">
                  <span className="k">Instruction PMO</span>
                  <span className="v">
                    {circuit?.requirePmoInstruction ? 'Requise' : 'Désactivée'}
                  </span>
                </div>
                <div className="dem-prev-row">
                  <span className="k">Séance d&apos;arbitrage</span>
                  <span className="v">
                    {displayLabel(data.meetingLabel, 'Non inscrite')}
                  </span>
                </div>
                {data.decisionComment ? (
                  <p className="dem-body mt-3 rounded-[var(--radius-md)] bg-[color:var(--neutral-50)] p-3 text-xs">
                    {data.decisionComment}
                  </p>
                ) : null}
                <div className="dem-note">
                  <Info aria-hidden />
                  <span>
                    Le circuit est recalculé si le type ou le budget évolue —
                    voir la configuration.
                  </span>
                </div>
              </section>

              <section className="dem-panel">
                <h2 className="dem-panel-t">Journal de la demande</h2>
                <p className="dem-panel-s">
                  Historique append-only des étapes du circuit.
                </p>
                {(data.journal?.length ?? 0) === 0 ? (
                  <p className="dem-body is-muted">
                    Aucune entrée pour le moment.
                  </p>
                ) : (
                  <div className="dem-jrn">
                    {[...(data.journal ?? [])].reverse().map((entry, i) => {
                      const author = displayLabel(
                        entry.authorLabel,
                        'Auteur inconnu',
                      );
                      const showBadge = !isCommitteeAuthor(author);
                      return (
                        <div key={entry.id} className="dem-jrn-i">
                          <div
                            className={cn('dem-jrn-d', i === 0 && 'is-head')}
                            aria-hidden
                          />
                          <div className="dem-jrn-b">
                            <div className="dem-jrn-t">
                              {displayLabel(entry.label, 'Événement')}
                            </div>
                            <div className="dem-jrn-m">
                              {showBadge ? (
                                <span
                                  className="dem-av-bubble dem-av-bubble--xs"
                                  aria-hidden
                                >
                                  {personInitials(author)}
                                </span>
                              ) : null}
                              <span>
                                {author} ·{' '}
                                {formatProjectRequestDate(entry.at)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          </div>

          <InstructDialog
            open={modal === 'instruct'}
            onOpenChange={(o) => !o && setModal(null)}
            request={data}
            authFetch={authFetch}
            onDone={async (msg) => {
              setModal(null);
              await invalidate();
              toast.success(msg);
            }}
          />
          <AgendaDialog
            open={modal === 'agenda'}
            onOpenChange={(o) => !o && setModal(null)}
            instance={
              data.computedCircuit?.instance ??
              (data.arbitrationInstance as string | null) ??
              'COPIL'
            }
            onSubmit={async (meetingLabel) => {
              await agendaProjectRequest(authFetch, id, { meetingLabel });
              setModal(null);
              await invalidate();
              toast.success(
                `Point inscrit à l'ordre du jour · ${meetingLabel}`,
              );
            }}
          />
          <CommitteeDecideDialog
            open={modal === 'committee'}
            onOpenChange={(o) => !o && setModal(null)}
            meetingLabel={data.meetingLabel}
            onSubmit={async (outcome, motivation) => {
              await committeeDecideProjectRequest(authFetch, id, {
                outcome,
                motivation,
              });
              setModal(null);
              await invalidate();
              if (outcome === 'APPROVE') {
                toast.success(
                  'Arbitrage favorable enregistré · demande prête à devenir un projet',
                );
              } else if (outcome === 'REJECT') {
                toast.success('Demande refusée en comité');
              } else {
                toast.success('Demande ajournée · dossier à compléter');
              }
            }}
          />
        </div>
      </PageContainer>
    </RequireActiveClient>
  );
}

function InstructDialog({
  open,
  onOpenChange,
  request,
  authFetch,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  request: ProjectRequestDto;
  authFetch: ReturnType<typeof useAuthenticatedFetch>;
  onDone: (msg: string) => Promise<void>;
}) {
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const [opinion, setOpinion] = useState<'FAVORABLE' | 'RESERVED' | 'UNFAVORABLE'>(
    'FAVORABLE',
  );
  const [budget, setBudget] = useState(String(request.estimatedBudget ?? 0));
  const [charge, setCharge] = useState(String(request.estimatedEffortDays ?? ''));
  const [summary, setSummary] = useState('');

  useEffect(() => {
    if (!open) return;
    setOpinion('FAVORABLE');
    setBudget(String(request.estimatedBudget ?? 0));
    setCharge(String(request.estimatedEffortDays ?? ''));
    setSummary('');
  }, [open, request.estimatedBudget, request.estimatedEffortDays]);

  const budgetNum = Number.parseFloat(budget.replace(',', '.')) || 0;

  const preview = useQuery({
    queryKey: [
      'project-request-preview-circuit',
      clientId,
      request.type,
      budgetNum,
      'instruct',
    ],
    queryFn: () =>
      previewCircuit(authFetch, {
        type: request.type ?? undefined,
        budget: budgetNum,
      }),
    enabled: open && !!clientId,
  });

  const mut = useMutation({
    mutationFn: () =>
      instructProjectRequest(authFetch, request.id, {
        opinion,
        retainedBudget: budgetNum,
        retainedEffortDays: charge
          ? Number.parseFloat(charge.replace(',', '.'))
          : undefined,
        summary: summary.trim() || undefined,
      }),
    onSuccess: async (row) => {
      let msg = 'Instruction conclue · demande validée hors cycle';
      if (opinion === 'UNFAVORABLE') {
        msg = 'Instruction conclue · demande refusée';
      } else if (row.status === 'IN_CYCLE') {
        const inst =
          row.computedCircuit?.instance ?? row.arbitrationInstance ?? 'COPIL';
        msg = `Instruction conclue · arbitrage en ${inst} requis`;
      }
      await onDone(msg);
    },
    onError: (e: { message?: string }) =>
      toast.error(e.message ?? 'Instruction impossible.'),
  });

  const routeNote = (() => {
    if (opinion === 'UNFAVORABLE') {
      return "Avis défavorable : la demande sera refusée à l'issue de l'instruction.";
    }
    const c = preview.data;
    if (!c) return 'Calcul du routage…';
    if (c.needsCycle) {
      return `Avec ${formatBudgetKEuro(budgetNum)}, la demande passera en arbitrage ${c.instance ?? 'COPIL'} (seuil ${formatBudgetKEuro(c.copilThresholdAmount)}${c.instance === 'CODIR' ? ` / CODIR ${formatBudgetKEuro(c.codirThresholdAmount)}` : ''}).`;
    }
    return `Avec ${formatBudgetKEuro(budgetNum)}, la demande sera validée hors cycle de pilotage${c.exemptRequestTypes.includes(request.type ?? '') ? ' (type exempté)' : ''}.`;
  })();

  return (
    <StariumModal
      open={open}
      onOpenChange={onOpenChange}
      title="Conclusion de l'instruction"
      description="Le circuit aval est déterminé par le budget retenu et la configuration."
      icon={ClipboardList}
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
            disabled={mut.isPending}
            onClick={() => mut.mutate()}
          >
            Conclure l&apos;instruction
          </Button>
        </>
      }
    >
      <div className="starium-form space-y-4">
        <div>
          <p className="mb-2 text-sm font-medium" id="ins-opinion-label">
            Avis du PMO
          </p>
          <div
            className="dem-type-pills"
            role="radiogroup"
            aria-labelledby="ins-opinion-label"
          >
            {(
              [
                ['FAVORABLE', 'Favorable'],
                ['RESERVED', 'Réservé'],
                ['UNFAVORABLE', 'Défavorable'],
              ] as const
            ).map(([v, l]) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={opinion === v}
                className={cn('dem-type-pill', opinion === v && 'is-sel')}
                onClick={() => setOpinion(v)}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ins-budget">Budget retenu (€)</Label>
            <Input
              id="ins-budget"
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="min-h-11 sm:min-h-9"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ins-charge">Charge retenue (j·h)</Label>
            <Input
              id="ins-charge"
              type="number"
              value={charge}
              onChange={(e) => setCharge(e.target.value)}
              className="min-h-11 sm:min-h-9"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ins-summary">Synthèse d&apos;instruction</Label>
          <Textarea
            id="ins-summary"
            rows={3}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Faisabilité, dépendances, alignement au schéma directeur…"
          />
        </div>
        <div
          className="rounded-lg border border-border/70 bg-muted/30 p-3 text-xs leading-relaxed"
          aria-live="polite"
        >
          {routeNote}
        </div>
      </div>
    </StariumModal>
  );
}

function AgendaDialog({
  open,
  onOpenChange,
  instance,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  instance: string;
  onSubmit: (meetingLabel: string) => Promise<void>;
}) {
  const [meetingLabel, setMeetingLabel] = useState('');
  const [pending, setPending] = useState(false);

  return (
    <StariumModal
      open={open}
      onOpenChange={(o) => {
        if (!o) setMeetingLabel('');
        onOpenChange(o);
      }}
      title="Inscrire la demande à un cycle de pilotage"
      description={`Instance requise par le circuit : ${instance}. Saisissez le libellé de la séance (ex. COPIL Transformation — 24 sept. 2026).`}
      icon={ClipboardList}
      size="md"
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
            disabled={pending || !meetingLabel.trim()}
            onClick={async () => {
              setPending(true);
              try {
                await onSubmit(meetingLabel.trim());
              } catch (e) {
                toast.error(
                  (e as { message?: string }).message ??
                    'Inscription impossible.',
                );
              } finally {
                setPending(false);
              }
            }}
          >
            Inscrire à l&apos;ordre du jour
          </Button>
        </>
      }
    >
      <div className="starium-form space-y-2">
        <Label htmlFor="odj-label">Libellé de la séance</Label>
        <Input
          id="odj-label"
          value={meetingLabel}
          onChange={(e) => setMeetingLabel(e.target.value)}
          placeholder={`Ex. : ${instance} Transformation — 24 sept. 2026`}
          className="min-h-11 sm:min-h-9"
        />
      </div>
    </StariumModal>
  );
}

function CommitteeDecideDialog({
  open,
  onOpenChange,
  meetingLabel,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  meetingLabel: string | null;
  onSubmit: (
    outcome: 'APPROVE' | 'POSTPONE' | 'REJECT',
    motivation?: string,
  ) => Promise<void>;
}) {
  const [outcome, setOutcome] = useState<'APPROVE' | 'POSTPONE' | 'REJECT'>(
    'APPROVE',
  );
  const [motivation, setMotivation] = useState('');
  const [pending, setPending] = useState(false);

  return (
    <StariumModal
      open={open}
      onOpenChange={onOpenChange}
      title="Décision du comité"
      description={displayLabel(meetingLabel, 'Arbitrage')}
      icon={FileCheck2}
      size="md"
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
            disabled={pending}
            onClick={async () => {
              if (
                (outcome === 'POSTPONE' || outcome === 'REJECT') &&
                !motivation.trim()
              ) {
                toast.error(
                  'Indiquez une motivation pour un ajournement ou un refus',
                );
                return;
              }
              setPending(true);
              try {
                await onSubmit(outcome, motivation.trim() || undefined);
              } catch (e) {
                toast.error(
                  (e as { message?: string }).message ?? 'Décision impossible.',
                );
              } finally {
                setPending(false);
              }
            }}
          >
            Enregistrer la décision
          </Button>
        </>
      }
    >
      <div className="starium-form space-y-4">
        <div>
          <p className="mb-2 text-sm font-medium" id="dec-outcome-label">
            Issue de l&apos;arbitrage
          </p>
          <div
            className="dem-type-pills"
            role="radiogroup"
            aria-labelledby="dec-outcome-label"
          >
            {(
              [
                ['APPROVE', 'Validée'],
                ['POSTPONE', 'Ajournée'],
                ['REJECT', 'Refusée'],
              ] as const
            ).map(([v, l]) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={outcome === v}
                className={cn('dem-type-pill', outcome === v && 'is-sel')}
                onClick={() => setOutcome(v)}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="dec-motivation">Motivation / conditions</Label>
          <Textarea
            id="dec-motivation"
            rows={3}
            value={motivation}
            onChange={(e) => setMotivation(e.target.value)}
            placeholder="Ex. : validée sous réserve d'un lot 1 limité au périmètre facturation."
          />
        </div>
      </div>
    </StariumModal>
  );
}
