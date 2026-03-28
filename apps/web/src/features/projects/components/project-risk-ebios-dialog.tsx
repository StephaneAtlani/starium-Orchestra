'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { listAssignableUsers } from '../api/projects.api';
import type { CreateProjectRiskPayload } from '../api/projects.api';
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

function formatUserLabel(u: {
  email: string;
  firstName: string | null;
  lastName: string | null;
}): string {
  const n = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  return n ? `${n} (${u.email})` : u.email;
}

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
};

export function ProjectRiskEbiosDialog({
  open,
  onOpenChange,
  mode,
  projectId,
  risk,
  isPending,
  onSave,
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

  useEffect(() => {
    if (!open) return;
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
    }
  }, [open, mode, risk]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    const ts = threatSource.trim();
    const sc = description.trim();
    const bi = businessImpact.trim();
    if (!ts || !sc || !bi || !treatmentStrategy) return;

    const payload: CreateProjectRiskPayload = {
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

    await onSave(payload);
  };

  const users = assignableQuery.data?.users ?? [];

  const ownerLabel = useMemo(() => {
    if (ownerUserId === OWNER_NONE) return 'Non assigné';
    const u = users.find((x) => x.id === ownerUserId);
    return u ? formatUserLabel(u) : ownerUserId;
  }, [ownerUserId, users]);

  const canSubmit =
    Boolean(title.trim()) &&
    Boolean(threatSource.trim()) &&
    Boolean(description.trim()) &&
    Boolean(businessImpact.trim()) &&
    Boolean(treatmentStrategy);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="max-h-[min(90vh,880px)] w-full gap-4 overflow-y-auto sm:max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
                      <SelectValue>
                        {RISK_PI_SCALE_LABEL[String(probability)] ?? String(probability)}
                      </SelectValue>
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
                      <SelectValue>
                        {RISK_PI_SCALE_LABEL[String(impact)] ?? String(impact)}
                      </SelectValue>
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
                    <SelectValue placeholder="Non renseigné">
                      {impactCategory === NONE
                        ? null
                        : PROJECT_RISK_IMPACT_CATEGORY_LABEL[impactCategory] ?? impactCategory}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Non renseigné</SelectItem>
                    {IMPACT_CATS.map((k) => (
                      <SelectItem key={k} value={k}>
                        {PROJECT_RISK_IMPACT_CATEGORY_LABEL[k]}
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
                    <SelectValue>
                      {RISK_TREATMENT_STRATEGY_LABEL[treatmentStrategy] ?? treatmentStrategy}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {TREATMENT_KEYS.map((k) => (
                      <SelectItem key={k} value={k}>
                        {RISK_TREATMENT_STRATEGY_LABEL[k] ?? k}
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
                    <SelectValue placeholder="Non évalué">
                      {residualRiskLevel === NONE
                        ? null
                        : PROJECT_RISK_CRITICALITY_LABEL[residualRiskLevel] ?? residualRiskLevel}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Non renseigné</SelectItem>
                    {RESIDUAL_LEVELS.map((k) => (
                      <SelectItem key={k} value={k}>
                        {PROJECT_RISK_CRITICALITY_LABEL[k]}
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
                    <SelectValue placeholder="Choisir…">{ownerLabel}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={OWNER_NONE}>Non assigné</SelectItem>
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
                    <SelectValue>
                      {RISK_STATUS_LABEL[status] ?? status}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(RISK_STATUS_LABEL).map((k) => (
                      <SelectItem key={k} value={k}>
                        {RISK_STATUS_LABEL[k]}
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
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isPending || !canSubmit}>
              {isPending ? 'Enregistrement…' : mode === 'create' ? 'Créer le risque' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
