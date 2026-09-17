'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react';
import { StariumModal } from '@/components/layout/form-dialog-shell';
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
import { displayLabel } from '@/lib/display-label';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { PROJECT_RISK_CRITICALITY_LABEL } from '@/features/projects/constants/project-enum-labels';
import {
  createClientRisk,
  listProjects,
  type CreateProjectRiskPayload,
} from '@/features/projects/api/projects.api';
import { ProjectRiskEbiosDialog } from '@/features/projects/components/project-risk-ebios-dialog';
import {
  approveComplianceNa,
  cancelComplianceNa,
  createComplianceContribution,
  createComplianceEvidence,
  createComplianceEvidenceVersion,
  createComplianceGap,
  getComplianceRequirementDetail,
  patchComplianceContribution,
  patchComplianceEvidence,
  patchComplianceGap,
  rejectComplianceNa,
  requestComplianceNa,
  upsertComplianceRequirementStatus,
  type ComplianceAssessmentStatusApi,
  type ComplianceEvidenceAssessmentApi,
  type ComplianceEvidenceKindApi,
  type ComplianceRequirementRowApi,
} from '../api/compliance.api';
import { useClientMembers } from '@/features/client-rbac/hooks/use-client-members';
import type { ClientMember } from '@/features/client-rbac/api/user-roles';
import { frameworkDisplayLabel } from '../lib/compliance-labels';
import {
  ComplianceStatusDisplay,
  complianceStatusLabel,
} from './compliance-status-display';

const EVAL_STATUS_OPTIONS: Array<{
  value: ComplianceAssessmentStatusApi;
  label: string;
}> = [
  { value: 'COMPLIANT', label: complianceStatusLabel('COMPLIANT') },
  { value: 'PARTIALLY_COMPLIANT', label: complianceStatusLabel('PARTIALLY_COMPLIANT') },
  { value: 'NON_COMPLIANT', label: complianceStatusLabel('NON_COMPLIANT') },
];

const CONTRIB_STATUS_LABEL: Record<string, string> = {
  TODO: 'À faire',
  IN_PROGRESS: 'En cours',
  BLOCKED: 'Bloquée',
  SUBMITTED: 'Soumise',
  ACCEPTED: 'Acceptée',
  NEEDS_MORE: 'À compléter',
};

const ASSESSMENT_LABEL: Record<ComplianceEvidenceAssessmentApi, string> = {
  TO_REVIEW: 'À examiner',
  RELEVANT: 'Pertinente',
  PARTIAL: 'Partielle',
  INSUFFICIENT: 'Insuffisante',
};

function memberLabel(m: ClientMember): string {
  const name = [m.firstName, m.lastName].filter(Boolean).join(' ').trim();
  return name || m.email;
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
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const queryClient = useQueryClient();
  const { has, isSuccess: permsSuccess } = usePermissions();
  const canUpdate = permsSuccess && has('compliance.update');
  const canUpdateProjects = permsSuccess && has('projects.update');

  const [status, setStatus] = useState<ComplianceAssessmentStatusApi>('COMPLIANT');
  const [comment, setComment] = useState('');
  const [reviewDate, setReviewDate] = useState('');
  const [evidenceKind, setEvidenceKind] = useState<ComplianceEvidenceKindApi>('OBSERVATION');
  const [evidenceName, setEvidenceName] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [evidenceDescription, setEvidenceDescription] = useState('');
  const [riskDialogOpen, setRiskDialogOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [naJustification, setNaJustification] = useState('');
  const [naReviewNote, setNaReviewNote] = useState('');
  const [contribAssigneeId, setContribAssigneeId] = useState('');
  const [contribInstruction, setContribInstruction] = useState('');
  const [contribDueAt, setContribDueAt] = useState('');
  const [gapTitle, setGapTitle] = useState('');
  const [gapFinding, setGapFinding] = useState('');

  const { data: members = [] } = useClientMembers();

  const q = useQuery({
    queryKey: ['compliance', 'requirement', clientId, requirementId],
    queryFn: () => getComplianceRequirementDetail(authFetch, requirementId!),
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
    setStatus(
      st && st !== 'NOT_APPLICABLE' ? st : 'COMPLIANT',
    );
    setComment(q.data.status?.comment ?? '');
    setReviewDate(toDateInput(q.data.status?.lastAssessmentDate));
    setFormError(null);
    setEvidenceName('');
    setEvidenceUrl('');
    setEvidenceDescription('');
    setEvidenceKind('OBSERVATION');
    setNaJustification(q.data.naRequest?.justification ?? '');
    setNaReviewNote(q.data.naRequest?.reviewNote ?? '');
  }, [open, q.data]);

  const titleCode = displayLabel(q.data?.requirement.code ?? preview?.code, 'Exigence');
  const titleLabel = displayLabel(
    q.data?.requirement.title ?? preview?.title,
    'Détail de l’exigence',
  );
  const frameworkLabel = preview
    ? frameworkDisplayLabel(preview.framework)
    : q.data?.requirement.framework
      ? frameworkDisplayLabel(q.data.requirement.framework)
      : null;

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

  const saveMut = useMutation({
    mutationFn: () =>
      upsertComplianceRequirementStatus(authFetch, requirementId!, {
        status,
        comment: comment.trim(),
        lastAssessmentDate: dateInputToIso(reviewDate) ?? null,
      }),
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
        url: evidenceKind === 'URL' ? evidenceUrl.trim() : undefined,
        description:
          evidenceKind === 'OBSERVATION'
            ? evidenceDescription.trim()
            : evidenceDescription.trim() || undefined,
      }),
    onSuccess: async () => {
      toast.success('Preuve ajoutée');
      setEvidenceName('');
      setEvidenceUrl('');
      setEvidenceDescription('');
      invalidateComplianceQueries(queryClient, clientId);
      await q.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const naRequestMut = useMutation({
    mutationFn: () =>
      requestComplianceNa(authFetch, requirementId!, naJustification.trim()),
    onSuccess: async () => {
      toast.success('Demande de non-applicabilité envoyée');
      invalidateComplianceQueries(queryClient, clientId);
      await q.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const naApproveMut = useMutation({
    mutationFn: () =>
      approveComplianceNa(
        authFetch,
        requirementId!,
        naReviewNote.trim() || undefined,
      ),
    onSuccess: async () => {
      toast.success('Non-applicabilité approuvée');
      invalidateComplianceQueries(queryClient, clientId);
      await q.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const naRejectMut = useMutation({
    mutationFn: () =>
      rejectComplianceNa(authFetch, requirementId!, naReviewNote.trim()),
    onSuccess: async () => {
      toast.success('Demande refusée');
      invalidateComplianceQueries(queryClient, clientId);
      await q.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const naCancelMut = useMutation({
    mutationFn: () => cancelComplianceNa(authFetch, requirementId!),
    onSuccess: async () => {
      toast.success('Demande annulée');
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
        dueAt: contribDueAt ? `${contribDueAt}T12:00:00.000Z` : undefined,
      }),
    onSuccess: async () => {
      toast.success('Contribution demandée');
      setContribInstruction('');
      setContribDueAt('');
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

  const evidenceAssessMut = useMutation({
    mutationFn: ({
      id,
      assessment,
    }: {
      id: string;
      assessment: ComplianceEvidenceAssessmentApi;
    }) => patchComplianceEvidence(authFetch, id, { assessment }),
    onSuccess: async () => {
      toast.success('Appréciation enregistrée');
      invalidateComplianceQueries(queryClient, clientId);
      await q.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const evidenceVersionMut = useMutation({
    mutationFn: (id: string) => createComplianceEvidenceVersion(authFetch, id),
    onSuccess: async () => {
      toast.success('Nouvelle version de preuve créée');
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
      await q.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const gapCloseMut = useMutation({
    mutationFn: (id: string) =>
      patchComplianceGap(authFetch, id, {
        status: 'CLOSED',
        verificationNote: 'Vérifié depuis la fiche exigence',
      }),
    onSuccess: async () => {
      toast.success('Écart clôturé');
      invalidateComplianceQueries(queryClient, clientId);
      await q.refetch();
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

  return (
    <>
      <StariumModal
        open={open}
        onOpenChange={onOpenChange}
        title={titleLabel}
        description={
          frameworkLabel ? `${titleCode} · ${frameworkLabel}` : titleCode
        }
        icon={ShieldCheck}
        size="xl"
        footer={
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              {onNavigate && navigationIds.length > 1 ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="min-h-11 min-w-11 sm:min-h-9 sm:min-w-9"
                    disabled={!canGoPrev}
                    aria-label="Exigence précédente"
                    onClick={() => {
                      if (!canGoPrev) return;
                      onNavigate(navigationIds[navIndex - 1]!);
                    }}
                  >
                    <ChevronLeft className="size-4" aria-hidden />
                  </Button>
                  <span className="px-1 text-xs tabular-nums text-muted-foreground" aria-live="polite">
                    {navIndex >= 0 ? `${navIndex + 1} / ${navigationIds.length}` : null}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="min-h-11 min-w-11 sm:min-h-9 sm:min-w-9"
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
            <Button
              type="button"
              variant="outline"
              className="min-h-11 sm:min-h-9"
              onClick={() => onOpenChange(false)}
            >
              Fermer
            </Button>
          </div>
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
            {needsReview ? (
              <p
                className="rounded-lg border border-border/70 bg-[color:var(--state-warning-bg)] px-3 py-2 text-sm font-semibold text-[color:var(--state-warning)]"
                role="status"
                aria-live="polite"
              >
                À réexaminer — dernière évaluation il y a plus de {REVIEW_MONTHS} mois.
              </p>
            ) : null}

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
              {!canUpdate ? (
                <div className="space-y-2">
                  <ComplianceStatusDisplay
                    status={q.data.status?.status ?? 'NOT_ASSESSED'}
                  />
                  <p className="text-sm text-muted-foreground">
                    {q.data.status?.comment?.trim()
                      ? q.data.status.comment
                      : 'Aucun commentaire d’analyse.'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Lecture seule — permission compliance.update requise pour évaluer.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <span id="comp-eval-status-label" className="text-sm font-medium">
                      Statut
                    </span>
                    <div
                      role="radiogroup"
                      aria-labelledby="comp-eval-status-label"
                      className="starium-tab-group flex flex-wrap gap-2"
                    >
                      {EVAL_STATUS_OPTIONS.map((opt) => {
                        const selected = status === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            className={cn(
                              'starium-tab-btn min-h-11 px-3 text-sm sm:min-h-9',
                              selected && 'starium-tab-btn--active',
                            )}
                            onClick={() => setStatus(opt.value)}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="comp-eval-comment">Commentaire d’analyse</Label>
                    <Textarea
                      id="comp-eval-comment"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={3}
                      className="text-foreground"
                      aria-required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="comp-eval-date">Date de revue</Label>
                    <Input
                      id="comp-eval-date"
                      type="date"
                      value={reviewDate}
                      onChange={(e) => setReviewDate(e.target.value)}
                      className="text-foreground"
                    />
                  </div>
                  {formError ? (
                    <p className="text-sm text-destructive" role="alert">
                      {formError}
                    </p>
                  ) : null}
                  <Button
                    type="button"
                    className="min-h-11 sm:min-h-9"
                    disabled={saveMut.isPending}
                    onClick={() => saveMut.mutate()}
                  >
                    {saveMut.isPending ? 'Enregistrement…' : 'Enregistrer l’évaluation'}
                  </Button>
                </div>
              )}
            </section>

            <section aria-labelledby="comp-na-heading">
              <h3 id="comp-na-heading" className="starium-modal-seg-title">
                Non-applicabilité
              </h3>
              {q.data.status?.status === 'NOT_APPLICABLE' ? (
                <p className="text-sm text-muted-foreground" aria-live="polite">
                  Exigence non applicable
                  {q.data.naRequest?.justification
                    ? ` — ${q.data.naRequest.justification}`
                    : q.data.status.comment
                      ? ` — ${q.data.status.comment}`
                      : ''}
                  .
                </p>
              ) : q.data.naRequest?.status === 'PENDING' ? (
                <div className="space-y-3 rounded-lg border border-border/70 bg-muted/30 p-3">
                  <p className="text-sm" aria-live="polite">
                    Demande en attente : {q.data.naRequest.justification}
                  </p>
                  {canUpdate ? (
                    <>
                      <div className="space-y-1.5">
                        <Label htmlFor="comp-na-review">Note de revue (refus obligatoire)</Label>
                        <Textarea
                          id="comp-na-review"
                          value={naReviewNote}
                          onChange={(e) => setNaReviewNote(e.target.value)}
                          rows={2}
                          className="text-foreground"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          className="min-h-11 sm:min-h-9"
                          disabled={naApproveMut.isPending}
                          onClick={() => naApproveMut.mutate()}
                        >
                          Approuver
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="min-h-11 sm:min-h-9"
                          disabled={
                            naRejectMut.isPending || !naReviewNote.trim()
                          }
                          onClick={() => naRejectMut.mutate()}
                        >
                          Refuser
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="min-h-11 sm:min-h-9"
                          disabled={naCancelMut.isPending}
                          onClick={() => naCancelMut.mutate()}
                        >
                          Annuler la demande
                        </Button>
                      </div>
                    </>
                  ) : null}
                </div>
              ) : canUpdate ? (
                <div className="space-y-3">
                  {q.data.naRequest?.status === 'REJECTED' ? (
                    <p className="text-sm text-muted-foreground" aria-live="polite">
                      Dernière demande refusée
                      {q.data.naRequest.reviewNote
                        ? ` : ${q.data.naRequest.reviewNote}`
                        : '.'}
                    </p>
                  ) : null}
                  <div className="space-y-1.5">
                    <Label htmlFor="comp-na-just">Justification</Label>
                    <Textarea
                      id="comp-na-just"
                      value={naJustification}
                      onChange={(e) => setNaJustification(e.target.value)}
                      rows={2}
                      className="text-foreground"
                      aria-required
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 sm:min-h-9"
                    disabled={
                      naRequestMut.isPending || naJustification.trim().length < 3
                    }
                    onClick={() => naRequestMut.mutate()}
                  >
                    Demander la non-applicabilité
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aucune demande de non-applicabilité.
                </p>
              )}
            </section>

            <section aria-labelledby="comp-contrib-heading">
              <h3 id="comp-contrib-heading" className="starium-modal-seg-title">
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
                        {CONTRIB_STATUS_LABEL[c.status] ?? c.status}
                      </p>
                      <p className="text-muted-foreground">{c.instruction}</p>
                      {c.response ? (
                        <p className="mt-1 text-xs">Réponse : {c.response}</p>
                      ) : null}
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
                      value={contribAssigneeId || undefined}
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
                      className="text-foreground"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="comp-contrib-due">Échéance</Label>
                    <Input
                      id="comp-contrib-due"
                      type="date"
                      value={contribDueAt}
                      onChange={(e) => setContribDueAt(e.target.value)}
                      className="text-foreground"
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

            <section aria-labelledby="comp-gaps-heading">
              <h3 id="comp-gaps-heading" className="starium-modal-seg-title">
                Écarts ({q.data.gaps?.length ?? 0})
              </h3>
              {(q.data.gaps ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun écart.</p>
              ) : (
                <ul className="mb-3 space-y-2">
                  {(q.data.gaps ?? []).map((g) => (
                    <li
                      key={g.id}
                      className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-sm"
                    >
                      <p className="font-medium">
                        {displayLabel(g.title, 'Écart')} · {g.status} ·{' '}
                        {g.criticality}
                      </p>
                      <p className="text-muted-foreground">{g.finding}</p>
                      {canUpdate &&
                      g.status !== 'CLOSED' &&
                      g.status !== 'CANCELLED' ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="mt-2 min-h-11 sm:min-h-9"
                          disabled={gapCloseMut.isPending}
                          onClick={() => gapCloseMut.mutate(g.id)}
                        >
                          Clôturer
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
              {canUpdate ? (
                <div className="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="comp-gap-title">Titre</Label>
                    <Input
                      id="comp-gap-title"
                      value={gapTitle}
                      onChange={(e) => setGapTitle(e.target.value)}
                      className="text-foreground"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="comp-gap-finding">Constat</Label>
                    <Textarea
                      id="comp-gap-finding"
                      value={gapFinding}
                      onChange={(e) => setGapFinding(e.target.value)}
                      rows={2}
                      className="text-foreground"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 sm:min-h-9"
                    disabled={
                      gapCreateMut.isPending ||
                      gapTitle.trim().length < 3 ||
                      gapFinding.trim().length < 3
                    }
                    onClick={() => gapCreateMut.mutate()}
                  >
                    Créer un écart
                  </Button>
                </div>
              ) : null}
            </section>

            <section>
              <h3 className="starium-modal-seg-title">
                Preuves ({q.data.evidences.length})
              </h3>
              {q.data.evidences.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune preuve jointe.</p>
              ) : (
                <ul className="mb-3 space-y-2">
                  {q.data.evidences.map((e) => (
                    <li
                      key={e.id}
                      className="space-y-2 rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-sm"
                    >
                      <div>
                        <span className="font-medium text-foreground">
                          {displayLabel(e.name, 'Preuve')}
                        </span>
                        {e.version ? (
                          <span className="ml-2 text-xs text-muted-foreground">
                            v{e.version}
                          </span>
                        ) : null}
                        {e.kind ? (
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({e.kind === 'URL'
                              ? 'Lien'
                              : e.kind === 'FILE'
                                ? 'Fichier'
                                : 'Observation'}
                            )
                          </span>
                        ) : null}
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
                        {e.description && !e.url ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {e.description}
                          </p>
                        ) : null}
                      </div>
                      {canUpdate ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <Label
                            htmlFor={`ev-assess-${e.id}`}
                            className="sr-only"
                          >
                            Appréciation
                          </Label>
                          <Select
                            value={e.assessment ?? 'TO_REVIEW'}
                            onValueChange={(v) =>
                              evidenceAssessMut.mutate({
                                id: e.id,
                                assessment:
                                  (v as ComplianceEvidenceAssessmentApi) ??
                                  'TO_REVIEW',
                              })
                            }
                          >
                            <SelectTrigger
                              id={`ev-assess-${e.id}`}
                              className="h-11 w-full min-w-[10rem] sm:h-9 sm:w-44"
                            >
                              <SelectValue>
                                {ASSESSMENT_LABEL[
                                  (e.assessment ??
                                    'TO_REVIEW') as ComplianceEvidenceAssessmentApi
                                ]}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {(
                                Object.keys(
                                  ASSESSMENT_LABEL,
                                ) as ComplianceEvidenceAssessmentApi[]
                              ).map((k) => (
                                <SelectItem key={k} value={k}>
                                  {ASSESSMENT_LABEL[k]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="min-h-11 sm:min-h-9"
                            disabled={evidenceVersionMut.isPending}
                            onClick={() => evidenceVersionMut.mutate(e.id)}
                          >
                            Nouvelle version
                          </Button>
                        </div>
                      ) : e.assessment ? (
                        <p className="text-xs text-muted-foreground">
                          {ASSESSMENT_LABEL[e.assessment]}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
              {canUpdate ? (
                <div className="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-3">
                  <p className="text-xs font-semibold text-foreground">Ajouter une preuve</p>
                  <div className="space-y-1.5">
                    <Label htmlFor="comp-ev-kind">Type</Label>
                    <Select
                      value={evidenceKind}
                      onValueChange={(v) =>
                        setEvidenceKind((v ?? 'OBSERVATION') as ComplianceEvidenceKindApi)
                      }
                    >
                      <SelectTrigger id="comp-ev-kind" className="w-full">
                        <SelectValue>
                          {evidenceKind === 'URL'
                            ? 'Lien URL'
                            : evidenceKind === 'FILE'
                              ? 'Fichier'
                              : 'Observation'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OBSERVATION">Observation</SelectItem>
                        <SelectItem value="URL">Lien URL</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="comp-ev-name">Titre</Label>
                    <Input
                      id="comp-ev-name"
                      value={evidenceName}
                      onChange={(e) => setEvidenceName(e.target.value)}
                      className="text-foreground"
                    />
                  </div>
                  {evidenceKind === 'URL' ? (
                    <div className="space-y-1.5">
                      <Label htmlFor="comp-ev-url">URL</Label>
                      <Input
                        id="comp-ev-url"
                        type="url"
                        value={evidenceUrl}
                        onChange={(e) => setEvidenceUrl(e.target.value)}
                        className="text-foreground"
                        placeholder="https://…"
                      />
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label htmlFor="comp-ev-desc">Observation</Label>
                      <Textarea
                        id="comp-ev-desc"
                        value={evidenceDescription}
                        onChange={(e) => setEvidenceDescription(e.target.value)}
                        rows={2}
                        className="text-foreground"
                      />
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 sm:min-h-9"
                    disabled={evidenceMut.isPending || !evidenceName.trim()}
                    onClick={() => evidenceMut.mutate()}
                  >
                    {evidenceMut.isPending ? 'Ajout…' : 'Ajouter la preuve'}
                  </Button>
                </div>
              ) : null}
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
              {showRiskCta ? (
                <div className="mt-3">
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
                </div>
              ) : null}
            </section>
          </div>
        ) : (
          <p className="text-sm text-destructive" role="alert">
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
    </>
  );
}
