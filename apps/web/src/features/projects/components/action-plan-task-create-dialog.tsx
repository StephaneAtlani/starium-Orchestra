'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RegistryBadge } from '@/lib/ui/registry-badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useActiveClient } from '@/hooks/use-active-client';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { createActionPlanTask } from '@/features/projects/api/action-plans.api';
import {
  listClientRisks,
  listHumanResourcesForTaskPickers,
  listProjectTaskPhases,
  listProjects,
} from '@/features/projects/api/projects.api';
import { useActionPlansListQuery } from '@/features/projects/hooks/use-action-plans-list-query';
import { projectQueryKeys } from '@/features/projects/lib/project-query-keys';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  CalendarClock,
  ClipboardList,
  CloudUpload,
  FolderKanban,
  Info,
  Layers,
  Link2,
  Loader2,
  UserRound,
} from 'lucide-react';

const FORM_STATUS_LABELS: Record<string, string> = {
  TODO: 'À faire',
  IN_PROGRESS: 'En cours',
  BLOCKED: 'Bloquée',
  DONE: 'Terminée',
  CANCELLED: 'Annulée',
};

const FORM_PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Basse',
  MEDIUM: 'Moyenne',
  HIGH: 'Haute',
  CRITICAL: 'Critique',
};

/** Encarts corps — FRONTEND_UI-UX.md §11.3.1 / §12.2 */
const dialogBodyEncartClass =
  'rounded-xl border border-border/70 bg-card p-4 shadow-sm';

/** Aligné formulaire projet — FRONTEND_UI-UX.md §11.1 */
const textareaClass = cn(
  'min-h-[88px] w-full resize-y rounded-lg border border-input bg-background px-2.5 py-2 text-sm transition-colors outline-none',
  'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
);

function formatResourcePerson(r: {
  firstName: string | null;
  name: string;
  code: string | null;
}): string {
  const label = [r.firstName, r.name].filter(Boolean).join(' ').trim();
  return label || r.code || '—';
}

function dateInputToIsoDay(s: string): string | undefined {
  if (!s.trim()) return undefined;
  return new Date(`${s}T12:00:00.000Z`).toISOString();
}

function parseTagsInput(raw: string): string[] | undefined {
  const parts = raw
    .split(/[,;]/)
    .map((x) => x.trim())
    .filter(Boolean);
  if (parts.length === 0) return undefined;
  return parts;
}

/** API `parseApiFormError` renvoie un objet `{ message }`, pas `Error`. */
function createTaskErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) {
    const m = (err as { message: unknown }).message;
    if (typeof m === 'string' && m.trim()) return m;
  }
  return 'Création de la tâche impossible.';
}

/**
 * Section formulaire en encart unique (icône + titre + aide + champs) — §11.3.1 corps.
 */
function DialogFormSection({
  id,
  title,
  description,
  icon: Icon,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  icon: ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id}>
      <div className={dialogBodyEncartClass}>
        <div className="flex gap-3">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
            aria-hidden
          >
            <Icon className="size-4" />
          </span>
          <div className="min-w-0 flex-1 border-b border-border/60 pb-3">
            <h2 id={id} className="text-sm font-semibold text-foreground">
              {title}
            </h2>
            {description ? (
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>
        <div className="space-y-3 pt-4">{children}</div>
      </div>
    </section>
  );
}

/** Valeurs initiales (ex. depuis fiche risque EBIOS). */
export type ActionPlanTaskCreatePrefill = {
  name?: string;
  description?: string | null;
  projectId?: string | null;
  riskId?: string | null;
};

export type ActionPlanTaskCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Plan cible fixe (page détail d’un plan). Si absent, un sélecteur de plan est affiché
   * (ex. ajout depuis le registre risque).
   */
  actionPlanId?: string;
  prefill?: ActionPlanTaskCreatePrefill | null;
  /** Titre / sous-titre optionnels (sinon libellés par défaut). */
  title?: string;
  description?: ReactNode;
  onCreated?: (payload: { actionPlanId: string }) => void;
};

export function ActionPlanTaskCreateDialog({
  open,
  onOpenChange,
  actionPlanId: fixedActionPlanId,
  prefill = null,
  title: dialogTitle = 'Nouvelle tâche dans le plan',
  description: dialogDescription,
  onCreated,
}: ActionPlanTaskCreateDialogProps) {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  const queriesEnabled = open && !!clientId;
  const needsPlanPick = !fixedActionPlanId;

  const actionPlansQuery = useActionPlansListQuery(
    { limit: 50, offset: 0 },
    { enabled: queriesEnabled && needsPlanPick },
  );

  const resourcesHuman = useQuery({
    queryKey: [...projectQueryKeys.all, 'human-resources-task-pickers', clientId],
    queryFn: () => listHumanResourcesForTaskPickers(authFetch),
    enabled: queriesEnabled,
  });

  const projectsMini = useQuery({
    queryKey: [...projectQueryKeys.all, 'action-plan-project-pick', clientId],
    queryFn: () => listProjects(authFetch, { page: 1, limit: 100 }),
    enabled: queriesEnabled,
  });

  const risksMini = useQuery({
    queryKey: projectQueryKeys.clientRisks(clientId),
    queryFn: () => listClientRisks(authFetch),
    enabled: queriesEnabled,
  });

  const humanResources = resourcesHuman.data?.items ?? [];

  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [creating, setCreating] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [tName, setTName] = useState('');
  const [tDescription, setTDescription] = useState('');
  const [tStatus, setTStatus] = useState('TODO');
  const [tPriority, setTPriority] = useState('MEDIUM');
  const [tProjectId, setTProjectId] = useState<string>('');
  const [tRiskId, setTRiskId] = useState<string>('');
  const [tPhaseId, setTPhaseId] = useState<string>('');
  const [tResponsibleResourceId, setTResponsibleResourceId] = useState<string>('');
  const [tPlannedStart, setTPlannedStart] = useState<string>('');
  const [tPlannedEnd, setTPlannedEnd] = useState<string>('');
  const [tEstimatedHours, setTEstimatedHours] = useState<string>('');
  const [tTagsRaw, setTTagsRaw] = useState<string>('');

  const effectivePlanId = fixedActionPlanId ?? selectedPlanId;

  const phasesPick = useQuery({
    queryKey: [...projectQueryKeys.all, 'task-phases-pick', clientId, tProjectId],
    queryFn: () => listProjectTaskPhases(authFetch, tProjectId),
    enabled: queriesEnabled && !!tProjectId,
  });

  const projectSelectItems = useMemo(() => {
    const items: Record<string, string> = { __none: 'Aucun' };
    for (const p of projectsMini.data?.items ?? []) {
      items[p.id] = `${p.code} — ${p.name}`;
    }
    return items;
  }, [projectsMini.data?.items]);

  const riskSelectItems = useMemo(() => {
    const items: Record<string, string> = { __none: 'Aucun' };
    for (const r of risksMini.data ?? []) {
      items[r.id] = `${r.code} — ${r.title}`;
    }
    return items;
  }, [risksMini.data]);

  const responsibleSelectItems = useMemo(() => {
    const items: Record<string, string> = { __none: 'Aucune ressource Humaine' };
    for (const r of humanResources) {
      items[r.id] = formatResourcePerson(r);
    }
    return items;
  }, [humanResources]);

  const phaseSelectItems = useMemo(() => {
    const items: Record<string, string> = { __none: 'Sans phase' };
    for (const ph of phasesPick.data ?? []) {
      items[ph.id] = ph.name;
    }
    return items;
  }, [phasesPick.data]);

  const actionPlanSelectItems = useMemo(() => {
    const rec: Record<string, string> = {};
    for (const p of actionPlansQuery.data?.items ?? []) {
      rec[p.id] = `${p.code} — ${p.title}`;
    }
    return rec;
  }, [actionPlansQuery.data?.items]);

  function resetTaskForm() {
    setTName('');
    setTDescription('');
    setTStatus('TODO');
    setTPriority('MEDIUM');
    setTProjectId('');
    setTRiskId('');
    setTPhaseId('');
    setTResponsibleResourceId('');
    setTPlannedStart('');
    setTPlannedEnd('');
    setTEstimatedHours('');
    setTTagsRaw('');
    setSelectedPlanId('');
  }

  function applyPrefill(p: ActionPlanTaskCreatePrefill) {
    setTName(p.name ?? '');
    setTDescription(p.description ?? '');
    setTStatus('TODO');
    setTPriority('MEDIUM');
    setTProjectId(p.projectId ?? '');
    setTRiskId(p.riskId ?? '');
    setTPhaseId('');
    setTResponsibleResourceId('');
    setTPlannedStart('');
    setTPlannedEnd('');
    setTEstimatedHours('');
    setTTagsRaw('');
  }

  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (open) {
      setSubmitError(null);
    }
    if (open && !wasOpenRef.current) {
      wasOpenRef.current = true;
      if (prefill) applyPrefill(prefill);
      else resetTaskForm();
    }
    if (!open) wasOpenRef.current = false;
  }, [open, prefill]);

  useEffect(() => {
    setTPhaseId('');
  }, [tProjectId]);

  useEffect(() => {
    if (!open || !needsPlanPick) return;
    const items = actionPlansQuery.data?.items;
    if (!items?.length) return;
    setSelectedPlanId((prev) => {
      if (prev && items.some((p) => p.id === prev)) return prev;
      return items[0].id;
    });
  }, [open, needsPlanPick, actionPlansQuery.data?.items]);

  async function onCreateTask() {
    if (creating) return;
    if (!tName.trim() || !effectivePlanId) return;
    setSubmitError(null);
    setCreating(true);
    try {
      const hoursRaw = tEstimatedHours.trim();
      const estimatedHoursParsed =
        hoursRaw === '' ? undefined : Number.parseFloat(hoursRaw.replace(',', '.'));
      const tags = parseTagsInput(tTagsRaw);
      await createActionPlanTask(authFetch, effectivePlanId, {
        name: tName.trim(),
        description: tDescription.trim() || null,
        status: tStatus,
        priority: tPriority,
        projectId: tProjectId || null,
        riskId: tRiskId || null,
        phaseId: tProjectId ? (tPhaseId || null) : null,
        responsibleResourceId: tResponsibleResourceId || null,
        plannedStartDate: dateInputToIsoDay(tPlannedStart) ?? null,
        plannedEndDate: dateInputToIsoDay(tPlannedEnd) ?? null,
        ...(estimatedHoursParsed !== undefined &&
          !Number.isNaN(estimatedHoursParsed) && {
            estimatedHours: estimatedHoursParsed,
          }),
        tags: tags ?? null,
      });
      await queryClient.invalidateQueries({
        queryKey: [...projectQueryKeys.all, 'action-plan-tasks', clientId, effectivePlanId],
      });
      await queryClient.invalidateQueries({
        queryKey: projectQueryKeys.actionPlanDetail(clientId, effectivePlanId),
      });
      await queryClient.invalidateQueries({
        queryKey: [...projectQueryKeys.all, 'action-plans', clientId],
      });
      const linkedRiskId = tRiskId || prefill?.riskId;
      if (linkedRiskId) {
        await queryClient.invalidateQueries({
          queryKey: projectQueryKeys.riskActionPlanTasks(clientId, linkedRiskId),
        });
      }
      onCreated?.({ actionPlanId: effectivePlanId });
      resetTaskForm();
      onOpenChange(false);
    } catch (err) {
      setSubmitError(createTaskErrorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  const hasPrefill = Boolean(prefill);

  /** Une phrase dans DialogDescription — le détail contextuel est en encart corps / ligne d’état (§11.3.1). */
  const headerDescription =
    dialogDescription ??
    (needsPlanPick && hasPrefill
      ? 'Choix du plan cible, puis fiche de tâche.'
      : needsPlanPick
        ? 'Plan cible puis fiche de tâche.'
        : hasPrefill
          ? 'Champs préremplis depuis le registre risque.'
          : 'Rattachements projet, risque et référent optionnels.');

  const prefillRiskSummary = useMemo(() => {
    const id = tRiskId || prefill?.riskId;
    if (!id) return null;
    const r = risksMini.data?.find((x) => x.id === id);
    return r ? { code: r.code, title: r.title } : null;
  }, [tRiskId, prefill?.riskId, risksMini.data]);

  const statusHint = needsPlanPick
    ? hasPrefill
      ? 'Saisie locale jusqu’à validation ; enregistrement serveur au clic.'
      : 'Étape 1 : plan — étape 2 : compléter et valider.'
    : 'Enregistrement au clic sur « Créer la tâche » (pas d’autosave).';

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) resetTaskForm();
      }}
    >
      <DialogContent
        showCloseButton
        className="flex max-h-[min(92vh,840px)] w-full flex-col gap-0 overflow-hidden p-4 sm:max-w-3xl"
      >
        <DialogHeader className="-mx-4 -mt-4 shrink-0 space-y-3 rounded-t-xl border-b border-border/60 bg-card pb-4 pl-7 pr-4 pt-4 text-left shadow-sm sm:pl-8">
          <div className="pr-8">
            <div className="flex flex-wrap items-center gap-2 gap-y-1">
              <DialogTitle className="text-left">{dialogTitle}</DialogTitle>
              {hasPrefill ? (
                <RegistryBadge className="shrink-0 border border-border bg-muted/50 text-muted-foreground">
                  Prérempli (risque)
                </RegistryBadge>
              ) : null}
            </div>
            <DialogDescription className="mt-2 text-left">{headerDescription}</DialogDescription>
          </div>
          <div
            className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            {creating ? (
              <>
                <Loader2 className="size-3.5 shrink-0 animate-spin text-primary" aria-hidden />
                <span>Création en cours…</span>
              </>
            ) : (
              <>
                <CloudUpload className="size-3.5 shrink-0 text-muted-foreground/90" aria-hidden />
                <span>{statusHint}</span>
              </>
            )}
          </div>
        </DialogHeader>

        <form
          className="flex min-h-0 flex-1 flex-col gap-0"
          onSubmit={(e) => {
            e.preventDefault();
            void onCreateTask();
          }}
          noValidate
        >
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-4">
            <div className="space-y-4 sm:space-y-5">
            {hasPrefill ? (
              <div className={dialogBodyEncartClass} role="note" aria-label="Contexte préremplissage">
                <div className="flex gap-3">
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
                    aria-hidden
                  >
                    <Info className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-sm text-foreground">
                      Tâche liée au risque{' '}
                      {prefillRiskSummary ? (
                        <>
                          <span className="font-mono font-medium text-foreground">
                            {prefillRiskSummary.code}
                          </span>
                          <span className="text-muted-foreground">
                            {' '}
                            — {prefillRiskSummary.title}
                          </span>
                        </>
                      ) : risksMini.isLoading ? (
                        <span className="text-muted-foreground">(chargement du registre…)</span>
                      ) : (
                        <span className="font-mono font-medium text-foreground">
                          {(tRiskId && riskSelectItems[tRiskId]?.split(' — ')[0]) ?? '—'}
                        </span>
                      )}
                    </p>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Intitulé, description et rattachements sont préremplis — vous pouvez les ajuster.
                    </p>
                    {needsPlanPick ? (
                      <p className="text-xs text-muted-foreground">
                        Étape 1 : choisir le plan · étape 2 : compléter la fiche et valider.
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            {needsPlanPick ? (
              <div className={dialogBodyEncartClass}>
                <div className="flex gap-3">
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
                    aria-hidden
                  >
                    <FolderKanban className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1 border-b border-border/60 pb-3">
                    <Label
                      htmlFor="ap-create-plan"
                      className="text-sm font-semibold text-foreground"
                    >
                      Plan d’action
                    </Label>
                    <p id="ap-create-plan-hint" className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                      La tâche sera ajoutée au plan sélectionné.
                    </p>
                  </div>
                </div>
                <div className="pt-4">
                  {actionPlansQuery.isLoading ? (
                    <p className="text-sm text-muted-foreground">Chargement des plans…</p>
                  ) : actionPlansQuery.data?.items?.length ? (
                    <Select
                      value={selectedPlanId}
                      items={actionPlanSelectItems}
                      onValueChange={(v) => setSelectedPlanId(v ?? '')}
                    >
                      <SelectTrigger
                        id="ap-create-plan"
                        className="h-10 w-full min-w-0"
                        aria-describedby="ap-create-plan-hint"
                      >
                        <SelectValue placeholder="Choisir un plan" />
                      </SelectTrigger>
                      <SelectContent>
                        {actionPlansQuery.data.items.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.code} — {p.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Aucun plan sur ce client.{' '}
                      <Link
                        href="/action-plans"
                        className="font-medium text-primary underline-offset-4 hover:underline"
                      >
                        Créer un plan d’action
                      </Link>
                    </p>
                  )}
                </div>
              </div>
            ) : null}

            <DialogFormSection
              id="ap-task-content"
              title="Contenu"
              description="Intitulé obligatoire ; description recommandée pour le pilotage."
              icon={ClipboardList}
            >
              <div className="space-y-1.5">
                <Label htmlFor="ap-create-name">Intitulé</Label>
                <Input
                  id="ap-create-name"
                  value={tName}
                  onChange={(e) => setTName(e.target.value)}
                  placeholder="Nom de la tâche"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ap-create-desc">Description</Label>
                <textarea
                  id="ap-create-desc"
                  value={tDescription}
                  onChange={(e) => setTDescription(e.target.value)}
                  placeholder="Contexte, périmètre, critères de done…"
                  className={textareaClass}
                />
              </div>
            </DialogFormSection>

            <DialogFormSection
              id="ap-task-pilotage"
              title="Pilotage"
              description="Statut, priorité, échéances et charge."
              icon={Layers}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Statut</Label>
                  <Select
                    value={tStatus}
                    onValueChange={(v) => setTStatus(v ?? 'TODO')}
                    items={FORM_STATUS_LABELS}
                  >
                    <SelectTrigger className="w-full min-w-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TODO">À faire</SelectItem>
                      <SelectItem value="IN_PROGRESS">En cours</SelectItem>
                      <SelectItem value="BLOCKED">Bloquée</SelectItem>
                      <SelectItem value="DONE">Terminée</SelectItem>
                      <SelectItem value="CANCELLED">Annulée</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Priorité</Label>
                  <Select
                    value={tPriority}
                    onValueChange={(v) => setTPriority(v ?? 'MEDIUM')}
                    items={FORM_PRIORITY_LABELS}
                  >
                    <SelectTrigger className="w-full min-w-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Basse</SelectItem>
                      <SelectItem value="MEDIUM">Moyenne</SelectItem>
                      <SelectItem value="HIGH">Haute</SelectItem>
                      <SelectItem value="CRITICAL">Critique</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ap-create-tags">Tags</Label>
                <Input
                  id="ap-create-tags"
                  value={tTagsRaw}
                  onChange={(e) => setTTagsRaw(e.target.value)}
                  placeholder="virgules ou point-virgules"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="ap-create-start" className="inline-flex items-center gap-1.5">
                    <CalendarClock className="size-3.5 text-muted-foreground" aria-hidden />
                    Début planifié
                  </Label>
                  <Input
                    id="ap-create-start"
                    type="date"
                    value={tPlannedStart}
                    onChange={(e) => setTPlannedStart(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ap-create-end" className="inline-flex items-center gap-1.5">
                    <CalendarClock className="size-3.5 text-muted-foreground" aria-hidden />
                    Échéance
                  </Label>
                  <Input
                    id="ap-create-end"
                    type="date"
                    value={tPlannedEnd}
                    onChange={(e) => setTPlannedEnd(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5 sm:max-w-xs">
                <Label htmlFor="ap-create-hours">Charge estimée (h)</Label>
                <Input
                  id="ap-create-hours"
                  inputMode="decimal"
                  value={tEstimatedHours}
                  onChange={(e) => setTEstimatedHours(e.target.value)}
                  placeholder="ex. 4 ou 0,5"
                />
              </div>
            </DialogFormSection>

            <DialogFormSection
              id="ap-task-rattachements"
              title="Rattachements"
              description="Projet, phase, risque catalogue et référent ressource Humaine (catalogue RH)."
              icon={Link2}
            >
              <div className="space-y-1.5">
                <Label>Projet</Label>
                {projectsMini.isError && (
                  <Alert variant="destructive" className="py-2">
                    <AlertCircle />
                    <AlertTitle>Projets indisponibles</AlertTitle>
                    <AlertDescription>
                      Impossible de charger les projets (réseau ou droits).
                    </AlertDescription>
                  </Alert>
                )}
                {projectsMini.isSuccess && (projectsMini.data?.items?.length ?? 0) === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Aucun projet — laissez vide ou créez un projet dans le module Projets.
                  </p>
                )}
                <Select
                  value={tProjectId || '__none'}
                  onValueChange={(v) => setTProjectId(!v || v === '__none' ? '' : v)}
                  items={projectSelectItems}
                >
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue placeholder="Aucun" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Aucun</SelectItem>
                    {(projectsMini.data?.items ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.code} — {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {tProjectId ? (
                <div className="space-y-1.5">
                  <Label>Phase</Label>
                  <Select
                    value={tPhaseId || '__none'}
                    onValueChange={(v) => setTPhaseId(!v || v === '__none' ? '' : v)}
                    items={phaseSelectItems}
                  >
                    <SelectTrigger className="w-full min-w-0">
                      <SelectValue placeholder="Sans phase" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">Sans phase</SelectItem>
                      {(phasesPick.data ?? []).map((ph) => (
                        <SelectItem key={ph.id} value={ph.id}>
                          {ph.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              <div className="space-y-1.5">
                <Label>Risque</Label>
                <Select
                  value={tRiskId || '__none'}
                  onValueChange={(v) => setTRiskId(!v || v === '__none' ? '' : v)}
                  items={riskSelectItems}
                >
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue placeholder="Aucun" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Aucun</SelectItem>
                    {(risksMini.data ?? []).map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.code} — {r.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="inline-flex items-center gap-1.5">
                  <UserRound className="size-3.5 text-muted-foreground" aria-hidden />
                  Responsable ressource Humaine (référent métier)
                </Label>
                {resourcesHuman.isError && (
                  <Alert variant="destructive" className="py-2">
                    <AlertCircle />
                    <AlertTitle>Répertoire Humaine</AlertTitle>
                    <AlertDescription>
                      Impossible de charger le répertoire (réseau ou droits).
                    </AlertDescription>
                  </Alert>
                )}
                {resourcesHuman.isSuccess && humanResources.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Aucune fiche ressource Humaine — laissez vide ou enrichissez le catalogue.
                  </p>
                )}
                <Select
                  value={tResponsibleResourceId || '__none'}
                  onValueChange={(v) =>
                    setTResponsibleResourceId(!v || v === '__none' ? '' : v)
                  }
                  items={responsibleSelectItems}
                >
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue placeholder="Aucune ressource Humaine" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Aucune ressource Humaine</SelectItem>
                    {humanResources.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {formatResourcePerson(r)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Ressource Humaine du catalogue RH — distincte d’un compte utilisateur Starium.
                </p>
              </div>
            </DialogFormSection>
            </div>
          </div>

          {submitError ? (
            <div className="shrink-0 px-0 pt-2">
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="size-4" />
                <AlertTitle>Création impossible</AlertTitle>
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button
              type="button"
              disabled={
                creating ||
                !tName.trim() ||
                !effectivePlanId ||
                (needsPlanPick && !actionPlansQuery.data?.items?.length)
              }
              onClick={() => void onCreateTask()}
            >
              {creating ? 'Création…' : 'Créer la tâche'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
