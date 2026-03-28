'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
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
import { cn } from '@/lib/utils';
import type { CreateProjectRiskPayload } from '../api/projects.api';
import type { ProjectRiskApi, ProjectRiskCriticalityLevel } from '../types/project.types';
import {
  PROJECT_RISK_CRITICALITY_LABEL,
  RISK_PI_SCALE_LABEL,
  RISK_STATUS_LABEL,
  RISK_TREATMENT_STRATEGY_LABEL,
} from '../constants/project-enum-labels';

const PI_OPTIONS = [1, 2, 3, 4, 5] as const;
const NONE = '__none__';

const TREATMENT_KEYS = ['AVOID', 'REDUCE', 'TRANSFER', 'ACCEPT'] as const;
const RESIDUAL_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

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

/** Même grille que le backend (project-risk-criticality.util). */
function previewCriticality(
  probability: number,
  impact: number,
): { score: number; level: ProjectRiskCriticalityLevel } {
  const score = probability * impact;
  let level: ProjectRiskCriticalityLevel = 'CRITICAL';
  if (score <= 4) level = 'LOW';
  else if (score <= 9) level = 'MEDIUM';
  else if (score <= 16) level = 'HIGH';
  return { score, level };
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
  headerExtra,
  children,
}: {
  step: number;
  title: string;
  headerExtra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card size="sm" className="border-border/70 bg-card shadow-sm">
      <CardHeader className="border-b border-border/50 px-3 pb-3 pt-3 sm:px-4">
        <div className="flex flex-wrap items-center gap-3">
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
  risk: ProjectRiskApi | null;
  isPending: boolean;
  onSave: (payload: CreateProjectRiskPayload) => Promise<void>;
};

export function ProjectRiskEbiosDialog({
  open,
  onOpenChange,
  mode,
  risk,
  isPending,
  onSave,
}: ProjectRiskEbiosDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [probability, setProbability] = useState(3);
  const [impact, setImpact] = useState(3);
  const [mitigationPlan, setMitigationPlan] = useState('');
  const [contingencyPlan, setContingencyPlan] = useState('');
  const [treatmentStrategy, setTreatmentStrategy] = useState<string>(NONE);
  const [residualRiskLevel, setResidualRiskLevel] = useState<string>(NONE);
  const [status, setStatus] = useState<string>('OPEN');
  const [dueDate, setDueDate] = useState('');
  const [detectedAt, setDetectedAt] = useState('');
  const [reviewDate, setReviewDate] = useState('');

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && risk) {
      setTitle(risk.title);
      setDescription(risk.description ?? '');
      setCategory(risk.category ?? '');
      setProbability(risk.probability);
      setImpact(risk.impact);
      setMitigationPlan(risk.mitigationPlan ?? '');
      setContingencyPlan(risk.contingencyPlan ?? '');
      setTreatmentStrategy(risk.treatmentStrategy ?? NONE);
      setResidualRiskLevel(risk.residualRiskLevel ?? NONE);
      setStatus(risk.status);
      setDueDate(toDateInputValue(risk.dueDate));
      setDetectedAt(toDateInputValue(risk.detectedAt));
      setReviewDate(toDateInputValue(risk.reviewDate));
      return;
    }
    if (mode === 'create') {
      setTitle('');
      setDescription('');
      setCategory('');
      setProbability(3);
      setImpact(3);
      setMitigationPlan('');
      setContingencyPlan('');
      setTreatmentStrategy(NONE);
      setResidualRiskLevel(NONE);
      setStatus('OPEN');
      setDueDate('');
      setDetectedAt('');
      setReviewDate('');
    }
  }, [open, mode, risk]);

  const preview = useMemo(
    () => previewCriticality(probability, impact),
    [probability, impact],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;

    const payload: CreateProjectRiskPayload = {
      title: t,
      description: description.trim() || undefined,
      category: category.trim() || undefined,
      probability,
      impact,
      mitigationPlan: mitigationPlan.trim() || undefined,
      contingencyPlan: contingencyPlan.trim() || undefined,
      status,
      dueDate: dateInputToIso(dueDate),
      detectedAt: dateInputToIso(detectedAt),
      reviewDate: dateInputToIso(reviewDate),
      treatmentStrategy:
        treatmentStrategy !== NONE ? treatmentStrategy : undefined,
      residualRiskLevel: residualRiskLevel !== NONE ? residualRiskLevel : undefined,
    };

    await onSave(payload);
  };

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
              Scénario, évaluation, traitement, résiduel et suivi — aligné ISO 27005.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-0.5">
            <EbiosSection
              step={1}
              title="Identification du scénario"
              headerExtra={
                mode === 'edit' && risk ? (
                  <Badge variant="outline" className="font-mono text-xs font-normal">
                    {risk.code}
                  </Badge>
                ) : undefined
              }
            >
              <div className="space-y-2">
                <Label htmlFor="ebios-title">Intitulé du scénario de risque</Label>
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
                <Label htmlFor="ebios-desc">Description / contexte</Label>
                <textarea
                  id="ebios-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isPending}
                  rows={3}
                  placeholder="Sources, biens support, conséquences redoutées…"
                  className={cn(
                    'flex min-h-[72px] w-full rounded-lg border border-input bg-background px-2.5 py-2 text-sm shadow-xs outline-none transition-colors',
                    'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                  )}
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

            <EbiosSection step={2} title="Évaluation — vraisemblance × gravité">
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
              <div
                className={cn(
                  'flex flex-col gap-1.5 rounded-lg border border-border/60 bg-muted/25 px-3 py-2.5 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2 sm:gap-y-1',
                )}
              >
                <span className="text-muted-foreground">Score calculé</span>
                <span className="tabular-nums font-semibold text-foreground">{preview.score}</span>
                <span className="hidden text-muted-foreground sm:inline" aria-hidden>
                  ·
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground">Criticité</span>
                  <Badge
                    variant="outline"
                    className={cn('font-normal', criticalityBadgeClass(preview.level))}
                  >
                    {PROJECT_RISK_CRITICALITY_LABEL[preview.level] ?? preview.level}
                  </Badge>
                  {mode === 'edit' && risk ? (
                    <span className="text-xs text-muted-foreground">
                      (enregistré : {risk.criticalityScore} —{' '}
                      {PROJECT_RISK_CRITICALITY_LABEL[risk.criticalityLevel] ??
                        risk.criticalityLevel}
                      )
                    </span>
                  ) : null}
                </div>
              </div>
            </EbiosSection>

            <EbiosSection step={3} title="Traitement du risque">
              <div className="space-y-2">
                <Label>Stratégie de traitement</Label>
                <Select
                  value={treatmentStrategy}
                  onValueChange={(v) => setTreatmentStrategy(v ?? NONE)}
                  disabled={isPending}
                >
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue placeholder="Non renseigné">
                      {treatmentStrategy === NONE
                        ? null
                        : RISK_TREATMENT_STRATEGY_LABEL[treatmentStrategy] ?? treatmentStrategy}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Non renseigné</SelectItem>
                    {TREATMENT_KEYS.map((k) => (
                      <SelectItem key={k} value={k}>
                        {RISK_TREATMENT_STRATEGY_LABEL[k] ?? k}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ebios-mitigation">Plan de réduction / mesures</Label>
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
                <Label htmlFor="ebios-contingency">Plan de continuité / secours</Label>
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

            <EbiosSection step={4} title="Risque résiduel">
              <div className="space-y-2">
                <Label>Niveau de risque résiduel</Label>
                <Select
                  value={residualRiskLevel}
                  onValueChange={(v) => setResidualRiskLevel(v ?? NONE)}
                  disabled={isPending}
                >
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue placeholder="Non évalué">
                      {residualRiskLevel === NONE
                        ? null
                        : PROJECT_RISK_CRITICALITY_LABEL[residualRiskLevel] ??
                          residualRiskLevel}
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
            </EbiosSection>

            <EbiosSection step={5} title="Suivi">
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
            <Button type="submit" disabled={isPending || !title.trim()}>
              {isPending ? 'Enregistrement…' : mode === 'create' ? 'Créer le risque' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
