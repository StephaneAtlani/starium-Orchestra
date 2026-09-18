'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { StariumScrollArea } from '@/components/layout/starium-scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingState } from '@/components/feedback/loading-state';
import { ErrorState } from '@/components/feedback/error-state';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuth } from '@/context/auth-context';
import { displayLabel, firstDisplayLabel } from '@/lib/display-label';
import { toast } from '@/lib/toast';
import { updateMyProfile } from '@/services/me';
import {
  createClientRisk,
  listProjects,
  type CreateProjectRiskPayload,
} from '@/features/projects/api/projects.api';
import { ProjectRiskEbiosDialog } from '@/features/projects/components/project-risk-ebios-dialog';
import { ComplianceEvidenceReuseModal } from './compliance-evidence-reuse-modal';
import {
  createComplianceContribution,
  createComplianceEvidence,
  createComplianceEvidenceVersion,
  createComplianceGap,
  deleteComplianceEvidence,
  getComplianceRequirementDetail,
  listComplianceGaps,
  patchComplianceContribution,
  patchComplianceEvidence,
  patchComplianceGap,
  reuseComplianceEvidence,
  upsertComplianceRequirementStatus,
  type ComplianceEvidenceKindApi,
  type ComplianceRequirementRowApi,
} from '../api/compliance.api';
import { useClientMembers } from '@/features/client-rbac/hooks/use-client-members';
import type { ClientMember } from '@/features/client-rbac/api/user-roles';
import { type ComplianceUiStatus } from './compliance-status-display';
import {
  ComplianceAssessHeader,
  defaultMaturityForStatus,
  isSavableAssessmentStatus,
} from './compliance-assess-ui';
import { ComplianceAssessDrawerBody } from './compliance-assess-drawer-body';
import { ComplianceGapCyclePanel } from './compliance-gap-cycle-panel';
import {
  ComplianceEvidenceEditModal,
  ComplianceEvidenceRemoveModal,
  ComplianceEvidenceVersionModal,
} from './compliance-evidence-edit-modals';
import { ComplianceRemediationPlanModal } from './compliance-remediation-plan-modal';

function memberLabel(m: ClientMember): string {
  const name = [m.firstName, m.lastName].filter(Boolean).join(' ').trim();
  const base = name || m.email;
  const job = m.jobTitle?.trim();
  return job ? `${base} — ${job}` : base;
}

const REVIEW_MONTHS = 12;

function isDueForReview(lastAssessmentDate: string | null | undefined): boolean {
  if (!lastAssessmentDate) return false;
  const d = new Date(lastAssessmentDate);
  if (Number.isNaN(d.getTime())) return false;
  const due = new Date(d);
  due.setMonth(due.getMonth() + REVIEW_MONTHS);
  return due.getTime() < Date.now();
}

function toDateInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function dateInputToIso(v: string): string | undefined {
  const t = v.trim();
  if (!t) return undefined;
  return `${t}T12:00:00.000Z`;
}

function invalidateComplianceQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  clientId: string,
) {
  void queryClient.invalidateQueries({ queryKey: ['compliance', 'requirements', clientId] });
  void queryClient.invalidateQueries({ queryKey: ['compliance', 'requirement', clientId] });
  void queryClient.invalidateQueries({ queryKey: ['compliance', 'gaps', clientId] });
  void queryClient.invalidateQueries({ queryKey: ['compliance', clientId, 'dashboard'] });
  void queryClient.invalidateQueries({ queryKey: ['compliance', clientId, 'statuses'] });
  void queryClient.invalidateQueries({
    queryKey: ['compliance', clientId, 'frameworks-summary'],
  });
  void queryClient.invalidateQueries({
    queryKey: ['compliance', 'framework', clientId],
  });
}

export function ComplianceRequirementDetailModal({
  open,
  onOpenChange,
  requirementId,
  preview,
  navigationIds = [],
  onNavigate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requirementId: string | null;
  preview?: Pick<ComplianceRequirementRowApi, 'code' | 'title' | 'framework'> | null;
  /** Ordre de parcours (liste filtrée) — prev/next sans fermer la modale. */
  navigationIds?: string[];
  onNavigate?: (requirementId: string) => void;
}) {
  const authFetch = useAuthenticatedFetch();
  const { accessToken } = useAuth();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const queryClient = useQueryClient();
  const { has, isSuccess: permsSuccess } = usePermissions();
  const canUpdate = permsSuccess && has('compliance.update');
  const canUpdateProjects = permsSuccess && has('projects.update');

  const [status, setStatus] = useState<ComplianceUiStatus>('NOT_ASSESSED');
  const [comment, setComment] = useState('');
  const [reviewDate, setReviewDate] = useState('');
  const [maturity, setMaturity] = useState<number | null>(null);
  const [ownerUserId, setOwnerUserId] = useState('');
  const [evidenceKind, setEvidenceKind] = useState<ComplianceEvidenceKindApi>('OBSERVATION');
  const [evidenceName, setEvidenceName] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [evidenceDescription, setEvidenceDescription] = useState('');
  const [evidenceCollectedAt, setEvidenceCollectedAt] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [evidenceDraftOpen, setEvidenceDraftOpen] = useState(false);
  const [addEvidenceMenuOpen, setAddEvidenceMenuOpen] = useState(false);
  const addEvidenceMenuRef = useRef<HTMLDivElement>(null);
  const [riskDialogOpen, setRiskDialogOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [contribAssigneeId, setContribAssigneeId] = useState('');
  const [contribInstruction, setContribInstruction] = useState('');
  const [gapTitle, setGapTitle] = useState('');
  const [gapFinding, setGapFinding] = useState('');
  const [remediationPlanOpen, setRemediationPlanOpen] = useState(false);
  const [editingEvidenceId, setEditingEvidenceId] = useState<string | null>(
    null,
  );
  const [removingEvidenceId, setRemovingEvidenceId] = useState<string | null>(
    null,
  );
  const [versioningEvidenceId, setVersioningEvidenceId] = useState<
    string | null
  >(null);
  const [reuseOpen, setReuseOpen] = useState(false);

  const { data: members = [] } = useClientMembers();

  const q = useQuery({
    queryKey: ['compliance', 'requirement', clientId, requirementId],
    queryFn: () => getComplianceRequirementDetail(authFetch, requirementId!),
    enabled: open && Boolean(clientId) && Boolean(requirementId),
  });

  const gapsQ = useQuery({
    queryKey: ['compliance', 'gaps', clientId, requirementId],
    queryFn: () =>
      listComplianceGaps(authFetch, { requirementId: requirementId! }),
    enabled: open && Boolean(clientId) && Boolean(requirementId),
  });

  const projectsQ = useQuery({
    queryKey: ['projects', 'list', clientId, 'compliance-risk-link'],
    queryFn: () => listProjects(authFetch, { limit: 100 }),
    enabled: open && riskDialogOpen && Boolean(clientId) && canUpdateProjects,
  });

  useEffect(() => {
    if (!open || !q.data) return;
    const st = q.data.status?.status;
    const ui: ComplianceUiStatus = st ?? 'NOT_ASSESSED';
    setStatus(ui);
    setComment(q.data.status?.comment ?? '');
    setReviewDate(toDateInput(q.data.status?.lastAssessmentDate));
    setMaturity(
      q.data.status?.maturityLevel ?? defaultMaturityForStatus(ui),
    );
    setOwnerUserId(q.data.status?.ownerUserId ?? '');
    setFormError(null);
    setEvidenceName('');
    setEvidenceUrl('');
    setEvidenceDescription('');
    setEvidenceKind('OBSERVATION');
    setEvidenceDraftOpen(false);
    setAddEvidenceMenuOpen(false);
  }, [open, q.data]);

  useEffect(() => {
    if (!addEvidenceMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (addEvidenceMenuRef.current?.contains(target)) return;
      if (
        target instanceof Element &&
        target.closest('[data-comp-evidence-menu]')
      ) {
        return;
      }
      setAddEvidenceMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [addEvidenceMenuOpen]);

  const titleCode = displayLabel(q.data?.requirement.code ?? preview?.code, 'Exigence');
  const titleLabel = displayLabel(
    q.data?.requirement.title ?? preview?.title,
    'Détail de l’exigence',
  );

  const needsReview = isDueForReview(q.data?.status?.lastAssessmentDate);
  const activeStatus = q.data?.status?.status;
  const showRiskCta =
    activeStatus === 'PARTIALLY_COMPLIANT' || activeStatus === 'NON_COMPLIANT';

  const navIndex =
    requirementId && navigationIds.length > 0
      ? navigationIds.indexOf(requirementId)
      : -1;
  const canGoPrev = Boolean(onNavigate) && navIndex > 0;
  const canGoNext =
    Boolean(onNavigate) && navIndex >= 0 && navIndex < navigationIds.length - 1;

  const localeMut = useMutation({
    mutationFn: async (locale: string) => {
      if (!accessToken) throw new Error('Session expirée');
      return updateMyProfile(accessToken, {
        complianceContentLocale: locale,
      });
    },
    onSuccess: async () => {
      toast.success('Langue des textes enregistrée');
      invalidateComplianceQueries(queryClient, clientId);
      await q.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveMut = useMutation({
    mutationFn: () => {
      if (!isSavableAssessmentStatus(status)) {
        throw new Error(
          'Choisissez Conforme, Partiel, Écart ou Non applicable pour enregistrer.',
        );
      }
      if (!comment.trim()) {
        throw new Error(
          status === 'NOT_APPLICABLE'
            ? 'Une justification est obligatoire pour la non-applicabilité.'
            : 'Un commentaire d’analyse est obligatoire.',
        );
      }
      return upsertComplianceRequirementStatus(authFetch, requirementId!, {
        status,
        comment: comment.trim(),
        lastAssessmentDate: dateInputToIso(reviewDate) ?? null,
        maturityLevel: maturity,
        ownerUserId: ownerUserId || null,
      });
    },
    onSuccess: async () => {
      toast.success('Évaluation enregistrée');
      setFormError(null);
      invalidateComplianceQueries(queryClient, clientId);
      await q.refetch();
    },
    onError: (e: Error) => {
      setFormError(e.message);
      toast.error(e.message);
    },
  });

  const evidenceMut = useMutation({
    mutationFn: () =>
      createComplianceEvidence(authFetch, {
        requirementId: requirementId!,
        name: evidenceName.trim(),
        kind: evidenceKind,
        url:
          evidenceKind === 'URL' || evidenceKind === 'REFERENCE'
            ? evidenceUrl.trim() || undefined
            : undefined,
        description:
          evidenceKind === 'OBSERVATION' || evidenceKind === 'REFERENCE'
            ? evidenceDescription.trim()
            : evidenceDescription.trim() || undefined,
        collectedAt: evidenceCollectedAt
          ? new Date(`${evidenceCollectedAt}T12:00:00`).toISOString()
          : undefined,
      }),
    onSuccess: async () => {
      toast.success('Preuve ajoutée');
      setEvidenceName('');
      setEvidenceUrl('');
      setEvidenceDescription('');
      setEvidenceDraftOpen(false);
      setAddEvidenceMenuOpen(false);
      invalidateComplianceQueries(queryClient, clientId);
      await q.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const evidencePatchMut = useMutation({
    mutationFn: (payload: { name: string; description: string }) =>
      patchComplianceEvidence(authFetch, editingEvidenceId!, {
        name: payload.name,
        description: payload.description || null,
      }),
    onSuccess: async () => {
      toast.success('Preuve mise à jour');
      setEditingEvidenceId(null);
      invalidateComplianceQueries(queryClient, clientId);
      await q.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const evidenceDeleteMut = useMutation({
    mutationFn: () => deleteComplianceEvidence(authFetch, removingEvidenceId!),
    onSuccess: async () => {
      toast.success('Preuve retirée du dossier');
      setRemovingEvidenceId(null);
      invalidateComplianceQueries(queryClient, clientId);
      await q.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const evidenceVersionMut = useMutation({
    mutationFn: () =>
      createComplianceEvidenceVersion(authFetch, versioningEvidenceId!),
    onSuccess: async () => {
      toast.success('Nouvelle version créée');
      setVersioningEvidenceId(null);
      invalidateComplianceQueries(queryClient, clientId);
      await q.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const evidenceReuseMut = useMutation({
    mutationFn: (sourceEvidenceId: string) =>
      reuseComplianceEvidence(authFetch, {
        sourceEvidenceId,
        requirementId: requirementId!,
      }),
    onSuccess: async () => {
      toast.success('Preuve réutilisée');
      setReuseOpen(false);
      invalidateComplianceQueries(queryClient, clientId);
      await q.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const evidenceAssessmentMut = useMutation({
    mutationFn: ({
      evidenceId,
      assessment,
    }: {
      evidenceId: string;
      assessment: import('../api/compliance.api').ComplianceEvidenceAssessmentApi;
    }) => patchComplianceEvidence(authFetch, evidenceId, { assessment }),
    onSuccess: async () => {
      toast.success('Appréciation enregistrée');
      invalidateComplianceQueries(queryClient, clientId);
      await q.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const contribCreateMut = useMutation({
    mutationFn: () =>
      createComplianceContribution(authFetch, {
        requirementId: requirementId!,
        assigneeUserId: contribAssigneeId,
        instruction: contribInstruction.trim(),
              }),
    onSuccess: async () => {
      toast.success('Contribution demandée');
      setContribInstruction('');
      invalidateComplianceQueries(queryClient, clientId);
      await q.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const contribAcceptMut = useMutation({
    mutationFn: (id: string) =>
      patchComplianceContribution(authFetch, id, { status: 'ACCEPTED' }),
    onSuccess: async () => {
      toast.success('Contribution acceptée');
      invalidateComplianceQueries(queryClient, clientId);
      await q.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });



  const gapCreateMut = useMutation({
    mutationFn: () =>
      createComplianceGap(authFetch, {
        requirementId: requirementId!,
        title: gapTitle.trim(),
        finding: gapFinding.trim(),
      }),
    onSuccess: async () => {
      toast.success('Écart créé');
      setGapTitle('');
      setGapFinding('');
      invalidateComplianceQueries(queryClient, clientId);
      await Promise.all([q.refetch(), gapsQ.refetch()]);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const gapPatchMut = useMutation({
    mutationFn: ({
      gapId,
      status: nextStatus,
      verificationNote,
    }: {
      gapId: string;
      status: string;
      verificationNote?: string;
    }) =>
      patchComplianceGap(authFetch, gapId, {
        status: nextStatus,
        verificationNote,
      }),
    onSuccess: async (_data, vars) => {
      if (vars.status === 'TO_VERIFY') {
        toast.success('Écart soumis à vérification');
      } else if (vars.status === 'CLOSED') {
        toast.success('Écart clôturé');
      } else if (vars.status === 'IN_PROGRESS') {
        toast.success('Écart remis en traitement (non efficace)');
      } else {
        toast.success('Écart mis à jour');
      }
      invalidateComplianceQueries(queryClient, clientId);
      await gapsQ.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createRiskMut = useMutation({
    mutationFn: (payload: CreateProjectRiskPayload) => createClientRisk(authFetch, payload),
    onSuccess: async () => {
      toast.success('Risque créé et lié à l’exigence');
      setRiskDialogOpen(false);
      invalidateComplianceQueries(queryClient, clientId);
      await q.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const projectList = projectsQ.data?.items ?? [];
  const showGapPlan =
    status === 'PARTIALLY_COMPLIANT' || status === 'NON_COMPLIANT';

  return (
    <>
      <StariumModal
        open={open}
        onOpenChange={onOpenChange}
        title={titleLabel}
        headless
        sidePanel
        showCloseButton
        contentClassName="!max-w-[min(100vw,56rem)] gap-0 border-border/80 bg-background p-0 sm:rounded-l-2xl"
        bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden bg-background p-0"
        footerClassName="!border-t !border-border/70 !bg-background"
        footer={
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              {onNavigate && navigationIds.length > 1 ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="min-h-11 min-w-11 border-border/80 bg-card sm:min-h-9 sm:min-w-9"
                    disabled={!canGoPrev}
                    aria-label="Exigence précédente"
                    onClick={() => {
                      if (!canGoPrev) return;
                      onNavigate(navigationIds[navIndex - 1]!);
                    }}
                  >
                    <ChevronLeft className="size-4" aria-hidden />
                  </Button>
                  <span
                    className="min-w-[3.5rem] px-1 text-center text-xs font-semibold tabular-nums text-muted-foreground"
                    aria-live="polite"
                  >
                    {navIndex >= 0
                      ? `${navIndex + 1} / ${navigationIds.length}`
                      : null}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="min-h-11 min-w-11 border-border/80 bg-card sm:min-h-9 sm:min-w-9"
                    disabled={!canGoNext}
                    aria-label="Exigence suivante"
                    onClick={() => {
                      if (!canGoNext) return;
                      onNavigate(navigationIds[navIndex + 1]!);
                    }}
                  >
                    <ChevronRight className="size-4" aria-hidden />
                  </Button>
                </>
              ) : (
                <span className="sr-only">Navigation liste indisponible</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="min-h-11 bg-card sm:min-h-9"
                onClick={() => onOpenChange(false)}
              >
                Annuler
              </Button>
              {canUpdate && isSavableAssessmentStatus(status) ? (
                <Button
                  type="button"
                  className="min-h-11 sm:min-h-9"
                  disabled={saveMut.isPending}
                  onClick={() => saveMut.mutate()}
                >
                  {saveMut.isPending ? 'Enregistrement…' : 'Enregistrer'}
                </Button>
              ) : null}
            </div>
          </div>
        }
      >
        {q.isLoading ? (
          <div className="p-5">
            <LoadingState rows={4} />
          </div>
        ) : q.isError ? (
          <div className="p-5">
            <ErrorState
              message={
                q.error instanceof Error
                  ? q.error.message
                  : 'Impossible de charger l’exigence.'
              }
              onRetry={() => void q.refetch()}
            />
          </div>
        ) : q.data ? (
          <>
            <ComplianceAssessHeader
              frameworkName={displayLabel(
                q.data.requirement.framework?.name ?? preview?.framework?.name,
                'Référentiel',
              )}
              code={titleCode}
              title={displayLabel(q.data.requirement.title, titleLabel)}
              description={q.data.requirement.description}
              availableLocales={q.data.requirement.availableLocales}
              contentLocale={q.data.requirement.contentLocale}
              localePending={localeMut.isPending}
              onContentLocaleChange={(locale) => localeMut.mutate(locale)}
            />
            <StariumScrollArea
              className="min-h-0 flex-1"
              layout="fill"
              reveal="hover"
              viewportClassName="pb-2"
            >
              {needsReview ? (
                <p
                  className="mx-5 mt-4 rounded-[var(--radius-md)] border border-border/70 bg-[color:var(--state-warning-bg)] px-3 py-2.5 text-sm font-semibold text-[color:var(--state-warning)] sm:mx-6"
                  role="status"
                  aria-live="polite"
                >
                  À réexaminer — dernière évaluation il y a plus de {REVIEW_MONTHS}{' '}
                  mois.
                </p>
              ) : null}
              <ComplianceAssessDrawerBody
              data={q.data}
              canUpdate={canUpdate}
              status={status}
              onStatusChange={(next) => {
                setStatus(next);
                if (next === 'NOT_APPLICABLE' || next === 'NOT_ASSESSED') {
                  setMaturity(null);
                } else if (maturity == null) {
                  const def = defaultMaturityForStatus(next);
                  if (def != null) setMaturity(def);
                }
              }}
              maturity={maturity}
              onMaturityChange={setMaturity}
              ownerUserId={ownerUserId}
              onOwnerChange={setOwnerUserId}
              members={members}
              reviewDate={reviewDate}
              onReviewDateChange={setReviewDate}
              comment={comment}
              onCommentChange={setComment}
              formError={formError}
              evidences={q.data.evidences}
              addEvidenceMenuOpen={addEvidenceMenuOpen}
              onToggleAddEvidenceMenu={() =>
                setAddEvidenceMenuOpen((o) => !o)
              }
              onOpenReuseEvidence={
                canUpdate ? () => setReuseOpen(true) : undefined
              }
              addEvidenceMenuRef={addEvidenceMenuRef}
              evidenceDraftOpen={evidenceDraftOpen}
              onPickEvidenceKind={(kind) => {
                setAddEvidenceMenuOpen(false);
                if (kind === 'URL') {
                  setEvidenceKind('URL');
                  setEvidenceName('');
                  setEvidenceUrl('');
                  setEvidenceDescription('');
                } else if (kind === 'REFERENCE') {
                  setEvidenceKind('REFERENCE');
                  setEvidenceName('');
                  setEvidenceUrl('');
                  setEvidenceDescription('');
                } else {
                  setEvidenceKind('OBSERVATION');
                  setEvidenceName('');
                  setEvidenceUrl('');
                  setEvidenceDescription('');
                }
                setEvidenceDraftOpen(true);
              }}
              onCancelEvidenceDraft={() => {
                setEvidenceDraftOpen(false);
                setEvidenceName('');
                setEvidenceUrl('');
                setEvidenceDescription('');
              }}
              evidenceKind={evidenceKind}
              evidenceName={evidenceName}
              onEvidenceNameChange={setEvidenceName}
              evidenceUrl={evidenceUrl}
              onEvidenceUrlChange={setEvidenceUrl}
              evidenceDescription={evidenceDescription}
              onEvidenceDescriptionChange={setEvidenceDescription}
              evidenceCollectedAt={evidenceCollectedAt}
              onEvidenceCollectedAtChange={setEvidenceCollectedAt}
              onSubmitEvidence={() => evidenceMut.mutate()}
              evidencePending={evidenceMut.isPending}
              onEditEvidence={
                canUpdate ? (id) => setEditingEvidenceId(id) : undefined
              }
              onRemoveEvidence={
                canUpdate ? (id) => setRemovingEvidenceId(id) : undefined
              }
              onVersionEvidence={
                canUpdate ? (id) => setVersioningEvidenceId(id) : undefined
              }
              onAssessmentChange={
                canUpdate
                  ? (evidenceId, assessment) =>
                      evidenceAssessmentMut.mutate({ evidenceId, assessment })
                  : undefined
              }
              assessmentPendingId={
                evidenceAssessmentMut.isPending
                  ? (evidenceAssessmentMut.variables?.evidenceId ?? null)
                  : null
              }
              showGapPlan={showGapPlan}
              gapTitle={gapTitle}
              onGapTitleChange={setGapTitle}
              gapFinding={gapFinding}
              onGapFindingChange={setGapFinding}
              onCreateGap={() => gapCreateMut.mutate()}
              gapPending={gapCreateMut.isPending}
              onOpenRemediationPlan={
                canUpdate ? () => setRemediationPlanOpen(true) : undefined
              }
              gapCycleSlot={
                <ComplianceGapCyclePanel
                  gaps={gapsQ.data ?? []}
                  loading={gapsQ.isLoading}
                  error={
                    gapsQ.isError
                      ? gapsQ.error instanceof Error
                        ? gapsQ.error.message
                        : 'Impossible de charger les écarts.'
                      : null
                  }
                  onRetry={() => void gapsQ.refetch()}
                  canUpdate={canUpdate}
                  pendingGapId={
                    gapPatchMut.isPending
                      ? (gapPatchMut.variables?.gapId ?? null)
                      : null
                  }
                  onSubmitVerify={(gapId) =>
                    gapPatchMut.mutate({ gapId, status: 'TO_VERIFY' })
                  }
                  onClose={(gapId, verificationNote) =>
                    gapPatchMut.mutate({
                      gapId,
                      status: 'CLOSED',
                      verificationNote,
                    })
                  }
                  onRejectIneffective={(gapId) =>
                    gapPatchMut.mutate({ gapId, status: 'IN_PROGRESS' })
                  }
                />
              }
              advancedSlot={
                <details className="group">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center text-sm font-semibold text-muted-foreground marker:content-none [&::-webkit-details-marker]:hidden">
                    <span className="underline-offset-2 group-open:underline">
                      Actions avancées
                    </span>
                    <span className="sr-only">
                      (contributions, risques)
                    </span>
                  </summary>
                  <div className="mt-4 space-y-5">
                    <section>
                      <h3 className="starium-modal-seg-title">
                        Contributions ({q.data.contributions?.length ?? 0})
                      </h3>
                      {(q.data.contributions ?? []).length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Aucune contribution demandée.
                        </p>
                      ) : (
                        <ul className="mb-3 space-y-2">
                          {(q.data.contributions ?? []).map((c) => (
                            <li
                              key={c.id}
                              className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-sm"
                            >
                              <p className="font-medium">
                                {displayLabel(c.assigneeLabel, 'Destinataire')} ·{' '}
                                {c.status}
                              </p>
                              <p className="text-muted-foreground">{c.instruction}</p>
                              {canUpdate && c.status === 'SUBMITTED' ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="mt-2 min-h-11 sm:min-h-9"
                                  disabled={contribAcceptMut.isPending}
                                  onClick={() => contribAcceptMut.mutate(c.id)}
                                >
                                  Accepter
                                </Button>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      )}
                      {canUpdate ? (
                        <div className="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-3">
                          <div className="space-y-1.5">
                            <Label htmlFor="comp-contrib-assignee">Destinataire</Label>
                            <Select
                              value={contribAssigneeId}
                              onValueChange={(v) => setContribAssigneeId(v ?? '')}
                            >
                              <SelectTrigger id="comp-contrib-assignee" className="w-full">
                                <SelectValue placeholder="Choisir un membre">
                                  {contribAssigneeId
                                    ? memberLabel(
                                        members.find((m) => m.id === contribAssigneeId) ?? {
                                          id: contribAssigneeId,
                                          email: 'Membre',
                                          firstName: null,
                                          lastName: null,
                                          role: 'CLIENT_USER',
                                          status: 'ACTIVE',
                                        },
                                      )
                                    : null}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {members.map((m) => (
                                  <SelectItem key={m.id} value={m.id}>
                                    {memberLabel(m)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="comp-contrib-instr">Consigne</Label>
                            <Textarea
                              id="comp-contrib-instr"
                              value={contribInstruction}
                              onChange={(e) => setContribInstruction(e.target.value)}
                              rows={2}
                              className="min-h-0 text-foreground"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            className="min-h-11 sm:min-h-9"
                            disabled={
                              contribCreateMut.isPending ||
                              !contribAssigneeId ||
                              contribInstruction.trim().length < 3
                            }
                            onClick={() => contribCreateMut.mutate()}
                          >
                            Demander une contribution
                          </Button>
                        </div>
                      ) : null}
                    </section>

                    {showRiskCta ? (
                      <section>
                        <h3 className="starium-modal-seg-title">
                          Risques liés ({q.data.linkedRiskCount})
                        </h3>
                        {canUpdateProjects ? (
                          <Button
                            type="button"
                            variant="outline"
                            className="min-h-11 sm:min-h-9"
                            onClick={() => setRiskDialogOpen(true)}
                          >
                            Créer un risque lié
                          </Button>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Droit projets requis pour créer un risque.
                          </p>
                        )}
                      </section>
                    ) : null}
                  </div>
                </details>
              }
            />
            </StariumScrollArea>
          </>
        ) : (
          <p className="p-5 text-sm text-destructive" role="alert">
            Exigence introuvable.
          </p>
        )}
      </StariumModal>

      {requirementId && canUpdateProjects ? (
        <ProjectRiskEbiosDialog
          open={riskDialogOpen}
          onOpenChange={setRiskDialogOpen}
          mode="create"
          projectId={null}
          risk={null}
          isPending={createRiskMut.isPending}
          riskApiScope="client"
          projectOptions={projectList}
          defaultTitle={
            q.data
              ? `${q.data.requirement.code} — ${q.data.requirement.title}`
              : preview
                ? `${preview.code} — ${preview.title}`
                : undefined
          }
          defaultComplianceRequirementId={requirementId}
          onSave={async (payload) => {
            await createRiskMut.mutateAsync(payload);
          }}
        />
      ) : null}

      {(() => {
        const editing = (q.data?.evidences ?? []).find(
          (e) => e.id === editingEvidenceId,
        );
        const removing = (q.data?.evidences ?? []).find(
          (e) => e.id === removingEvidenceId,
        );
        const versioning = (q.data?.evidences ?? []).find(
          (e) => e.id === versioningEvidenceId,
        );
        return (
          <>
            <ComplianceEvidenceEditModal
              open={Boolean(editing)}
              onOpenChange={(o) => {
                if (!o) setEditingEvidenceId(null);
              }}
              evidenceName={editing?.name ?? ''}
              evidenceDescription={editing?.description}
              pending={evidencePatchMut.isPending}
              onSave={(payload) => evidencePatchMut.mutate(payload)}
            />
            <ComplianceEvidenceRemoveModal
              open={Boolean(removing)}
              onOpenChange={(o) => {
                if (!o) setRemovingEvidenceId(null);
              }}
              evidenceName={removing?.name ?? ''}
              pending={evidenceDeleteMut.isPending}
              onConfirm={() => evidenceDeleteMut.mutate()}
            />
            <ComplianceEvidenceVersionModal
              open={Boolean(versioning)}
              onOpenChange={(o) => {
                if (!o) setVersioningEvidenceId(null);
              }}
              evidenceName={versioning?.name ?? ''}
              pending={evidenceVersionMut.isPending}
              onConfirm={() => evidenceVersionMut.mutate()}
            />
            {requirementId ? (
              <ComplianceEvidenceReuseModal
                open={reuseOpen}
                onOpenChange={setReuseOpen}
                requirementId={requirementId}
                pending={evidenceReuseMut.isPending}
                onReuse={(sourceEvidenceId) =>
                  evidenceReuseMut.mutate(sourceEvidenceId)
                }
              />
            ) : null}
          </>
        );
      })()}

      <ComplianceRemediationPlanModal
        open={remediationPlanOpen}
        onOpenChange={setRemediationPlanOpen}
        requirementId={requirementId}
        requirementLabel={
          q.data
            ? firstDisplayLabel(
                [
                  `${q.data.requirement.code} — ${q.data.requirement.title}`,
                ],
                'Exigence',
              )
            : preview
              ? firstDisplayLabel(
                  [`${preview.code} — ${preview.title}`],
                  'Exigence',
                )
              : 'Exigence'
        }
        defaultTitle={
          gapTitle.trim() ||
          (q.data
            ? `Remédier — ${q.data.requirement.code} ${q.data.requirement.title}`.slice(
                0,
                200,
              )
            : undefined)
        }
      />
    </>
  );
}
