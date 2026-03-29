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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  CalendarClock,
  ClipboardList,
  FolderKanban,
  Layers,
  Link2,
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

const textareaClass = cn(
  'flex min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs',
  'outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
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

function FormSection({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  icon?: ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('space-y-3', className)}>
      <h3 className="flex items-center gap-2 border-b border-border/50 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {Icon ? <Icon className="size-3.5 shrink-0 opacity-80" aria-hidden /> : null}
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
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
    const items: Record<string, string> = { __none: 'Aucune personne' };
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
    if (!tName.trim() || !effectivePlanId) return;
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
      onCreated?.({ actionPlanId: effectivePlanId });
      onOpenChange(false);
      resetTaskForm();
    } finally {
      setCreating(false);
    }
  }

  const defaultDescription =
    dialogDescription ??
    (needsPlanPick
      ? 'Choisissez le plan, complétez la fiche puis validez.'
      : 'Complétez les champs puis créez la tâche dans ce plan.');

  const hasPrefill = Boolean(prefill);

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
        className="flex max-h-[min(92vh,840px)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
      >
        <DialogHeader className="shrink-0 space-y-3 border-b border-border/60 bg-muted/20 px-5 py-4 text-left">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <DialogTitle className="pr-8 text-left text-base font-semibold leading-snug tracking-tight sm:text-lg">
              {dialogTitle}
            </DialogTitle>
            {hasPrefill ? (
              <Badge
                variant="secondary"
                className="shrink-0 border border-border/60 bg-background/80 text-[0.65rem] font-normal text-muted-foreground"
              >
                Prérempli (risque)
              </Badge>
            ) : null}
          </div>
          {defaultDescription ? (
            <DialogDescription className="text-left text-sm leading-relaxed">
              {defaultDescription}
            </DialogDescription>
          ) : null}
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          <div className="space-y-6">
            {needsPlanPick ? (
              <div className="rounded-xl border border-border/70 bg-muted/30 p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary"
                    aria-hidden
                  >
                    <FolderKanban className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">Plan d’action cible</p>
                    <p className="text-xs text-muted-foreground">
                      La tâche sera créée dans ce plan.
                    </p>
                  </div>
                </div>
                {actionPlansQuery.isLoading ? (
                  <p className="text-sm text-muted-foreground">Chargement des plans…</p>
                ) : actionPlansQuery.data?.items?.length ? (
                  <Select
                    value={selectedPlanId}
                    items={actionPlanSelectItems}
                    onValueChange={(v) => setSelectedPlanId(v ?? '')}
                  >
                    <SelectTrigger id="ap-create-plan" className="h-10 w-full min-w-0 bg-background">
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
            ) : null}

            <FormSection title="Contenu" icon={ClipboardList}>
              <div className="space-y-1.5">
                <Label htmlFor="ap-create-name" className="text-xs text-muted-foreground">
                  Intitulé
                </Label>
                <Input
                  id="ap-create-name"
                  value={tName}
                  onChange={(e) => setTName(e.target.value)}
                  placeholder="Nom de la tâche"
                  className="bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ap-create-desc" className="text-xs text-muted-foreground">
                  Description
                </Label>
                <textarea
                  id="ap-create-desc"
                  value={tDescription}
                  onChange={(e) => setTDescription(e.target.value)}
                  placeholder="Contexte, périmètre, critères de done…"
                  className={cn(textareaClass, 'bg-background')}
                />
                <p className="text-xs text-muted-foreground">
                  Recommandé pour le pilotage et le cadrage partagé.
                </p>
              </div>
            </FormSection>

            <FormSection title="Pilotage" icon={Layers}>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Statut</Label>
                  <Select
                    value={tStatus}
                    onValueChange={(v) => setTStatus(v ?? 'TODO')}
                    items={FORM_STATUS_LABELS}
                  >
                    <SelectTrigger className="w-full min-w-0 bg-background">
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
                  <Label className="text-xs text-muted-foreground">Priorité</Label>
                  <Select
                    value={tPriority}
                    onValueChange={(v) => setTPriority(v ?? 'MEDIUM')}
                    items={FORM_PRIORITY_LABELS}
                  >
                    <SelectTrigger className="w-full min-w-0 bg-background">
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
                <Label htmlFor="ap-create-tags" className="text-xs text-muted-foreground">
                  Tags
                </Label>
                <Input
                  id="ap-create-tags"
                  value={tTagsRaw}
                  onChange={(e) => setTTagsRaw(e.target.value)}
                  placeholder="virgules ou point-virgules"
                  className="bg-background"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="ap-create-start" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarClock className="size-3 opacity-70" aria-hidden />
                    Début planifié
                  </Label>
                  <Input
                    id="ap-create-start"
                    type="date"
                    value={tPlannedStart}
                    onChange={(e) => setTPlannedStart(e.target.value)}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ap-create-end" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarClock className="size-3 opacity-70" aria-hidden />
                    Échéance
                  </Label>
                  <Input
                    id="ap-create-end"
                    type="date"
                    value={tPlannedEnd}
                    onChange={(e) => setTPlannedEnd(e.target.value)}
                    className="bg-background"
                  />
                </div>
              </div>
              <div className="space-y-1.5 sm:max-w-[50%]">
                <Label htmlFor="ap-create-hours" className="text-xs text-muted-foreground">
                  Charge estimée (h)
                </Label>
                <Input
                  id="ap-create-hours"
                  inputMode="decimal"
                  value={tEstimatedHours}
                  onChange={(e) => setTEstimatedHours(e.target.value)}
                  placeholder="ex. 4 ou 0,5"
                  className="bg-background"
                />
              </div>
            </FormSection>

            <FormSection title="Rattachements" icon={Link2}>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Projet</Label>
                {projectsMini.isError && (
                  <p className="text-xs text-destructive">
                    Impossible de charger les projets (réseau ou droits).
                  </p>
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
                  <SelectTrigger className="w-full min-w-0 bg-background">
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
                  <Label className="text-xs text-muted-foreground">Phase</Label>
                  <Select
                    value={tPhaseId || '__none'}
                    onValueChange={(v) => setTPhaseId(!v || v === '__none' ? '' : v)}
                    items={phaseSelectItems}
                  >
                    <SelectTrigger className="w-full min-w-0 bg-background">
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
                <Label className="text-xs text-muted-foreground">Risque</Label>
                <Select
                  value={tRiskId || '__none'}
                  onValueChange={(v) => setTRiskId(!v || v === '__none' ? '' : v)}
                  items={riskSelectItems}
                >
                  <SelectTrigger className="w-full min-w-0 bg-background">
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
                <Label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <UserRound className="size-3 opacity-70" aria-hidden />
                  Responsable personne (référent métier)
                </Label>
                {resourcesHuman.isError && (
                  <p className="text-xs text-destructive">
                    Impossible de charger le répertoire personnes.
                  </p>
                )}
                {resourcesHuman.isSuccess && humanResources.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Aucune fiche personne — laissez vide ou enrichissez le catalogue.
                  </p>
                )}
                <Select
                  value={tResponsibleResourceId || '__none'}
                  onValueChange={(v) =>
                    setTResponsibleResourceId(!v || v === '__none' ? '' : v)
                  }
                  items={responsibleSelectItems}
                >
                  <SelectTrigger className="w-full min-w-0 bg-background">
                    <SelectValue placeholder="Aucune personne" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Aucune personne</SelectItem>
                    {humanResources.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {formatResourcePerson(r)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Personne du catalogue RH — distincte d’un compte utilisateur Starium.
                </p>
              </div>
            </FormSection>
          </div>
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border/60 bg-muted/30 px-5 py-4 sm:flex-row sm:justify-end">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
