'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
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
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { listAssignableUsers } from '../api/projects.api';
import type { CreateProjectRiskPayload } from '../api/projects.api';
import { useDebouncedServerAutosave } from '@/hooks/use-debounced-server-autosave';
import type { ProjectRiskApi, ProjectRiskCriticalityLevel } from '../types/project.types';
import {
  PROJECT_RISK_CRITICALITY_LABEL,
  PROJECT_RISK_IMPACT_CATEGORY_LABEL,
  RISK_PI_SCALE_LABEL,
  RISK_STATUS_LABEL,
  RISK_TREATMENT_STRATEGY_LABEL,
} from '../constants/project-enum-labels';

const PI_OPTIONS = [1, 2, 3, 4, 5] as const;
const NONE = '__none__';
const OWNER_NONE = '__none__';

const TREATMENT_KEYS = ['AVOID', 'REDUCE', 'TRANSFER', 'ACCEPT'] as const;
const RESIDUAL_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
const IMPACT_CATS = ['FINANCIAL', 'OPERATIONAL', 'LEGAL', 'REPUTATION'] as const;

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
    title: p.title,
    threatSource: p.threatSource,
    description: p.description,
    businessImpact: p.businessImpact,
    category: p.category ?? '',
    likelihoodJustification: p.likelihoodJustification ?? '',
    impactCategory: p.impactCategory ?? '',
    probability: p.probability,
    impact: p.impact,
    mitigationPlan: p.mitigationPlan ?? '',
    contingencyPlan: p.contingencyPlan ?? '',
    status: p.status ?? 'OPEN',
    dueDate: p.dueDate ?? '',
    detectedAt: p.detectedAt ?? '',
    reviewDate: p.reviewDate ?? '',
    treatmentStrategy: p.treatmentStrategy,
    residualRiskLevel: p.residualRiskLevel ?? '',
    residualJustification: p.residualJustification ?? '',
    ownerUserId: p.ownerUserId ?? '',
  };
  return JSON.stringify(o);
}

/** Aligné sur `buildPayload` + champs dates comme à l’écran. */
function snapshotFromRisk(r: ProjectRiskApi): string {
  return stableRiskSnapshot({
    title: r.title.trim(),
    threatSource: r.threatSource.trim(),
    description: (r.description ?? '').trim(),
    businessImpact: r.businessImpact.trim(),
    category: r.category?.trim() || undefined,
    likelihoodJustification: r.likelihoodJustification?.trim() || undefined,
    impactCategory: r.impactCategory ?? undefined,
    probability: r.probability,
    impact: r.impact,
    mitigationPlan: r.mitigationPlan?.trim() || undefined,
    contingencyPlan: r.contingencyPlan?.trim() || undefined,
    status: r.status,
    dueDate: dateInputToIso(toDateInputValue(r.dueDate)),
    detectedAt: dateInputToIso(toDateInputValue(r.detectedAt)),
    reviewDate: dateInputToIso(toDateInputValue(r.reviewDate)),
    treatmentStrategy: r.treatmentStrategy,
    residualRiskLevel: r.residualRiskLevel ?? undefined,
    residualJustification: r.residualJustification?.trim() || undefined,
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

function impactCategoryDisplayLabel(value: string): string {
  if (value === NONE) return '';
  return PROJECT_RISK_IMPACT_CATEGORY_LABEL[value] ?? 'Catégorie enregistrée';
}

function residualLevelDisplayLabel(value: string): string {
  if (value === NONE) return '';
  return PROJECT_RISK_CRITICALITY_LABEL[value] ?? 'Niveau enregistré';
}

const selectTriggerLabelClass =
  'min-w-0 flex-1 truncate text-left text-sm leading-none';

function criticalityBadgeClass(level: string): string {
  switch (level) {
    case 'CRITICAL':
      return 'border-violet-500/50 bg-violet-500/10 text-violet-950 dark:text-violet-300';
    case 'HIGH':
      return 'border-red-500/50 bg-red-500/10 text-red-800 dark:text-red-300';
    case 'MEDIUM':
      return 'border-amber-500/50 bg-amber-500/10 text-amber-950 dark:text-amber-600';
    default:
      return 'border-emerald-600/45 bg-emerald-500/10 text-emerald-950 dark:text-emerald-500';
  }
}

/** Aligné `project-risk-criticality.util.ts` (serveur). */
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
      <Label className="text-foreground">Matrice de criticité (P×I)</Label>
      <p className="text-xs text-muted-foreground">
        Même grille que le serveur : score = vraisemblance × gravité. Cliquez une case pour
        appliquer P et I.
      </p>
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
  return (
    <Card size="sm" className="border-border/70 bg-card shadow-sm">
      <CardHeader className="border-b border-border/50 px-3 pb-3 pt-3 sm:px-4">
        <div className="flex flex-wrap items-start gap-3">
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-xs font-semibold tabular-nums text-primary"
            aria-hidden
          >
            {step}
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <CardTitle className="text-sm font-semibold leading-snug text-foreground">
              {title}
            </CardTitle>
            {hint ? (
              <p className="text-xs text-muted-foreground leading-relaxed">{hint}</p>
            ) : null}
          </div>
          {headerExtra ? <div className="shrink-0">{headerExtra}</div> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-3 pb-3 pt-3 sm:px-4">{children}</CardContent>
    </Card>
  );
}

type Mode = 'create' | 'edit';

export type ProjectRiskEbiosDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: Mode;
  projectId: string;
  risk: ProjectRiskApi | null;
  isPending: boolean;
  onSave: (payload: CreateProjectRiskPayload) => Promise<void>;
  /** Édition uniquement : affiche la zone de suppression. */
  canDelete?: boolean;
  onDelete?: () => Promise<void>;
  isDeleting?: boolean;
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
}: ProjectRiskEbiosDialogProps) {
  const authFetch = useAuthenticatedFetch();
  const assignableQuery = useQuery({
    queryKey: ['projects', 'assignable-users', projectId],
    queryFn: () => listAssignableUsers(authFetch),
    enabled: open && Boolean(projectId),
  });

  const [title, setTitle] = useState('');
  const [threatSource, setThreatSource] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [businessImpact, setBusinessImpact] = useState('');
  const [impactCategory, setImpactCategory] = useState<string>(NONE);
  const [probability, setProbability] = useState(3);
  const [impact, setImpact] = useState(3);
  const [likelihoodJustification, setLikelihoodJustification] = useState('');
  const [mitigationPlan, setMitigationPlan] = useState('');
  const [contingencyPlan, setContingencyPlan] = useState('');
  const [treatmentStrategy, setTreatmentStrategy] =
    useState<string>('REDUCE');
  const [residualRiskLevel, setResidualRiskLevel] = useState<string>(NONE);
  const [residualJustification, setResidualJustification] = useState('');
  const [status, setStatus] = useState<string>('OPEN');
  const [dueDate, setDueDate] = useState('');
  const [detectedAt, setDetectedAt] = useState('');
  const [reviewDate, setReviewDate] = useState('');
  const [ownerUserId, setOwnerUserId] = useState<string>(OWNER_NONE);

  const savedSnapshotRef = useRef<string>('');
  const loadedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      loadedKeyRef.current = null;
      return;
    }
    const key =
      mode === 'edit' && risk
        ? `edit:${risk.id}`
        : mode === 'create'
          ? 'create'
          : '';
    if (!key) return;
    if (loadedKeyRef.current === key) return;
    loadedKeyRef.current = key;

    if (mode === 'edit' && risk) {
      setTitle(risk.title);
      setThreatSource(risk.threatSource ?? '');
      setDescription(risk.description ?? '');
      setCategory(risk.category ?? '');
      setBusinessImpact(risk.businessImpact ?? '');
      setImpactCategory(risk.impactCategory ?? NONE);
      setProbability(risk.probability);
      setImpact(risk.impact);
      setLikelihoodJustification(risk.likelihoodJustification ?? '');
      setMitigationPlan(risk.mitigationPlan ?? '');
      setContingencyPlan(risk.contingencyPlan ?? '');
      setTreatmentStrategy(risk.treatmentStrategy ?? 'REDUCE');
      setResidualRiskLevel(risk.residualRiskLevel ?? NONE);
      setResidualJustification(risk.residualJustification ?? '');
      setStatus(risk.status);
      setDueDate(toDateInputValue(risk.dueDate));
      setDetectedAt(toDateInputValue(risk.detectedAt));
      setReviewDate(toDateInputValue(risk.reviewDate));
      setOwnerUserId(risk.ownerUserId ?? OWNER_NONE);
      savedSnapshotRef.current = snapshotFromRisk(risk);
      return;
    }
    if (mode === 'create') {
      setTitle('');
      setThreatSource('');
      setDescription('');
      setCategory('');
      setBusinessImpact('');
      setImpactCategory(NONE);
      setProbability(3);
      setImpact(3);
      setLikelihoodJustification('');
      setMitigationPlan('');
      setContingencyPlan('');
      setTreatmentStrategy('REDUCE');
      setResidualRiskLevel(NONE);
      setResidualJustification('');
      setStatus('OPEN');
      setDueDate('');
      setDetectedAt('');
      setReviewDate('');
      setOwnerUserId(OWNER_NONE);
      savedSnapshotRef.current = '';
    }
  }, [open, mode, risk?.id]);

  const residualSoftWarning = useMemo(() => {
    if (mode !== 'edit' || !risk || residualRiskLevel === NONE) return false;
    const rOrd = CRIT_ORDER[residualRiskLevel] ?? 0;
    const iOrd = CRIT_ORDER[risk.criticalityLevel] ?? 0;
    return rOrd > iOrd;
  }, [mode, risk, residualRiskLevel]);

  const piChanged =
    mode === 'edit' &&
    risk &&
    (probability !== risk.probability || impact !== risk.impact);

  const buildPayload = useCallback((): CreateProjectRiskPayload | null => {
    const t = title.trim();
    const ts = threatSource.trim();
    const sc = description.trim();
    const bi = businessImpact.trim();
    if (!t || !ts || !sc || !bi || !treatmentStrategy) return null;
    return {
      title: t,
      threatSource: ts,
      description: sc,
      businessImpact: bi,
      category: category.trim() || undefined,
      likelihoodJustification: likelihoodJustification.trim() || undefined,
      impactCategory: impactCategory === NONE ? undefined : impactCategory,
      probability,
      impact,
      mitigationPlan: mitigationPlan.trim() || undefined,
      contingencyPlan: contingencyPlan.trim() || undefined,
      status,
      dueDate: dateInputToIso(dueDate),
      detectedAt: dateInputToIso(detectedAt),
      reviewDate: dateInputToIso(reviewDate),
      treatmentStrategy,
      residualRiskLevel: residualRiskLevel !== NONE ? residualRiskLevel : undefined,
      residualJustification: residualJustification.trim() || undefined,
      ownerUserId: ownerUserId === OWNER_NONE ? null : ownerUserId,
    };
  }, [
    title,
    threatSource,
    description,
    businessImpact,
    category,
    likelihoodJustification,
    impactCategory,
    probability,
    impact,
    mitigationPlan,
    contingencyPlan,
    status,
    dueDate,
    detectedAt,
    reviewDate,
    treatmentStrategy,
    residualRiskLevel,
    residualJustification,
    ownerUserId,
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

  const users = assignableQuery.data?.users ?? [];

  const impactCategorySelectKeys = useMemo(() => {
    const base: string[] = [...IMPACT_CATS];
    if (impactCategory !== NONE && !base.includes(impactCategory)) {
      base.push(impactCategory);
    }
    return base;
  }, [impactCategory]);

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

  const ownerMissingFromList =
    ownerUserId !== OWNER_NONE && !users.some((u) => u.id === ownerUserId);

  const ownerLabel = useMemo(() => {
    if (ownerUserId === OWNER_NONE) return 'Non assigné';
    const u = users.find((x) => x.id === ownerUserId);
    if (u) return formatUserLabel(u);
    return OWNER_UNKNOWN_LABEL;
  }, [ownerUserId, users]);

  const canSubmit =
    Boolean(title.trim()) &&
    Boolean(threatSource.trim()) &&
    Boolean(description.trim()) &&
    Boolean(businessImpact.trim()) &&
    Boolean(treatmentStrategy);

  useDebouncedServerAutosave({
    enabled: open,
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton
        className="max-h-[min(90vh,880px)] w-full gap-4 overflow-y-auto sm:max-w-4xl lg:max-w-5xl"
      >
        <form
          onSubmit={(e) => e.preventDefault()}
          className="flex flex-col gap-4"
        >
          <DialogHeader className="space-y-3 text-left">
            <div className="flex flex-wrap items-baseline gap-2 gap-y-1">
              <DialogTitle className="text-lg font-semibold tracking-tight">
                {mode === 'create' ? 'Nouveau risque' : 'Modifier le risque'}
              </DialogTitle>
              <Badge variant="secondary" className="font-normal">
                EBIOS RM
              </Badge>
            </div>
            <DialogDescription className="text-sm leading-relaxed">
              Scénario, évaluation, impact métier, traitement, résiduel et suivi — aligné ISO 27005.
              Les changements sont enregistrés automatiquement (dès que le formulaire est valide).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-0.5">
            <EbiosSection
              step={1}
              title="Identification du scénario"
              hint="Titre court pour les listes ; scénario structuré « Si X alors Y » (complémentaires)."
              headerExtra={
                mode === 'edit' && risk ? (
                  <Badge variant="outline" className="font-mono text-xs font-normal">
                    {risk.code}
                  </Badge>
                ) : undefined
              }
            >
              <div className="space-y-2">
                <Label htmlFor="ebios-title">Titre du risque (registre)</Label>
                <Input
                  id="ebios-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isPending}
                  maxLength={500}
                  placeholder="ex. Vulnérabilité résiduelle post cut-over"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ebios-threat">Source de menace</Label>
                <Input
                  id="ebios-threat"
                  value={threatSource}
                  onChange={(e) => setThreatSource(e.target.value)}
                  disabled={isPending}
                  maxLength={300}
                  placeholder="ex. cyberattaque, fournisseur, erreur humaine"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ebios-scenario">Scénario (Si X alors Y)</Label>
                <textarea
                  id="ebios-scenario"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isPending}
                  rows={3}
                  placeholder="Si la migration est mal testée alors un incident majeur en production…"
                  className={cn(
                    'flex min-h-[72px] w-full rounded-lg border border-input bg-background px-2.5 py-2 text-sm shadow-xs outline-none transition-colors',
                    'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                  )}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ebios-cat">Famille ou domaine (optionnel)</Label>
                <Input
                  id="ebios-cat"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={isPending}
                  maxLength={200}
                  placeholder="ex. Cybersécurité, Migration, Fournisseur"
                />
              </div>
            </EbiosSection>

            <EbiosSection
              step={2}
              title="Évaluation du risque"
              hint="Le score P×I et la criticité sont calculés côté serveur à l’enregistrement."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Vraisemblance (1–5)</Label>
                  <Select
                    value={String(probability)}
                    onValueChange={(v) => setProbability(Number(v))}
                    disabled={isPending}
                  >
                    <SelectTrigger className="w-full min-w-0">
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
                  <Label>Gravité d’impact (1–5)</Label>
                  <Select
                    value={String(impact)}
                    onValueChange={(v) => setImpact(Number(v))}
                    disabled={isPending}
                  >
                    <SelectTrigger className="w-full min-w-0">
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
                <Label htmlFor="ebios-likelihood-j">Justification de la vraisemblance (optionnel)</Label>
                <textarea
                  id="ebios-likelihood-j"
                  value={likelihoodJustification}
                  onChange={(e) => setLikelihoodJustification(e.target.value)}
                  disabled={isPending}
                  rows={2}
                  placeholder="Pourquoi ce score de probabilité…"
                  className={cn(
                    'flex min-h-[56px] w-full rounded-lg border border-input bg-background px-2.5 py-2 text-sm shadow-xs outline-none transition-colors',
                    'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                  )}
                />
              </div>
              {mode === 'edit' && risk ? (
                <div
                  className={cn(
                    'flex flex-col gap-1.5 rounded-lg border border-border/60 bg-muted/25 px-3 py-2.5 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2 sm:gap-y-1',
                  )}
                >
                  <span className="text-muted-foreground">Criticité enregistrée</span>
                  <span className="tabular-nums font-semibold text-foreground">
                    {risk.criticalityScore}
                  </span>
                  <span className="hidden text-muted-foreground sm:inline" aria-hidden>
                    ·
                  </span>
                  <Badge
                    variant="outline"
                    className={cn('font-normal', criticalityBadgeClass(risk.criticalityLevel))}
                  >
                    {PROJECT_RISK_CRITICALITY_LABEL[risk.criticalityLevel as ProjectRiskCriticalityLevel] ??
                      risk.criticalityLevel}
                  </Badge>
                  {piChanged ? (
                    <span className="text-xs text-amber-700 dark:text-amber-400">
                      P×I modifiés — enregistrez pour recalculer la criticité.
                    </span>
                  ) : null}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Après création, le serveur enregistre le score P×I et le niveau de criticité dérivés.
                </p>
              )}
            </EbiosSection>

            <EbiosSection
              step={3}
              title="Impact métier"
              hint="Conséquences pour l’organisation."
            >
              <div className="space-y-2">
                <Label htmlFor="ebios-bi">Impact métier</Label>
                <textarea
                  id="ebios-bi"
                  value={businessImpact}
                  onChange={(e) => setBusinessImpact(e.target.value)}
                  disabled={isPending}
                  rows={3}
                  placeholder="Perte de revenus, interruption de service, image, obligations légales…"
                  className={cn(
                    'flex min-h-[72px] w-full rounded-lg border border-input bg-background px-2.5 py-2 text-sm shadow-xs outline-none transition-colors',
                    'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                  )}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Catégorie d’impact (optionnel)</Label>
                <Select
                  value={impactCategory}
                  onValueChange={(v) => setImpactCategory(v ?? NONE)}
                  disabled={isPending}
                >
                  <SelectTrigger className="w-full min-w-0">
                    <span
                      className={cn(
                        selectTriggerLabelClass,
                        impactCategory === NONE && 'text-muted-foreground',
                      )}
                    >
                      {impactCategory === NONE
                        ? 'Non renseigné'
                        : impactCategoryDisplayLabel(impactCategory)}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Non renseigné</SelectItem>
                    {impactCategorySelectKeys.map((k) => (
                      <SelectItem key={k} value={k}>
                        {PROJECT_RISK_IMPACT_CATEGORY_LABEL[k] ?? 'Valeur enregistrée'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </EbiosSection>

            <EbiosSection
              step={4}
              title="Traitement du risque"
              hint="Stratégie obligatoire ; plans optionnels."
            >
              <div className="space-y-2">
                <Label>Stratégie de traitement</Label>
                <Select
                  value={treatmentStrategy}
                  onValueChange={(v) => v && setTreatmentStrategy(v)}
                  disabled={isPending}
                >
                  <SelectTrigger className="w-full min-w-0">
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
                <Label htmlFor="ebios-mitigation">Plan de réduction / mesures (optionnel)</Label>
                <textarea
                  id="ebios-mitigation"
                  value={mitigationPlan}
                  onChange={(e) => setMitigationPlan(e.target.value)}
                  disabled={isPending}
                  rows={3}
                  placeholder="Actions pour réduire la vraisemblance ou l’impact…"
                  className={cn(
                    'flex min-h-[72px] w-full rounded-lg border border-input bg-background px-2.5 py-2 text-sm shadow-xs outline-none transition-colors',
                    'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ebios-contingency">Plan de continuité / secours (optionnel)</Label>
                <textarea
                  id="ebios-contingency"
                  value={contingencyPlan}
                  onChange={(e) => setContingencyPlan(e.target.value)}
                  disabled={isPending}
                  rows={2}
                  placeholder="Si le scénario se produit malgré tout…"
                  className={cn(
                    'flex min-h-[56px] w-full rounded-lg border border-input bg-background px-2.5 py-2 text-sm shadow-xs outline-none transition-colors',
                    'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                  )}
                />
              </div>
            </EbiosSection>

            <EbiosSection
              step={5}
              title="Risque résiduel"
              hint="Niveau résiduel après traitement ; cohérent avec la criticité initiale (indicatif)."
            >
              {residualSoftWarning ? (
                <Alert className="border-amber-500/40 bg-amber-500/[0.06]">
                  <AlertDescription className="text-xs">
                    Le niveau résiduel semble supérieur à la criticité initiale (P×I) — vérifiez la
                    cohérence.
                  </AlertDescription>
                </Alert>
              ) : null}
              <div className="space-y-2">
                <Label>Niveau de risque résiduel (optionnel)</Label>
                <Select
                  value={residualRiskLevel}
                  onValueChange={(v) => setResidualRiskLevel(v ?? NONE)}
                  disabled={isPending}
                >
                  <SelectTrigger className="w-full min-w-0">
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
                <Label htmlFor="ebios-resid-j">Justification du résiduel (optionnel)</Label>
                <textarea
                  id="ebios-resid-j"
                  value={residualJustification}
                  onChange={(e) => setResidualJustification(e.target.value)}
                  disabled={isPending}
                  rows={2}
                  placeholder="Pourquoi ce niveau résiduel est accepté…"
                  className={cn(
                    'flex min-h-[56px] w-full rounded-lg border border-input bg-background px-2.5 py-2 text-sm shadow-xs outline-none transition-colors',
                    'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                  )}
                />
              </div>
            </EbiosSection>

            <EbiosSection
              step={6}
              title="Suivi"
              hint="Statut et dates ; clôture dérivée du statut côté serveur."
            >
              <div className="space-y-2">
                <Label>Responsable du risque (optionnel)</Label>
                <Select
                  value={ownerUserId}
                  onValueChange={(v) => setOwnerUserId(v ?? OWNER_NONE)}
                  disabled={isPending || assignableQuery.isLoading}
                >
                  <SelectTrigger className="w-full min-w-0">
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
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {formatUserLabel(u)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Statut du risque</Label>
                <Select
                  value={status}
                  onValueChange={(v) => v && setStatus(v)}
                  disabled={isPending}
                >
                  <SelectTrigger className="w-full min-w-0">
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
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="ebios-due">Échéance</Label>
                  <Input
                    id="ebios-due"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ebios-detected">Date d’identification</Label>
                  <Input
                    id="ebios-detected"
                    type="date"
                    value={detectedAt}
                    onChange={(e) => setDetectedAt(e.target.value)}
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ebios-review">Prochaine revue</Label>
                  <Input
                    id="ebios-review"
                    type="date"
                    value={reviewDate}
                    onChange={(e) => setReviewDate(e.target.value)}
                    disabled={isPending}
                  />
                </div>
              </div>
              {mode === 'edit' && risk?.closedAt ? (
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Date de clôture (lecture seule)</Label>
                  <p className="text-sm tabular-nums">
                    {new Date(risk.closedAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              ) : null}
            </EbiosSection>

            {mode === 'edit' && risk && canDelete && onDelete ? (
              <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 sm:px-5">
                <p className="text-sm font-medium text-destructive">Supprimer ce risque</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Retrait définitif du registre pour{' '}
                  <span className="font-mono text-foreground">{risk.code}</span>.
                </p>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="mt-3"
                  disabled={isPending || isDeleting}
                  onClick={async () => {
                    if (
                      !window.confirm(
                        `Supprimer définitivement le risque « ${risk.title} » (${risk.code}) ?`,
                      )
                    ) {
                      return;
                    }
                    await onDelete();
                  }}
                >
                  {isDeleting ? 'Suppression…' : 'Supprimer du registre'}
                </Button>
              </div>
            ) : null}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
