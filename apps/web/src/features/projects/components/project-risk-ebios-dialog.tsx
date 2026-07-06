'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import {
  Dialog,
  DialogBody,
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { usePermissions } from '@/hooks/use-permissions';
import {
  getClientRisk,
  getProjectRisk,
  getRiskTaxonomyCatalog,
  listAssignableUsers,
  listHumanResourcesForTaskPickers,
  listRiskActionPlanTasks,
} from '../api/projects.api';
import type { ResourceListItem } from '@/services/resources';
import type { CreateProjectRiskPayload } from '../api/projects.api';
import {
  ActionPlanTaskCreateDialog,
  type ActionPlanTaskCreatePrefill,
} from './action-plan-task-create-dialog';
import { ActionPlanTaskEditDialog } from './action-plan-task-edit-dialog';
import { projectQueryKeys } from '../lib/project-query-keys';
import { useDebouncedServerAutosave } from '@/hooks/use-debounced-server-autosave';
import type {
  ProjectListItem,
  ProjectRiskApi,
  ProjectRiskCriticalityLevel,
  RiskLinkedActionPlanTaskApi,
} from '../types/project.types';
import {
  PROJECT_RISK_CRITICALITY_LABEL,
  RISK_PI_SCALE_LABEL,
  RISK_STATUS_LABEL,
  RISK_TREATMENT_STRATEGY_LABEL,
} from '../constants/project-enum-labels';
import {
  riskCriticalityDsBadgeClass,
  riskCriticalityLabel,
} from '../lib/project-risk-display';
import { Popover as PopoverPrimitive } from '@base-ui/react/popover';
import { ChevronDown, CloudUpload, ListPlus, Loader2 } from 'lucide-react';

const PI_OPTIONS = [1, 2, 3, 4, 5] as const;
const NONE = '__none__';
const OWNER_NONE = '__none__';
/** Rattachement projet facultatif — `POST/PATCH /api/risks`. */
const PROJECT_NONE = '__none__';

const TREATMENT_KEYS = ['AVOID', 'REDUCE', 'TRANSFER', 'ACCEPT'] as const;
const RESIDUAL_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

/** Affichage si `ownerUserId` n’est pas dans la liste assignable (évite l’UUID dans le trigger). */
const OWNER_UNKNOWN_LABEL = 'Responsable (hors liste — compte toujours lié au risque)';

const CRIT_ORDER: Record<string, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

function toDateInputValue(iso: string | null | undefined): string {
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

function stableRiskSnapshot(p: CreateProjectRiskPayload): string {
  const o = {
    projectId: p.projectId ?? '',
    title: p.title,
    fearedEvent: p.fearedEvent,
    threatSource: p.threatSource,
    description: p.description,
    businessImpact: p.businessImpact,
    riskTypeId: p.riskTypeId,
    likelihoodJustification: p.likelihoodJustification ?? '',
    probability: p.probability,
    impact: p.impact,
    existingSecurityMeasures: p.existingSecurityMeasures ?? '',
    mitigationPlan: p.mitigationPlan ?? '',
    contingencyPlan: p.contingencyPlan ?? '',
    status: p.status ?? 'OPEN',
    dueDate: p.dueDate ?? '',
    detectedAt: p.detectedAt ?? '',
    reviewDate: p.reviewDate ?? '',
    treatmentStrategy: p.treatmentStrategy,
    residualRiskLevel: p.residualRiskLevel ?? '',
    residualJustification: p.residualJustification ?? '',
    complementaryTreatmentMeasures: p.complementaryTreatmentMeasures ?? '',
    ownerUserId: p.ownerUserId ?? '',
  };
  return JSON.stringify(o);
}

/** Aligné sur `buildPayload` + champs dates comme à l’écran. */
function snapshotFromRisk(r: ProjectRiskApi): string {
  return stableRiskSnapshot({
    projectId: r.projectId ?? undefined,
    title: r.title.trim(),
    fearedEvent: r.fearedEvent.trim(),
    threatSource: r.threatSource.trim(),
    description: (r.description ?? '').trim(),
    businessImpact: r.businessImpact.trim(),
    riskTypeId: r.riskTypeId,
    likelihoodJustification: r.likelihoodJustification?.trim() || undefined,
    probability: r.probability,
    impact: r.impact,
    existingSecurityMeasures: r.existingSecurityMeasures?.trim() || undefined,
    mitigationPlan: r.mitigationPlan?.trim() || undefined,
    contingencyPlan: r.contingencyPlan?.trim() || undefined,
    status: r.status,
    dueDate: dateInputToIso(toDateInputValue(r.dueDate)),
    detectedAt: dateInputToIso(toDateInputValue(r.detectedAt)),
    reviewDate: dateInputToIso(toDateInputValue(r.reviewDate)),
    treatmentStrategy: r.treatmentStrategy,
    residualRiskLevel: r.residualRiskLevel ?? undefined,
    residualJustification: r.residualJustification?.trim() || undefined,
    complementaryTreatmentMeasures: r.complementaryTreatmentMeasures?.trim() || undefined,
    ownerUserId: r.ownerUserId ?? null,
  });
}

function formatUserLabel(u: {
  email: string;
  firstName: string | null;
  lastName: string | null;
}): string {
  const n = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  return n ? `${n} (${u.email})` : u.email;
}

/** Libellé pour une ressource HUMAN dont on choisit le `linkedUserId` comme responsable. */
function labelForHumanResourceOwner(r: ResourceListItem): string {
  const n = [r.firstName?.trim(), r.name.trim()].filter(Boolean).join(' ').trim();
  const mail = r.email?.trim();
  if (n && mail) return `${n} (${mail})`;
  if (n) return n;
  if (mail) return mail;
  return 'Ressource humaine';
}

function residualLevelDisplayLabel(value: string): string {
  if (value === NONE) return '';
  return PROJECT_RISK_CRITICALITY_LABEL[value] ?? 'Niveau enregistré';
}

function normalizeRiskSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

const selectTriggerLabelClass =
  'min-w-0 flex-1 truncate text-left text-sm leading-none';

const requiredAsteriskClass = 'ml-0.5 text-destructive';

const EBIOS_INPUT_CLASS = 'starium-form-input';
const EBIOS_TEXTAREA_CLASS = 'starium-form-textarea';
const EBIOS_SELECT_TRIGGER_CLASS =
  'starium-form-select h-[38px] w-full min-w-0 justify-between gap-2 px-3 text-left shadow-none';

function EbiosField({
  label,
  htmlFor,
  required,
  hint,
  children,
  className,
}: {
  label: ReactNode;
  htmlFor?: string;
  required?: boolean;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('starium-form-field', className)}>
      <label htmlFor={htmlFor} className="starium-form-label">
        {label}
        {required ? <span className={requiredAsteriskClass}>*</span> : null}
      </label>
      {children}
      {hint ? <p className="starium-form-hint">{hint}</p> : null}
    </div>
  );
}

function InitialRiskSummary({
  probability,
  impact,
  savedScore,
  savedLevel,
  piChanged,
}: {
  probability: number;
  impact: number;
  savedScore?: number;
  savedLevel?: string;
  piChanged?: boolean;
}) {
  const score = probability * impact;
  const level = criticalityLevelFromPiScore(score);
  return (
    <div className="starium-form-section starium-form-section--inline-summary">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-bold text-[color:var(--brand-ink)]">Risque initial (P×I)</span>
        <span className="tabular-nums text-lg font-extrabold">{score}</span>
        <span className={cn('starium-ds-badge', riskCriticalityDsBadgeClass(level))}>
          {riskCriticalityLabel(level)}
        </span>
        {piChanged && savedScore != null && savedLevel ? (
          <span className="text-xs font-semibold text-yellow-950 dark:text-amber-400">
            Enregistré : {savedScore} ({riskCriticalityLabel(savedLevel)}) — enregistrez pour recalculer.
          </span>
        ) : null}
      </div>
    </div>
  );
}

function criticalityLevelFromPiScore(score: number): ProjectRiskCriticalityLevel {
  if (score <= 4) return 'LOW';
  if (score <= 9) return 'MEDIUM';
  if (score <= 16) return 'HIGH';
  return 'CRITICAL';
}

function matrixCellSurfaceClass(level: ProjectRiskCriticalityLevel): string {
  switch (level) {
    case 'CRITICAL':
      return 'bg-violet-500/25 text-violet-950 dark:bg-violet-500/20 dark:text-violet-100';
    case 'HIGH':
      return 'bg-red-500/20 text-red-950 dark:bg-red-500/15 dark:text-red-100';
    case 'MEDIUM':
      return 'bg-amber-500/20 text-amber-950 dark:bg-amber-500/15 dark:text-amber-100';
    default:
      return 'bg-emerald-500/15 text-emerald-950 dark:bg-emerald-500/10 dark:text-emerald-100';
  }
}

function CriticalityMatrix({
  probability: pSel,
  impact: iSel,
  disabled,
  onPick,
}: {
  probability: number;
  impact: number;
  disabled: boolean;
  onPick: (p: number, i: number) => void;
}) {
  const pRows = [5, 4, 3, 2, 1] as const;
  const iCols = [1, 2, 3, 4, 5] as const;

  return (
    <div className="space-y-2">
      <p className="starium-form-label">Matrice de criticité (P×I)</p>
      <p className="text-xs text-muted-foreground">
        Même grille que le serveur : score = vraisemblance × gravité. Cliquez une case pour
        appliquer P et I.
      </p>
      {/* Matrice P×I dense : scroll horizontal contrôlé, exception RFC-FE-MOB-003 (pas DataTable). */}
      <div className="overflow-x-auto rounded-lg border border-border/60 bg-muted/10 p-2">
        <table className="w-full min-w-[280px] border-collapse text-center text-xs">
          <thead>
            <tr>
              <th className="p-1.5 font-normal text-muted-foreground" scope="col">
                <span className="sr-only">Vraisemblance</span>
                P \ I
              </th>
              {iCols.map((i) => (
                <th
                  key={i}
                  className="p-1.5 font-medium text-muted-foreground"
                  scope="col"
                  title={`Gravité ${i}`}
                >
                  {i}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pRows.map((p) => (
              <tr key={p}>
                <th
                  className="p-1.5 font-medium text-muted-foreground"
                  scope="row"
                  title={`Vraisemblance ${p}`}
                >
                  {p}
                </th>
                {iCols.map((i) => {
                  const score = p * i;
                  const level = criticalityLevelFromPiScore(score);
                  const selected = p === pSel && i === iSel;
                  return (
                    <td key={i} className="p-0.5">
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => onPick(p, i)}
                        className={cn(
                          'flex h-9 w-full min-w-[2.25rem] items-center justify-center rounded-md border border-transparent tabular-nums font-medium transition-colors',
                          matrixCellSurfaceClass(level),
                          selected &&
                            'ring-2 ring-primary ring-offset-2 ring-offset-background dark:ring-offset-card',
                          !disabled && 'hover:brightness-95 dark:hover:brightness-110',
                          disabled && 'cursor-not-allowed opacity-60',
                        )}
                        title={`P=${p}, I=${i} → score ${score} (${PROJECT_RISK_CRITICALITY_LABEL[level]})`}
                      >
                        {score}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-emerald-500/40" aria-hidden />
          Faible
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-amber-500/40" aria-hidden />
          Moyenne
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-red-500/35" aria-hidden />
          Haute
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-violet-500/40" aria-hidden />
          Critique
        </span>
      </div>
    </div>
  );
}

function EbiosSection({
  step,
  title,
  hint,
  headerExtra,
  children,
}: {
  step: number;
  title: string;
  hint?: string;
  headerExtra?: ReactNode;
  children: ReactNode;
}) {
  const headingId = `ebios-section-${step}`;
  return (
    <section className="starium-form-section" aria-labelledby={headingId}>
      <div className="mb-3 flex flex-wrap items-start gap-3">
        <h3 id={headingId} className="starium-form-section-title min-w-0 flex-1">
          <span
            className="inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--brand-gold)_14%,transparent)] text-[10px] font-extrabold tabular-nums text-[color:var(--brand-gold-700)]"
            aria-hidden
          >
            {step}
          </span>
          {title}
        </h3>
        {headerExtra ? <div className="shrink-0">{headerExtra}</div> : null}
      </div>
      {hint ? <p className="starium-form-hint mb-3">{hint}</p> : null}
      <div className="starium-form-grid">{children}</div>
    </section>
  );
}

type Mode = 'create' | 'edit';

export type ProjectRiskEbiosDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: Mode;
  /** Projet courant (vue projet) ; nullable en création / édition depuis le registre client. */
  projectId: string | null;
  risk: ProjectRiskApi | null;
  isPending: boolean;
  onSave: (payload: CreateProjectRiskPayload) => Promise<void>;
  /** Édition uniquement : affiche la zone de suppression. */
  canDelete?: boolean;
  onDelete?: () => Promise<void>;
  isDeleting?: boolean;
  /** `client` : `GET/PATCH /api/risks` ; `project` : routes imbriquées projet. */
  riskApiScope?: 'project' | 'client';
  /** Liste pour le sélecteur « Projet (facultatif) » — registre transverse. */
  projectOptions?: ProjectListItem[];
};

export function ProjectRiskEbiosDialog({
  open,
  onOpenChange,
  mode,
  projectId,
  risk,
  isPending,
  onSave,
  canDelete = false,
  onDelete,
  isDeleting = false,
  riskApiScope = 'project',
  projectOptions = [],
}: ProjectRiskEbiosDialogProps) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const { has, isSuccess: permsSuccess } = usePermissions();
  const canUpdateProjects = permsSuccess && has('projects.update');
  const canReadProjects = permsSuccess && has('projects.read');

  const assignableQuery = useQuery({
    queryKey: ['projects', 'assignable-users', clientId],
    queryFn: () => listAssignableUsers(authFetch),
    enabled: open && Boolean(clientId),
  });

  /** Référentiel RH (HUMAN) avec compte plateforme — même droit que `assignable-users` (`projects.read`). */
  const humanResourcesQuery = useQuery({
    queryKey: ['projects', 'options', 'human-resources', clientId],
    queryFn: () => listHumanResourcesForTaskPickers(authFetch),
    enabled: open && Boolean(clientId),
    staleTime: 60_000,
  });

  /** Détail complet : évite un formulaire vide si la liste ou un 1er rendu n’expose pas tous les champs. */
  const riskDetailQuery = useQuery({
    queryKey:
      riskApiScope === 'client'
        ? projectQueryKeys.clientRiskDetail(clientId, risk?.id ?? '')
        : projectQueryKeys.riskDetail(clientId, projectId ?? '', risk?.id ?? ''),
    queryFn: () =>
      riskApiScope === 'client'
        ? getClientRisk(authFetch, risk!.id)
        : getProjectRisk(authFetch, projectId!, risk!.id),
    enabled:
      open &&
      mode === 'edit' &&
      Boolean(clientId) &&
      Boolean(risk?.id) &&
      (riskApiScope === 'client' || Boolean(projectId)),
  });

  const taxonomyQuery = useQuery({
    queryKey: ['risk-taxonomy', 'catalog', clientId],
    queryFn: () => getRiskTaxonomyCatalog(authFetch),
    enabled: open && Boolean(clientId),
    staleTime: 60_000,
  });

  const riskResolved = useMemo(
    () => (mode === 'edit' ? riskDetailQuery.data ?? risk : risk),
    [mode, risk, riskDetailQuery.data],
  );

  const riskPlanTasksQuery = useQuery({
    queryKey: projectQueryKeys.riskActionPlanTasks(clientId, riskResolved?.id ?? ''),
    queryFn: () => listRiskActionPlanTasks(authFetch, riskResolved!.id),
    enabled:
      open &&
      Boolean(clientId) &&
      Boolean(riskResolved?.id) &&
      mode === 'edit' &&
      canReadProjects,
  });

  const [title, setTitle] = useState('');
  const [fearedEvent, setFearedEvent] = useState('');
  const [threatSource, setThreatSource] = useState('');
  const [description, setDescription] = useState('');
  const [businessImpact, setBusinessImpact] = useState('');
  const [taxonomyDomainId, setTaxonomyDomainId] = useState<string>(NONE);
  const [riskTypeId, setRiskTypeId] = useState<string>(NONE);
  const [riskTypeSearch, setRiskTypeSearch] = useState('');
  const [riskTypePickerOpen, setRiskTypePickerOpen] = useState(false);
  const [probability, setProbability] = useState(3);
  const [impact, setImpact] = useState(3);
  const [likelihoodJustification, setLikelihoodJustification] = useState('');
  const [existingSecurityMeasures, setExistingSecurityMeasures] = useState('');
  const [mitigationPlan, setMitigationPlan] = useState('');
  const [contingencyPlan, setContingencyPlan] = useState('');
  const [treatmentStrategy, setTreatmentStrategy] =
    useState<string>('REDUCE');
  const [residualRiskLevel, setResidualRiskLevel] = useState<string>(NONE);
  const [residualJustification, setResidualJustification] = useState('');
  const [complementaryTreatmentMeasures, setComplementaryTreatmentMeasures] = useState('');
  const [status, setStatus] = useState<string>('OPEN');
  const [dueDate, setDueDate] = useState('');
  const [detectedAt, setDetectedAt] = useState('');
  const [reviewDate, setReviewDate] = useState('');
  const [ownerUserId, setOwnerUserId] = useState<string>(OWNER_NONE);
  /** Registre client : projet facultatif (Hors projet = PROJECT_NONE). */
  const [linkedProjectId, setLinkedProjectId] = useState<string>(PROJECT_NONE);

  const [addToPlanOpen, setAddToPlanOpen] = useState(false);
  const [planTaskViewOpen, setPlanTaskViewOpen] = useState(false);
  const [planTaskView, setPlanTaskView] = useState<RiskLinkedActionPlanTaskApi | null>(null);

  const savedSnapshotRef = useRef<string>('');
  const loadedKeyRef = useRef<string | null>(null);
  const riskTypeSearchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      loadedKeyRef.current = null;
      setRiskTypePickerOpen(false);
      setRiskTypeSearch('');
      return;
    }
    const sourcePhase: 'list' | 'detail' =
      mode === 'edit' && risk?.id && riskDetailQuery.data ? 'detail' : 'list';
    const key =
      mode === 'edit' && risk?.id
        ? `edit:${risk.id}:${sourcePhase}`
        : mode === 'create'
          ? 'create'
          : '';
    if (!key) return;
    if (loadedKeyRef.current === key) return;
    loadedKeyRef.current = key;

    if (mode === 'edit' && riskResolved) {
      const r = riskResolved;
      setTitle(r.title);
      setFearedEvent(r.fearedEvent ?? r.title);
      setThreatSource(r.threatSource ?? '');
      setDescription(r.description ?? '');
      setBusinessImpact(r.businessImpact ?? '');
      const domId = r.riskType?.domain?.id ?? NONE;
      setTaxonomyDomainId(domId);
      setRiskTypeId(r.riskTypeId ?? r.riskType?.id ?? NONE);
      setProbability(r.probability);
      setImpact(r.impact);
      setLikelihoodJustification(r.likelihoodJustification ?? '');
      setExistingSecurityMeasures(r.existingSecurityMeasures ?? '');
      setMitigationPlan(r.mitigationPlan ?? '');
      setContingencyPlan(r.contingencyPlan ?? '');
      setTreatmentStrategy(r.treatmentStrategy ?? 'REDUCE');
      setResidualRiskLevel(r.residualRiskLevel ?? NONE);
      setResidualJustification(r.residualJustification ?? '');
      setComplementaryTreatmentMeasures(r.complementaryTreatmentMeasures ?? '');
      setStatus(r.status);
      setDueDate(toDateInputValue(r.dueDate));
      setDetectedAt(toDateInputValue(r.detectedAt));
      setReviewDate(toDateInputValue(r.reviewDate));
      setOwnerUserId(r.ownerUserId ?? OWNER_NONE);
      setLinkedProjectId(r.projectId ?? PROJECT_NONE);
      savedSnapshotRef.current = snapshotFromRisk(r);
      return;
    }
    if (mode === 'create') {
      setLinkedProjectId(PROJECT_NONE);
      setTitle('');
      setFearedEvent('');
      setThreatSource('');
      setDescription('');
      setBusinessImpact('');
      setTaxonomyDomainId(NONE);
      setRiskTypeId(NONE);
      setProbability(3);
      setImpact(3);
      setLikelihoodJustification('');
      setExistingSecurityMeasures('');
      setMitigationPlan('');
      setContingencyPlan('');
      setTreatmentStrategy('REDUCE');
      setResidualRiskLevel(NONE);
      setResidualJustification('');
      setComplementaryTreatmentMeasures('');
      setStatus('OPEN');
      setDueDate('');
      setDetectedAt('');
      setReviewDate('');
      setOwnerUserId(OWNER_NONE);
      savedSnapshotRef.current = '';
    }
  }, [open, mode, risk?.id, riskResolved, riskDetailQuery.data]);

  /** Défaut création : GENERAL / UNCLASSIFIED dès catalogue chargé. */
  useEffect(() => {
    if (!open || mode !== 'create') return;
    const data = taxonomyQuery.data;
    if (!data?.domains.length) return;
    if (riskTypeId !== NONE) return;
    const gen = data.domains.find((d) => d.code === 'GENERAL');
    const un = gen?.types.find((t) => t.code === 'UNCLASSIFIED');
    if (gen && un) {
      setTaxonomyDomainId(gen.id);
      setRiskTypeId(un.id);
    }
  }, [open, mode, taxonomyQuery.data, riskTypeId]);

  const residualSoftWarning = useMemo(() => {
    if (mode !== 'edit' || !riskResolved || residualRiskLevel === NONE) return false;
    const rOrd = CRIT_ORDER[residualRiskLevel] ?? 0;
    const iOrd = CRIT_ORDER[riskResolved.criticalityLevel] ?? 0;
    return rOrd > iOrd;
  }, [mode, riskResolved, residualRiskLevel]);

  const piChanged =
    mode === 'edit' &&
    riskResolved &&
    (probability !== riskResolved.probability || impact !== riskResolved.impact);

  const fallbackRiskTypeId = useMemo(() => {
    const domains = taxonomyQuery.data?.domains ?? [];
    const general = domains.find((d) => d.code === 'GENERAL');
    const unclassified = general?.types.find((t) => t.code === 'UNCLASSIFIED');
    if (unclassified) return unclassified.id;
    const firstActiveType = domains.flatMap((d) => d.types).find((t) => t.isActive);
    return firstActiveType?.id ?? null;
  }, [taxonomyQuery.data?.domains]);

  const buildPayload = useCallback((): CreateProjectRiskPayload | null => {
    const t = title.trim();
    const fe =
      mode === 'create' ? fearedEvent.trim() || t : fearedEvent.trim();
    const ts =
      mode === 'create' ? threatSource.trim() || t : threatSource.trim();
    const sc =
      mode === 'create'
        ? description.trim() || `Risque identifié: ${t}`
        : description.trim();
    const bi =
      mode === 'create'
        ? businessImpact.trim() || 'Impact métier à qualifier'
        : businessImpact.trim();
    if (!t || !fe || !ts || !sc || !bi || !treatmentStrategy) return null;
    const effectiveRiskTypeId =
      riskTypeId !== NONE ? riskTypeId : mode === 'create' ? fallbackRiskTypeId : null;
    if (!effectiveRiskTypeId) return null;
    const payload: CreateProjectRiskPayload = {
      title: t,
      fearedEvent: fe,
      threatSource: ts,
      description: sc,
      businessImpact: bi,
      riskTypeId: effectiveRiskTypeId,
      likelihoodJustification: likelihoodJustification.trim() || undefined,
      probability,
      impact,
      existingSecurityMeasures: existingSecurityMeasures.trim() || undefined,
      mitigationPlan: mitigationPlan.trim() || undefined,
      contingencyPlan: contingencyPlan.trim() || undefined,
      status,
      dueDate: dateInputToIso(dueDate),
      detectedAt: dateInputToIso(detectedAt),
      reviewDate: dateInputToIso(reviewDate),
      treatmentStrategy,
      residualRiskLevel: residualRiskLevel !== NONE ? residualRiskLevel : undefined,
      residualJustification: residualJustification.trim() || undefined,
      complementaryTreatmentMeasures:
        complementaryTreatmentMeasures.trim() || undefined,
      ownerUserId: ownerUserId === OWNER_NONE ? null : ownerUserId,
    };
    if (riskApiScope === 'client') {
      payload.projectId = linkedProjectId === PROJECT_NONE ? null : linkedProjectId;
    }
    return payload;
  }, [
    riskApiScope,
    linkedProjectId,
    title,
    fearedEvent,
    threatSource,
    description,
    businessImpact,
    riskTypeId,
    likelihoodJustification,
    probability,
    impact,
    existingSecurityMeasures,
    mitigationPlan,
    contingencyPlan,
    status,
    dueDate,
    detectedAt,
    reviewDate,
    treatmentStrategy,
    residualRiskLevel,
    residualJustification,
    complementaryTreatmentMeasures,
    ownerUserId,
    fallbackRiskTypeId,
    mode,
  ]);

  const snapshot = useMemo(() => {
    const p = buildPayload();
    return p ? stableRiskSnapshot(p) : '';
  }, [buildPayload]);

  const save = useCallback(async () => {
    const p = buildPayload();
    if (!p) return;
    await onSave(p);
  }, [buildPayload, onSave]);

  const handleManualSave = useCallback(async () => {
    const payload = buildPayload();
    if (isPending) return;
    if (!payload) {
      toast.error('Enregistrement impossible: titre, type de risque et stratégie sont requis.');
      return;
    }
    await onSave(payload);
    savedSnapshotRef.current = stableRiskSnapshot(payload);
    if (mode === 'create') {
      onOpenChange(false);
    }
  }, [buildPayload, isPending, mode, onOpenChange, onSave]);

  const users = useMemo(
    () => assignableQuery.data?.users ?? [],
    [assignableQuery.data?.users],
  );

  const sortedMemberUsers = useMemo(
    () =>
      [...users].sort((a, b) =>
        formatUserLabel(a).localeCompare(formatUserLabel(b), 'fr', { sensitivity: 'base' }),
      ),
    [users],
  );

  /** Utilisateurs plateforme joignables via fiche RH (`linkedUserId`), hors membres client déjà listés. */
  const hrLinkedOwnerOptions = useMemo(() => {
    const items = humanResourcesQuery.data?.items ?? [];
    const memberIds = new Set(users.map((u) => u.id));
    const byUserId = new Map<string, ResourceListItem>();
    for (const r of items) {
      const uid = r.linkedUserId?.trim();
      if (!uid || memberIds.has(uid)) continue;
      if (!byUserId.has(uid)) byUserId.set(uid, r);
    }
    return [...byUserId.entries()]
      .map(([userId, resource]) => ({ userId, resource }))
      .sort((a, b) =>
        labelForHumanResourceOwner(a.resource).localeCompare(
          labelForHumanResourceOwner(b.resource),
          'fr',
          { sensitivity: 'base' },
        ),
      );
  }, [users, humanResourcesQuery.data?.items]);

  const residualLevelSelectKeys = useMemo(() => {
    const base: string[] = [...RESIDUAL_LEVELS];
    if (residualRiskLevel !== NONE && !base.includes(residualRiskLevel)) {
      base.push(residualRiskLevel);
    }
    return base;
  }, [residualRiskLevel]);

  const treatmentSelectKeys = useMemo(() => {
    const base: string[] = [...TREATMENT_KEYS];
    if (!base.includes(treatmentStrategy)) {
      base.push(treatmentStrategy);
    }
    return base;
  }, [treatmentStrategy]);

  const statusSelectKeys = useMemo(() => {
    const known = Object.keys(RISK_STATUS_LABEL);
    if (!known.includes(status)) {
      return [...known, status];
    }
    return known;
  }, [status]);

  const ownerKnownInPicker =
    ownerUserId === OWNER_NONE ||
    users.some((u) => u.id === ownerUserId) ||
    hrLinkedOwnerOptions.some((o) => o.userId === ownerUserId);

  const ownerMissingFromList = ownerUserId !== OWNER_NONE && !ownerKnownInPicker;

  const ownerLabel = useMemo(() => {
    if (ownerUserId === OWNER_NONE) return 'Non assigné';
    const u = users.find((x) => x.id === ownerUserId);
    if (u) return formatUserLabel(u);
    const hr = hrLinkedOwnerOptions.find((o) => o.userId === ownerUserId);
    if (hr) return labelForHumanResourceOwner(hr.resource);
    return OWNER_UNKNOWN_LABEL;
  }, [ownerUserId, users, hrLinkedOwnerOptions]);

  /** Libellé projet affiché dans le trigger (jamais l’id — règle produit). */
  const linkedProjectTriggerLabel = useMemo(() => {
    if (linkedProjectId === PROJECT_NONE) return 'Hors projet';
    const fromList = projectOptions.find((p) => p.id === linkedProjectId);
    if (fromList) return fromList.name;
    if (riskResolved?.projectId === linkedProjectId && riskResolved.project?.name) {
      return riskResolved.project.name;
    }
    return 'Projet inconnu';
  }, [
    linkedProjectId,
    projectOptions,
    riskResolved?.projectId,
    riskResolved?.project?.name,
  ]);

  const canSubmit =
    Boolean(title.trim()) &&
    Boolean(fearedEvent.trim()) &&
    Boolean(threatSource.trim()) &&
    Boolean(description.trim()) &&
    Boolean(businessImpact.trim()) &&
    Boolean(treatmentStrategy) &&
    riskTypeId !== NONE;

  useDebouncedServerAutosave({
    enabled: open && mode === 'edit',
    snapshot,
    savedSnapshotRef,
    canSave: canSubmit,
    isSaving: isPending,
    save,
  });

  const handleOpenChange = useCallback(
    async (next: boolean) => {
      if (!next && open) {
        const p = buildPayload();
        if (p && stableRiskSnapshot(p) !== savedSnapshotRef.current && !isPending) {
          try {
            await onSave(p);
            savedSnapshotRef.current = stableRiskSnapshot(p);
          } catch {
            return;
          }
        }
      }
      onOpenChange(next);
    },
    [open, buildPayload, isPending, onSave, onOpenChange],
  );

  const addTaskFromRiskPrefill = useMemo((): ActionPlanTaskCreatePrefill | null => {
    if (!riskResolved?.id) return null;
    return {
      name: title.trim() ? `Traitement : ${title.trim()}` : 'Tâche liée au risque',
      description: mitigationPlan.trim() || null,
      projectId: riskResolved.projectId ?? null,
      riskId: riskResolved.id,
    };
  }, [riskResolved?.id, riskResolved?.projectId, title, mitigationPlan]);

  const linkedPlanTasks = riskPlanTasksQuery.data?.items ?? [];

  /** Index domaine -> données enrichies. Inclut le domaine legacy si absent du catalogue. */
  const allDomainsForPicker = useMemo(() => {
    const fromCatalog = taxonomyQuery.data?.domains ?? [];
    const legacyDomain = riskResolved?.riskType?.domain;
    const legacyType = riskResolved?.riskType;
    if (
      mode !== 'edit' ||
      !legacyDomain ||
      !legacyType ||
      fromCatalog.some((d) => d.id === legacyDomain.id)
    ) {
      return fromCatalog;
    }
    return [
      ...fromCatalog,
      {
        id: legacyDomain.id,
        code: legacyDomain.code,
        name: legacyDomain.name,
        description: null,
        isActive: legacyDomain.isActive,
        familyCode: undefined,
        familyLabel: undefined,
        isVisibleInCatalog: false,
        types: [
          {
            id: legacyType.id,
            code: legacyType.code,
            name: legacyType.name,
            isActive: legacyType.isActive,
            isRecommended: false,
          },
        ],
      },
    ];
  }, [taxonomyQuery.data?.domains, mode, riskResolved?.riskType]);

  /**
   * Picker unifié : recherche globale (nom + code), groupes triés par famille puis domaine.
   * Si un type legacy existe sur un domaine présent du catalogue, on l'injecte côté domaine.
   */
  const groupedDomainsForPicker = useMemo(() => {
    const query = normalizeRiskSearchText(riskTypeSearch);
    const legacy = riskResolved?.riskType;

    const enrichedDomains = allDomainsForPicker.map((d) => {
      let types = d.types;
      if (
        mode === 'edit' &&
        legacy &&
        legacy.id === riskTypeId &&
        legacy.domain?.id === d.id &&
        !types.some((t) => t.id === legacy.id)
      ) {
        types = [
          ...types,
          {
            id: legacy.id,
            code: legacy.code,
            name: legacy.name,
            isActive: legacy.isActive,
            isRecommended: false,
          },
        ];
      }
      const filteredTypes = !query
        ? types
        : types.filter(
            (t) =>
              normalizeRiskSearchText(t.name).includes(query) ||
              normalizeRiskSearchText(t.code).includes(query) ||
              normalizeRiskSearchText(d.name).includes(query) ||
              normalizeRiskSearchText(d.familyLabel ?? '').includes(query),
          );
      return { domain: d, types: filteredTypes };
    });

    return enrichedDomains
      .filter((g) => g.types.length > 0)
      .sort((a, b) => {
        const fa = a.domain.familyLabel ?? 'zz';
        const fb = b.domain.familyLabel ?? 'zz';
        if (fa !== fb) return fa.localeCompare(fb, 'fr');
        return a.domain.name.localeCompare(b.domain.name, 'fr');
      });
  }, [allDomainsForPicker, riskTypeSearch, mode, riskResolved?.riskType, riskTypeId]);

  const selectedRiskType = useMemo(() => {
    if (riskTypeId === NONE) return null;
    for (const d of allDomainsForPicker) {
      const t = d.types.find((x) => x.id === riskTypeId);
      if (t) return { type: t, domain: d };
    }
    return null;
  }, [riskTypeId, allDomainsForPicker]);

  const riskTypeTriggerLabel = useMemo(() => {
    if (!selectedRiskType) return 'Choisir un type de risque';
    const { type, domain } = selectedRiskType;
    const family = domain.familyLabel ? `${domain.familyLabel} · ` : '';
    const inactive = !type.isActive ? ' (inactif)' : '';
    return `${family}${domain.name} — ${type.name}${inactive}`;
  }, [selectedRiskType]);

  const selectRiskTypeById = useCallback(
    (typeId: string) => {
      setRiskTypeId(typeId);
      for (const d of allDomainsForPicker) {
        if (d.types.some((t) => t.id === typeId)) {
          setTaxonomyDomainId(d.id);
          break;
        }
      }
    },
    [allDomainsForPicker],
  );

  const pickRiskTypeAndClosePicker = useCallback(
    (typeId: string) => {
      selectRiskTypeById(typeId);
      setRiskTypePickerOpen(false);
      setRiskTypeSearch('');
    },
    [selectRiskTypeById],
  );

  const riskTypeAutocompleteSuggestion = useMemo(() => {
    const query = normalizeRiskSearchText(riskTypeSearch);
    if (!query) return null;
    const candidates = groupedDomainsForPicker.flatMap(({ domain, types }) =>
      types.map((type) => ({
        typeId: type.id,
        domainId: domain.id,
        name: type.name,
        code: type.code,
        domainName: domain.name,
      })),
    );
    if (candidates.length === 0) return null;

    const startsWith = candidates.find(
      (c) =>
        normalizeRiskSearchText(c.name).startsWith(query) ||
        normalizeRiskSearchText(c.code).startsWith(query) ||
        normalizeRiskSearchText(c.domainName).startsWith(query),
    );
    const pick = startsWith ?? candidates[0];
    return {
      typeId: pick.typeId,
      domainId: pick.domainId,
      label: `${pick.domainName} — ${pick.name}`,
    };
  }, [groupedDomainsForPicker, riskTypeSearch]);

  const treatmentHeaderExtra = !riskResolved?.id ? (
    <span className="max-w-[14rem] text-right text-xs text-muted-foreground">
      Enregistrez le risque pour l’associer à un plan d’action.
    </span>
  ) : riskPlanTasksQuery.isLoading ? (
    <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" aria-hidden />
  ) : riskPlanTasksQuery.isError ? (
    <span className="max-w-[14rem] text-right text-xs text-destructive">
      Actions plan indisponibles.
    </span>
  ) : linkedPlanTasks.length > 0 && canReadProjects ? (
    <div className="flex max-w-[min(22rem,100%)] flex-col items-end gap-1.5 text-right">
      <p className="text-xs text-muted-foreground">
        {linkedPlanTasks.length === 1
          ? 'Action inscrite au plan d’action'
          : 'Actions inscrites au plan d’action'}
      </p>
      {linkedPlanTasks.map((t) => (
        <button
          key={t.id}
          type="button"
          className="inline-flex max-w-full items-center justify-end gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
          onClick={() => {
            if (!t.actionPlanId) return;
            setPlanTaskView(t);
            setPlanTaskViewOpen(true);
          }}
        >
          <span className="truncate">
            {t.actionPlan ? `${t.actionPlan.code} — ${t.name}` : t.name}
          </span>
        </button>
      ))}
    </div>
  ) : linkedPlanTasks.length > 0 && !canReadProjects ? (
    <span className="max-w-[14rem] text-right text-xs text-muted-foreground">
      Déjà lié à un plan d’action. Droits insuffisants pour ouvrir la tâche.
    </span>
  ) : canUpdateProjects ? (
    <button
      type="button"
      className="starium-btn starium-btn-secondary gap-1.5 px-3 py-2 text-xs"
      onClick={() => setAddToPlanOpen(true)}
      disabled={isPending}
    >
      <ListPlus className="size-3.5 shrink-0" aria-hidden />
      Ajouter au plan d’action
    </button>
  ) : (
    <span className="max-w-[14rem] text-right text-xs text-muted-foreground">
      Droits insuffisants pour créer une tâche de plan.
    </span>
  );

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton
        size="xl"
        className="flex max-h-[min(92vh,880px)] flex-col gap-0 overflow-hidden p-4 lg:max-w-5xl"
      >
        <form onSubmit={(e) => e.preventDefault()} className="flex min-h-0 flex-1 flex-col">
          <DialogHeader className="-mx-4 -mt-4 shrink-0 space-y-0 rounded-t-xl border-b border-border/60 bg-card pb-4 pl-7 pr-4 pt-4 text-left shadow-sm sm:pl-8">
            <div className="pr-8">
              <div className="flex flex-wrap items-center gap-2 gap-y-1">
                <DialogTitle className="text-left">
                  {mode === 'create' ? 'Nouveau risque' : 'Modifier le risque'}
                </DialogTitle>
                <span className="starium-ds-badge starium-ds-badge--neutral">EBIOS RM</span>
              </div>
              <DialogDescription className="mt-2 text-left">
                Scénario, évaluation, impact métier, traitement, résiduel et suivi (ISO 27005).
              </DialogDescription>
            </div>
            <div
              className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
              role="status"
              aria-live="polite"
            >
              {isPending ? (
                <>
                  <Loader2 className="size-3.5 shrink-0 animate-spin text-[color:var(--brand-gold)]" aria-hidden />
                  <span>Enregistrement en cours…</span>
                </>
              ) : (
                <>
                  <CloudUpload className="size-3.5 shrink-0" aria-hidden />
                  <span>
                    Sauvegarde automatique lorsque le formulaire est valide (délai court après
                    modification).
                  </span>
                </>
              )}
            </div>
          </DialogHeader>

          <DialogBody className="min-h-0 flex-1 py-4">
            <div className="starium-form">
              {riskApiScope === 'client' ? (
                <section className="starium-form-section">
                  <EbiosField
                    label="Projet (facultatif)"
                    htmlFor="ebios-linked-project"
                    hint="« Hors projet » = risque transverse. Sinon choisissez un projet porteur."
                  >
                    <Select
                      value={linkedProjectId}
                      onValueChange={(v) => setLinkedProjectId(v && v.length > 0 ? v : PROJECT_NONE)}
                      disabled={isPending}
                    >
                      <SelectTrigger id="ebios-linked-project" className={EBIOS_SELECT_TRIGGER_CLASS}>
                        <span className={selectTriggerLabelClass}>{linkedProjectTriggerLabel}</span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={PROJECT_NONE}>Hors projet</SelectItem>
                        {projectOptions.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </EbiosField>
                </section>
              ) : null}

              <div
                className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground"
                role="note"
              >
                <span className="font-semibold text-foreground">Champs obligatoires :</span> Titre,
                Événement redouté, Source de risque, Scénario, Impact métier, Type de risque,
                Stratégie de traitement.
              </div>
            <EbiosSection
              step={1}
              title="Identification du scénario"
              hint="Domaine (via type), événement redouté, source de risque et scénario « Si X alors Y »."
              headerExtra={
                mode === 'edit' && riskResolved ? (
                  <span className="starium-ds-badge starium-ds-badge--neutral font-mono text-[11px]">
                    {riskResolved.code}
                  </span>
                ) : undefined
              }
            >
              <EbiosField label="Événement redouté" htmlFor="ebios-feared" required>
                <textarea
                  id="ebios-feared"
                  value={fearedEvent}
                  onChange={(e) => setFearedEvent(e.target.value)}
                  disabled={isPending}
                  rows={2}
                  placeholder="ex. Indisponibilité prolongée du SI métier, fuite de données personnelles…"
                  className={EBIOS_TEXTAREA_CLASS}
                  required
                />
              </EbiosField>
              <EbiosField label="Source de risque" htmlFor="ebios-threat" required>
                <Input
                  className={EBIOS_INPUT_CLASS}
                  id="ebios-threat"
                  value={threatSource}
                  onChange={(e) => setThreatSource(e.target.value)}
                  disabled={isPending}
                  maxLength={300}
                  placeholder="ex. cyberattaque, fournisseur, erreur humaine, défaillance technique"
                  required
                />
              </EbiosField>
              <EbiosField
                label="Scénario de risque (Si X alors Y)"
                htmlFor="ebios-scenario"
                required
              >
                <textarea
                  id="ebios-scenario"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isPending}
                  rows={3}
                  placeholder="Si la migration est mal testée alors un incident majeur en production…"
                  className={cn(EBIOS_TEXTAREA_CLASS, 'min-h-[72px]')}
                  required
                />
              </EbiosField>
              <EbiosField label="Titre court (registre / listes)" htmlFor="ebios-title" required>
                <Input
                  className={EBIOS_INPUT_CLASS}
                  id="ebios-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isPending}
                  maxLength={500}
                  placeholder="ex. Indisponibilité SI post cut-over"
                  required
                />
              </EbiosField>
              <EbiosField label="Type de risque" htmlFor="ebios-risk-type-trigger" required>
                <PopoverPrimitive.Root
                  open={riskTypePickerOpen}
                  onOpenChange={(next) => {
                    setRiskTypePickerOpen(next);
                    if (!next) setRiskTypeSearch('');
                  }}
                >
                  <PopoverPrimitive.Trigger
                    id="ebios-risk-type-trigger"
                    type="button"
                    disabled={isPending || taxonomyQuery.isLoading}
                    className={cn(
                      EBIOS_SELECT_TRIGGER_CLASS,
                      'h-8 justify-between px-2.5',
                      'disabled:cursor-not-allowed disabled:opacity-50',
                      (isPending || taxonomyQuery.isLoading) && 'pointer-events-none',
                    )}
                  >
                    <span
                      className={cn(
                        selectTriggerLabelClass,
                        !selectedRiskType && 'text-muted-foreground',
                      )}
                    >
                      {taxonomyQuery.isLoading && !selectedRiskType
                        ? 'Chargement de la taxonomie…'
                        : riskTypeTriggerLabel}
                    </span>
                    <ChevronDown className="pointer-events-none size-4 shrink-0 text-muted-foreground" aria-hidden />
                  </PopoverPrimitive.Trigger>
                  <PopoverPrimitive.Portal>
                    <PopoverPrimitive.Positioner
                      side="bottom"
                      sideOffset={8}
                      align="start"
                      className="isolate z-[300]"
                    >
                      <PopoverPrimitive.Popup
                        initialFocus={riskTypeSearchInputRef}
                        className={cn(
                          'max-h-[min(60vh,520px)] w-[min(var(--anchor-width),100vw-2rem)] min-w-[min(34rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-border/60 bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10',
                          'data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95',
                          'data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
                        )}
                      >
                        <div className="border-b border-border/60 bg-popover p-2">
                          <div className="space-y-1">
                            <Input
                              ref={riskTypeSearchInputRef}
                              value={riskTypeSearch}
                              onChange={(e) => setRiskTypeSearch(e.target.value)}
                              placeholder="Rechercher un type, un domaine ou un code…"
                              className={cn(EBIOS_INPUT_CLASS, 'h-8')}
                              autoComplete="off"
                              onKeyDown={(e) => {
                                if (
                                  e.key === 'Enter' &&
                                  riskTypeAutocompleteSuggestion
                                ) {
                                  e.preventDefault();
                                  pickRiskTypeAndClosePicker(riskTypeAutocompleteSuggestion.typeId);
                                }
                              }}
                            />
                            {riskTypeAutocompleteSuggestion ? (
                              <button
                                type="button"
                                className="text-left text-xs text-muted-foreground hover:text-foreground"
                                onClick={() =>
                                  pickRiskTypeAndClosePicker(riskTypeAutocompleteSuggestion.typeId)
                                }
                              >
                                Suggestion : {riskTypeAutocompleteSuggestion.label}
                              </button>
                            ) : null}
                          </div>
                        </div>
                        <div className="max-h-[min(48vh,440px)] overflow-y-auto p-1">
                          {groupedDomainsForPicker.length === 0 ? (
                            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                              Aucun type ne correspond à « {riskTypeSearch.trim()} ».
                            </div>
                          ) : (
                            groupedDomainsForPicker.map(({ domain, types }) => (
                              <div key={domain.id} className="space-y-0.5 pb-2">
                                <div className="flex items-baseline gap-2 px-2 pt-2 pb-1 text-xs text-muted-foreground">
                                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground/80">
                                    {domain.familyLabel ?? 'Autres'}
                                  </span>
                                  <span className="font-medium text-foreground">
                                    {domain.name}
                                    {!domain.isActive ? ' (inactif)' : ''}
                                  </span>
                                </div>
                                {types.map((t) => (
                                  <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => pickRiskTypeAndClosePicker(t.id)}
                                    className={cn(
                                      'flex w-full items-center gap-1.5 rounded-md px-2 py-2 text-left text-sm text-card-foreground',
                                      'hover:bg-accent/50 focus-visible:bg-accent focus-visible:outline-none',
                                      t.id === riskTypeId && 'bg-accent/60',
                                    )}
                                  >
                                    <span className="min-w-0 flex-1 truncate">
                                      {t.isRecommended ? '★ ' : ''}
                                      {t.name}
                                      {!t.isActive ? ' (inactif)' : ''}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            ))
                          )}
                        </div>
                      </PopoverPrimitive.Popup>
                    </PopoverPrimitive.Positioner>
                  </PopoverPrimitive.Portal>
                </PopoverPrimitive.Root>
                {selectedRiskType ? (
                  <p className="text-xs text-muted-foreground">
                    Domaine :{' '}
                    <span className="font-medium text-foreground">
                      {selectedRiskType.domain.familyLabel
                        ? `${selectedRiskType.domain.familyLabel} · ${selectedRiskType.domain.name}`
                        : selectedRiskType.domain.name}
                    </span>
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Recherchez un type métier ; le domaine est déduit automatiquement.
                  </p>
                )}
              </EbiosField>
              {taxonomyQuery.isError ? (
                <p className="text-xs text-destructive">Impossible de charger la taxonomie risques.</p>
              ) : null}
            </EbiosSection>

            <EbiosSection
              step={2}
              title="Évaluation du risque"
              hint="Le score P×I et la criticité sont calculés côté serveur à l’enregistrement."
            >
              <div className="starium-form-grid starium-form-grid--2">
                <div className="space-y-2">
                  <Label className="starium-form-label">Vraisemblance (1–5)</Label>
                  <Select
                    value={String(probability)}
                    onValueChange={(v) => setProbability(Number(v))}
                    disabled={isPending}
                  >
                    <SelectTrigger className={EBIOS_SELECT_TRIGGER_CLASS}>
                      <span className={selectTriggerLabelClass}>
                        {RISK_PI_SCALE_LABEL[String(probability)] ?? String(probability)}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {PI_OPTIONS.map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {RISK_PI_SCALE_LABEL[String(n)] ?? String(n)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="starium-form-label">Gravité d’impact (1–5)</Label>
                  <Select
                    value={String(impact)}
                    onValueChange={(v) => setImpact(Number(v))}
                    disabled={isPending}
                  >
                    <SelectTrigger className={EBIOS_SELECT_TRIGGER_CLASS}>
                      <span className={selectTriggerLabelClass}>
                        {RISK_PI_SCALE_LABEL[String(impact)] ?? String(impact)}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {PI_OPTIONS.map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {RISK_PI_SCALE_LABEL[String(n)] ?? String(n)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <CriticalityMatrix
                probability={probability}
                impact={impact}
                disabled={isPending}
                onPick={(p, i) => {
                  setProbability(p);
                  setImpact(i);
                }}
              />
              <div className="space-y-2">
                <Label className="starium-form-label" htmlFor="ebios-likelihood-j">Justification de la vraisemblance (optionnel)</Label>
                <textarea
                  id="ebios-likelihood-j"
                  value={likelihoodJustification}
                  onChange={(e) => setLikelihoodJustification(e.target.value)}
                  disabled={isPending}
                  rows={2}
                  placeholder="Pourquoi ce score de probabilité…"
                  className="starium-form-textarea"
                />
              </div>
              <InitialRiskSummary
                probability={probability}
                impact={impact}
                savedScore={mode === 'edit' && riskResolved ? riskResolved.criticalityScore : undefined}
                savedLevel={mode === 'edit' && riskResolved ? riskResolved.criticalityLevel : undefined}
                piChanged={Boolean(piChanged)}
              />
            </EbiosSection>

            <EbiosSection
              step={3}
              title="Impact métier"
              hint="Conséquences pour l’organisation."
            >
              <div className="space-y-2">
                <Label className="starium-form-label" htmlFor="ebios-bi">
                  Impact métier
                  <span className={requiredAsteriskClass}>*</span>
                </Label>
                <textarea
                  id="ebios-bi"
                  value={businessImpact}
                  onChange={(e) => setBusinessImpact(e.target.value)}
                  disabled={isPending}
                  rows={3}
                  placeholder="Perte de revenus, interruption de service, image, obligations légales…"
                  className="starium-form-textarea min-h-[72px]"
                  required
                />
              </div>
            </EbiosSection>

            <EbiosSection
              step={4}
              title="Traitement du risque"
              hint="Mesures existantes, stratégie et plans de traitement."
              headerExtra={treatmentHeaderExtra}
            >
              <div className="space-y-2">
                <Label className="starium-form-label">
                  Stratégie de traitement
                  <span className={requiredAsteriskClass}>*</span>
                </Label>
                <Select
                  value={treatmentStrategy}
                  onValueChange={(v) => v && setTreatmentStrategy(v)}
                  disabled={isPending}
                >
                  <SelectTrigger className={EBIOS_SELECT_TRIGGER_CLASS}>
                    <span className={selectTriggerLabelClass}>
                      {RISK_TREATMENT_STRATEGY_LABEL[treatmentStrategy] ??
                        'Stratégie de traitement'}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {treatmentSelectKeys.map((k) => (
                      <SelectItem key={k} value={k}>
                        {RISK_TREATMENT_STRATEGY_LABEL[k] ?? 'Valeur enregistrée'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="starium-form-label" htmlFor="ebios-existing-measures">
                  Mesures de sécurité existantes / préventives (optionnel)
                </Label>
                <textarea
                  id="ebios-existing-measures"
                  value={existingSecurityMeasures}
                  onChange={(e) => setExistingSecurityMeasures(e.target.value)}
                  disabled={isPending}
                  rows={3}
                  placeholder="Contrôles, procédures ou dispositifs déjà en place avant traitement complémentaire…"
                  className="starium-form-textarea min-h-[72px]"
                />
              </div>
              <div className="space-y-2">
                <Label className="starium-form-label" htmlFor="ebios-mitigation">Plan de réduction (mesures à mettre en œuvre, optionnel)</Label>
                <textarea
                  id="ebios-mitigation"
                  value={mitigationPlan}
                  onChange={(e) => setMitigationPlan(e.target.value)}
                  disabled={isPending}
                  rows={3}
                  placeholder="Actions futures pour réduire la vraisemblance ou l’impact…"
                  className="starium-form-textarea min-h-[72px]"
                />
              </div>
              <div className="space-y-2">
                <Label className="starium-form-label" htmlFor="ebios-contingency">Plan de continuité / secours (optionnel)</Label>
                <textarea
                  id="ebios-contingency"
                  value={contingencyPlan}
                  onChange={(e) => setContingencyPlan(e.target.value)}
                  disabled={isPending}
                  rows={2}
                  placeholder="Si le scénario se produit malgré tout…"
                  className="starium-form-textarea"
                />
              </div>
              <div className="space-y-2">
                <Label className="starium-form-label" htmlFor="ebios-complementary">
                  Traitement / mesures complémentaires (optionnel)
                </Label>
                <textarea
                  id="ebios-complementary"
                  value={complementaryTreatmentMeasures}
                  onChange={(e) => setComplementaryTreatmentMeasures(e.target.value)}
                  disabled={isPending}
                  rows={3}
                  placeholder="Actions ou garde-fous additionnels (surveillance, renforts, revues…)"
                  className="starium-form-textarea min-h-[72px]"
                />
              </div>
            </EbiosSection>

            <EbiosSection
              step={5}
              title="Risque résiduel"
              hint="Niveau cible après traitement ; cohérent avec le risque initial (indicatif)."
            >
              {residualSoftWarning ? (
                <div
                  className="rounded-lg border border-amber-500/40 bg-amber-500/[0.06] px-3 py-2.5 text-xs font-semibold text-yellow-950 dark:text-amber-400"
                  role="status"
                >
                  Le niveau résiduel semble supérieur à la criticité initiale (P×I) — vérifiez la
                  cohérence.
                </div>
              ) : null}
              <div className="space-y-2">
                <Label className="starium-form-label">Risque résiduel cible (optionnel)</Label>
                <Select
                  value={residualRiskLevel}
                  onValueChange={(v) => setResidualRiskLevel(v ?? NONE)}
                  disabled={isPending}
                >
                  <SelectTrigger className={EBIOS_SELECT_TRIGGER_CLASS}>
                    <span
                      className={cn(
                        selectTriggerLabelClass,
                        residualRiskLevel === NONE && 'text-muted-foreground',
                      )}
                    >
                      {residualRiskLevel === NONE
                        ? 'Non renseigné'
                        : residualLevelDisplayLabel(residualRiskLevel)}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Non renseigné</SelectItem>
                    {residualLevelSelectKeys.map((k) => (
                      <SelectItem key={k} value={k}>
                        {PROJECT_RISK_CRITICALITY_LABEL[k] ?? 'Niveau enregistré'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="starium-form-label" htmlFor="ebios-resid-j">Justification du résiduel (optionnel)</Label>
                <textarea
                  id="ebios-resid-j"
                  value={residualJustification}
                  onChange={(e) => setResidualJustification(e.target.value)}
                  disabled={isPending}
                  rows={2}
                  placeholder="Pourquoi ce niveau résiduel est accepté…"
                  className="starium-form-textarea"
                />
              </div>
            </EbiosSection>

            <EbiosSection
              step={6}
              title="Suivi"
              hint="Statut et dates ; clôture dérivée du statut côté serveur."
            >
              <div className="space-y-2">
                <Label className="starium-form-label">Responsable du risque (optionnel)</Label>
                <Select
                  value={ownerUserId}
                  onValueChange={(v) => setOwnerUserId(v ?? OWNER_NONE)}
                  disabled={
                    isPending || assignableQuery.isLoading || humanResourcesQuery.isLoading
                  }
                >
                  <SelectTrigger className={EBIOS_SELECT_TRIGGER_CLASS}>
                    <span
                      className={cn(
                        selectTriggerLabelClass,
                        ownerUserId === OWNER_NONE && 'text-muted-foreground',
                      )}
                    >
                      {ownerLabel}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={OWNER_NONE}>Non assigné</SelectItem>
                    {ownerMissingFromList ? (
                      <SelectItem value={ownerUserId}>{OWNER_UNKNOWN_LABEL}</SelectItem>
                    ) : null}
                    {sortedMemberUsers.length > 0 ? (
                      <SelectGroup>
                        <SelectLabel>Membres du client</SelectLabel>
                        {sortedMemberUsers.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {formatUserLabel(u)}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ) : null}
                    {hrLinkedOwnerOptions.length > 0 ? (
                      <SelectGroup>
                        <SelectLabel>Ressources humaines (compte lié)</SelectLabel>
                        {hrLinkedOwnerOptions.map(({ userId, resource }) => (
                          <SelectItem key={userId} value={userId}>
                            {labelForHumanResourceOwner(resource)}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ) : null}
                  </SelectContent>
                </Select>
                {humanResourcesQuery.isError ? (
                  <p className="text-xs text-muted-foreground">
                    Référentiel RH indisponible — seuls les membres client sont proposés.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Inclut les fiches ressource « Humaine » avec un utilisateur plateforme lié (hors
                    doublon avec les membres ci-dessus).
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="starium-form-label">Statut du risque</Label>
                <Select
                  value={status}
                  onValueChange={(v) => v && setStatus(v)}
                  disabled={isPending}
                >
                  <SelectTrigger className={EBIOS_SELECT_TRIGGER_CLASS}>
                    <span className={selectTriggerLabelClass}>
                      {RISK_STATUS_LABEL[status] ?? 'Statut enregistré'}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {statusSelectKeys.map((k) => (
                      <SelectItem key={k} value={k}>
                        {RISK_STATUS_LABEL[k] ?? 'Statut enregistré'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="starium-form-grid starium-form-grid--3">
                <div className="space-y-2">
                  <Label className="starium-form-label" htmlFor="ebios-due">Échéance</Label>
                  <Input
                    className={EBIOS_INPUT_CLASS}
                    id="ebios-due"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="starium-form-label" htmlFor="ebios-detected">Date d’identification</Label>
                  <Input
                    className={EBIOS_INPUT_CLASS}
                    id="ebios-detected"
                    type="date"
                    value={detectedAt}
                    onChange={(e) => setDetectedAt(e.target.value)}
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="starium-form-label" htmlFor="ebios-review">Prochaine revue</Label>
                  <Input
                    className={EBIOS_INPUT_CLASS}
                    id="ebios-review"
                    type="date"
                    value={reviewDate}
                    onChange={(e) => setReviewDate(e.target.value)}
                    disabled={isPending}
                  />
                </div>
              </div>
              {mode === 'edit' && riskResolved?.closedAt ? (
                <div className="space-y-1">
                  <Label className="starium-form-label text-muted-foreground">Date de clôture (lecture seule)</Label>
                  <p className="text-sm tabular-nums">
                    {new Date(riskResolved.closedAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              ) : null}
            </EbiosSection>

            {mode === 'edit' && riskResolved && canDelete && onDelete ? (
              <section className="starium-form-section border-[color-mix(in_srgb,var(--state-danger)_35%,var(--border))] bg-[color-mix(in_srgb,var(--state-danger)_6%,transparent)]">
                <p className="text-sm font-bold text-[color:var(--state-danger)]">Supprimer ce risque</p>
                <p className="starium-form-hint mt-1">
                  Retrait définitif du registre pour{' '}
                  <span className="font-mono font-semibold text-foreground">{riskResolved.code}</span>.
                </p>
                <button
                  type="button"
                  className="starium-btn mt-3 border-[color-mix(in_srgb,var(--state-danger)_45%,var(--border))] bg-[color-mix(in_srgb,var(--state-danger)_8%,var(--card))] text-[color:var(--state-danger)]"
                  disabled={isPending || isDeleting}
                  onClick={async () => {
                    if (
                      !window.confirm(
                        `Supprimer définitivement le risque « ${riskResolved.title} » (${riskResolved.code}) ?`,
                      )
                    ) {
                      return;
                    }
                    await onDelete();
                  }}
                >
                  {isDeleting ? 'Suppression…' : 'Supprimer du registre'}
                </button>
              </section>
            ) : null}
            </div>
          </DialogBody>

          <DialogFooter>
            <button
              type="button"
              className="starium-btn starium-btn-secondary"
              onClick={() => void handleOpenChange(false)}
              disabled={isPending}
            >
              Annuler
            </button>
            <button
              type="button"
              className="starium-btn starium-btn-primary"
              onClick={() => void handleManualSave()}
              disabled={isPending || !canSubmit}
            >
              {isPending ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <ActionPlanTaskCreateDialog
      open={addToPlanOpen}
      onOpenChange={setAddToPlanOpen}
      prefill={addTaskFromRiskPrefill}
      title="Nouvelle tâche dans le plan"
    />

    <ActionPlanTaskEditDialog
      open={planTaskViewOpen}
      onOpenChange={(o) => {
        setPlanTaskViewOpen(o);
        if (!o) setPlanTaskView(null);
      }}
      actionPlanId={planTaskView?.actionPlanId ?? ''}
      task={planTaskView}
      canEdit={canUpdateProjects}
    />
    </>
  );
}
