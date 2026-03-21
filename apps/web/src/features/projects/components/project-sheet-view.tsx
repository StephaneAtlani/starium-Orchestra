'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChevronLeft, Info, LayoutDashboard, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingState } from '@/components/feedback/loading-state';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import {
  createProjectRisk,
  deleteProjectRisk,
  postProjectArbitration,
  updateProjectSheet,
} from '../api/projects.api';
import { projectDetail, projectsList } from '../constants/project-routes';
import {
  PROJECT_KIND_LABEL,
  PROJECT_PRIORITY_LABEL,
  PROJECT_STATUS_LABEL,
  PROJECT_TYPE_LABEL,
  RISK_STATUS_LABEL,
} from '../constants/project-enum-labels';
import { projectQueryKeys } from '../lib/project-query-keys';
import { riskCriticalityForRisk } from '../lib/risk-criticality';
import { useProjectSheetQuery } from '../hooks/use-project-sheet-query';
import { useProjectRisksQuery } from '../hooks/use-project-risks-query';
import type {
  ProjectArbitrationStatus,
  ProjectSheet,
  ProjectSheetRiskLevel,
  UpdateProjectSheetPayload,
} from '../types/project.types';

const RISK_LABEL: Record<ProjectSheetRiskLevel, string> = {
  LOW: 'Faible',
  MEDIUM: 'Moyen',
  HIGH: 'Élevé',
};

function riskTierFr(t: string): string {
  if (t === 'LOW' || t === 'MEDIUM' || t === 'HIGH') return RISK_LABEL[t];
  return t;
}

const ARBITRATION_LABEL: Record<ProjectArbitrationStatus, string> = {
  DRAFT: 'Brouillon',
  TO_REVIEW: 'À revue CODIR',
  VALIDATED: 'Validé',
  REJECTED: 'Refusé',
};

/** Valeur Select stable (évite uncontrolled → controlled si `undefined` au 1er rendu) */
const RISK_UNSET = '__unset__';

const GO_PRIORITY_SCORE_THRESHOLD = 5;

function fmtEuro(n: number | null | undefined): string {
  if (n == null) return '—';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);
}

function scoreOutOf5(n: number | null | undefined): string {
  if (n == null || n === undefined) return '—';
  return `${n} / 5`;
}

type DecisionCockpit = {
  badge: 'GO' | 'NO GO' | 'À ANALYSER' | 'À COMPLÉTER';
  message: string;
  badgeClassName: string;
};

function cockpitDecision(sheet: ProjectSheet): DecisionCockpit {
  const costMissing = sheet.estimatedCost == null;
  const gainMissing = sheet.estimatedGain == null;
  if (costMissing || gainMissing) {
    return {
      badge: 'À COMPLÉTER',
      message: 'Coût ou gain non renseigné',
      badgeClassName:
        'border-transparent bg-muted text-muted-foreground hover:bg-muted',
    };
  }
  const roi = sheet.roi;
  if (roi != null && roi < 0) {
    return {
      badge: 'NO GO',
      message: 'ROI négatif',
      badgeClassName: 'border-transparent bg-red-600 text-white hover:bg-red-600',
    };
  }
  const ps = sheet.priorityScore;
  if (roi != null && roi > 0 && ps != null && ps >= GO_PRIORITY_SCORE_THRESHOLD) {
    return {
      badge: 'GO',
      message: 'Projet rentable et prioritaire',
      badgeClassName:
        'border-transparent bg-emerald-600 text-white hover:bg-emerald-600',
    };
  }
  return {
    badge: 'À ANALYSER',
    message: 'Critères à affiner ou risque à intégrer',
    badgeClassName:
      'border-transparent bg-orange-500 text-white hover:bg-orange-500',
  };
}

function cockpitMissingLines(sheet: ProjectSheet): string[] {
  const lines: string[] = [];
  if (sheet.estimatedCost == null) lines.push('Coût manquant');
  if (sheet.estimatedGain == null) lines.push('Gain manquant');
  if (sheet.businessValueScore == null) lines.push('Valeur (score) manquant');
  if (sheet.strategicAlignment == null) lines.push('Alignement manquant');
  if (sheet.urgencyScore == null) lines.push('Urgence manquant');
  if (!sheet.businessProblem?.trim()) lines.push('Objectif métier (pourquoi) absent');
  return lines;
}

/** Une ligne vide minimum en formulaire ; données API → lignes éditables */
function linesForForm(arr: string[] | undefined): string[] {
  if (!arr?.length) return [''];
  return arr.map((s) => s.slice(0, 5000));
}

function trimLinesToPayload(lines: string[]): string[] {
  return lines.map((s) => s.trim()).filter(Boolean);
}

function DynamicLinesField({
  lines,
  onLinesChange,
  canEdit,
  placeholder,
  inputClassName,
}: {
  lines: string[];
  onLinesChange: (next: string[]) => void;
  canEdit: boolean;
  placeholder: (index: number) => string;
  inputClassName?: string;
}) {
  return (
    <div className="space-y-2">
      {lines.map((line, i) => (
        <div key={i} className="flex gap-2">
          <Input
            className={cn('min-w-0 flex-1', inputClassName)}
            disabled={!canEdit}
            value={line}
            placeholder={placeholder(i)}
            onChange={(e) => {
              const next = [...lines];
              next[i] = e.target.value;
              onLinesChange(next);
            }}
          />
          {canEdit && lines.length > 1 ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 text-muted-foreground hover:text-destructive"
              aria-label={`Supprimer la ligne ${i + 1}`}
              onClick={() =>
                onLinesChange(
                  lines.filter((_, j) => j !== i).length
                    ? lines.filter((_, j) => j !== i)
                    : [''],
                )
              }
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      ))}
      {canEdit ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full sm:w-auto"
          onClick={() => onLinesChange([...lines, ''])}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Ajouter une ligne
        </Button>
      ) : null}
    </div>
  );
}

function numOrUndef(s: string): number | undefined {
  if (s.trim() === '') return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

const textareaClass = cn(
  'min-h-[72px] w-full rounded-lg border border-input bg-background px-2.5 py-2 text-sm',
  'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
  'disabled:cursor-not-allowed disabled:opacity-50',
);

export function ProjectSheetView({ projectId }: { projectId: string }) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const queryClient = useQueryClient();
  const { has } = usePermissions();
  const canEdit = has('projects.update');

  const { data: sheet, isLoading, error } = useProjectSheetQuery(projectId);

  const [projectName, setProjectName] = useState('');
  const [cadreWhere, setCadreWhere] = useState('');
  const [cadreWho, setCadreWho] = useState('');
  const [cadreStart, setCadreStart] = useState('');
  const [cadreEnd, setCadreEnd] = useState('');

  const [bv, setBv] = useState('');
  const [sa, setSa] = useState('');
  const [us, setUs] = useState('');
  const [cost, setCost] = useState('');
  const [gain, setGain] = useState('');
  const [risk, setRisk] = useState<string>(RISK_UNSET);
  const [arbDraft, setArbDraft] = useState<ProjectArbitrationStatus>('DRAFT');

  const [description, setDescription] = useState('');
  const [problem, setProblem] = useState('');
  const [benefits, setBenefits] = useState('');
  const [kpiLines, setKpiLines] = useState<string[]>(['']);

  const [swS, setSwS] = useState<string[]>(['']);
  const [swW, setSwW] = useState<string[]>(['']);
  const [swO, setSwO] = useState<string[]>(['']);
  const [swT, setSwT] = useState<string[]>(['']);

  const [tSO, setTSO] = useState<string[]>(['']);
  const [tST, setTST] = useState<string[]>(['']);
  const [tWO, setTWO] = useState<string[]>(['']);
  const [tWT, setTWT] = useState<string[]>(['']);

  useEffect(() => {
    if (!sheet) return;
    setProjectName(sheet.name);
    setCadreWhere(sheet.cadreLocation ?? '');
    setCadreWho(sheet.cadreQui ?? '');
    setCadreStart(sheet.startDate ? sheet.startDate.slice(0, 10) : '');
    setCadreEnd(sheet.targetEndDate ? sheet.targetEndDate.slice(0, 10) : '');
    setBv(sheet.businessValueScore != null ? String(sheet.businessValueScore) : '');
    setSa(sheet.strategicAlignment != null ? String(sheet.strategicAlignment) : '');
    setUs(sheet.urgencyScore != null ? String(sheet.urgencyScore) : '');
    setCost(sheet.estimatedCost != null ? String(sheet.estimatedCost) : '');
    setGain(sheet.estimatedGain != null ? String(sheet.estimatedGain) : '');
    setRisk(sheet.riskLevel ?? RISK_UNSET);
    setArbDraft(sheet.arbitrationStatus ?? 'DRAFT');
    setDescription(sheet.description ?? '');
    setProblem(sheet.businessProblem ?? '');
    setBenefits(sheet.businessBenefits ?? '');
    const kpis = sheet.businessSuccessKpis?.filter(Boolean) ?? [];
    setKpiLines(kpis.length ? kpis : ['']);
    setSwS(linesForForm(sheet.swotStrengths));
    setSwW(linesForForm(sheet.swotWeaknesses));
    setSwO(linesForForm(sheet.swotOpportunities));
    setSwT(linesForForm(sheet.swotThreats));
    const t = sheet.towsActions;
    setTSO(linesForForm(t?.SO));
    setTST(linesForForm(t?.ST));
    setTWO(linesForForm(t?.WO));
    setTWT(linesForForm(t?.WT));
  }, [sheet]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!sheet) throw new Error('Fiche indisponible');
      const payload: UpdateProjectSheetPayload = {};
      payload.name = projectName.trim() || sheet.name;
      payload.cadreLocation = cadreWhere.trim() ? cadreWhere.trim() : null;
      payload.cadreQui = cadreWho.trim() ? cadreWho.trim() : null;
      payload.startDate = cadreStart.trim() ? cadreStart : null;
      payload.targetEndDate = cadreEnd.trim() ? cadreEnd : null;
      payload.description = description.trim();
      const nBv = numOrUndef(bv);
      const nSa = numOrUndef(sa);
      const nUs = numOrUndef(us);
      const nCost = numOrUndef(cost);
      const nGain = numOrUndef(gain);
      if (nBv !== undefined) payload.businessValueScore = nBv;
      if (nSa !== undefined) payload.strategicAlignment = nSa;
      if (nUs !== undefined) payload.urgencyScore = nUs;
      if (nCost !== undefined) payload.estimatedCost = nCost;
      if (nGain !== undefined) payload.estimatedGain = nGain;
      if (risk && risk !== RISK_UNSET) {
        payload.riskLevel = risk as ProjectSheetRiskLevel;
      }
      if (problem.trim()) payload.businessProblem = problem.trim();
      if (benefits.trim()) payload.businessBenefits = benefits.trim();
      payload.businessSuccessKpis = kpiLines.map((s) => s.trim()).filter(Boolean);
      payload.swotStrengths = trimLinesToPayload(swS);
      payload.swotWeaknesses = trimLinesToPayload(swW);
      payload.swotOpportunities = trimLinesToPayload(swO);
      payload.swotThreats = trimLinesToPayload(swT);
      payload.towsActions = {
        SO: trimLinesToPayload(tSO),
        ST: trimLinesToPayload(tST),
        WO: trimLinesToPayload(tWO),
        WT: trimLinesToPayload(tWT),
      };
      return updateProjectSheet(authFetch, projectId, payload);
    },
    onSuccess: () => {
      toast.success('Fiche mise à jour');
      void queryClient.invalidateQueries({
        queryKey: projectQueryKeys.sheet(clientId, projectId),
      });
      void queryClient.invalidateQueries({
        queryKey: projectQueryKeys.detail(clientId, projectId),
      });
    },
    onError: (e: Error) => {
      toast.error(e.message || 'Erreur enregistrement');
    },
  });

  const arbitrationMutation = useMutation({
    mutationFn: (status: ProjectArbitrationStatus) =>
      postProjectArbitration(authFetch, projectId, status),
    onSuccess: () => {
      toast.success('Statut d’arbitrage mis à jour');
      void queryClient.invalidateQueries({
        queryKey: projectQueryKeys.sheet(clientId, projectId),
      });
      void queryClient.invalidateQueries({
        queryKey: projectQueryKeys.detail(clientId, projectId),
      });
    },
    onError: (e: Error) => {
      toast.error(e.message || 'Erreur arbitrage');
    },
  });

  const risksQuery = useProjectRisksQuery(projectId);
  const [newRiskTitle, setNewRiskTitle] = useState('');
  const [newRiskProb, setNewRiskProb] = useState<ProjectSheetRiskLevel>('MEDIUM');
  const [newRiskImpact, setNewRiskImpact] = useState<ProjectSheetRiskLevel>('MEDIUM');
  const [deletingRiskId, setDeletingRiskId] = useState<string | null>(null);

  const createRiskMutation = useMutation({
    mutationFn: (vars: {
      title: string;
      probability: ProjectSheetRiskLevel;
      impact: ProjectSheetRiskLevel;
    }) =>
      createProjectRisk(authFetch, projectId, {
        title: vars.title.trim(),
        probability: vars.probability,
        impact: vars.impact,
      }),
    onSuccess: () => {
      toast.success('Risque enregistré');
      setNewRiskTitle('');
      setNewRiskProb('MEDIUM');
      setNewRiskImpact('MEDIUM');
      void queryClient.invalidateQueries({
        queryKey: projectQueryKeys.risks(clientId, projectId),
      });
      void queryClient.invalidateQueries({
        queryKey: projectQueryKeys.detail(clientId, projectId),
      });
    },
    onError: (e: Error) => {
      toast.error(e.message || 'Erreur création risque');
    },
  });

  const deleteRiskMutation = useMutation({
    mutationFn: (riskId: string) => deleteProjectRisk(authFetch, projectId, riskId),
    onMutate: (riskId) => setDeletingRiskId(riskId),
    onSettled: () => setDeletingRiskId(null),
    onSuccess: () => {
      toast.success('Risque supprimé');
      void queryClient.invalidateQueries({
        queryKey: projectQueryKeys.risks(clientId, projectId),
      });
      void queryClient.invalidateQueries({
        queryKey: projectQueryKeys.detail(clientId, projectId),
      });
    },
    onError: (e: Error) => {
      toast.error(e.message || 'Erreur suppression');
    },
  });

  if (!projectId) {
    return (
      <p className="text-sm text-destructive">Identifiant de projet manquant.</p>
    );
  }

  if (isLoading) {
    return <LoadingState rows={6} />;
  }

  if (error || !sheet) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        Fiche introuvable ou accès refusé.
      </div>
    );
  }

  const fmt = (n: number | null) =>
    n == null ? '—' : new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(n);

  const fmtRoi = (n: number | null) =>
    n == null
      ? '—'
      : new Intl.NumberFormat('fr-FR', { style: 'percent', maximumFractionDigits: 1 }).format(n);

  const decision = cockpitDecision(sheet);
  const missingCritical = cockpitMissingLines(sheet);
  const costOrGainMissing =
    sheet.estimatedCost == null || sheet.estimatedGain == null;
  const roiHint = costOrGainMissing
    ? 'ROI non calculable (coût ou gain manquant)'
    : sheet.roi == null
      ? 'ROI non calculable (coût nul ou données insuffisantes)'
      : null;

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <Link
            href={projectsList()}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
            Portefeuille
          </Link>
          <span className="text-muted-foreground">·</span>
          <Link
            href={projectDetail(projectId)}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
            Projet
          </Link>
        </div>
        <PageHeader
          title={`Fiche projet : ${projectName || sheet.name}`}
          description="Cadrage projet"
        />
      </div>

      {/* A — Résumé + synthèse décisionnelle + arbitrage CODIR */}
      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">A. Résumé projet & synthèse décisionnelle</CardTitle>
          <p className="text-xs text-muted-foreground">
            Lecture cockpit — décision en 2 minutes
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <span className="text-muted-foreground">Code : </span>
              {sheet.code}
            </div>
            <div>
              <span className="text-muted-foreground">Type : </span>
              {PROJECT_TYPE_LABEL[sheet.type] ?? sheet.type}
            </div>
            <div>
              <span className="text-muted-foreground">Nature : </span>
              {PROJECT_KIND_LABEL[sheet.kind] ?? sheet.kind}
            </div>
            <div>
              <span className="text-muted-foreground">Statut : </span>
              {PROJECT_STATUS_LABEL[sheet.status] ?? sheet.status}
            </div>
          </div>

          <div className="border-t border-border pt-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border border-border/80 bg-muted/20 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  1. ROI
                </p>
                <p className="mt-2 flex items-center gap-1.5 text-2xl font-semibold tabular-nums">
                  {fmtRoi(sheet.roi)}
                  {roiHint ? (
                    <span className="inline-flex" title={roiHint}>
                      <Info className="size-4 text-muted-foreground" aria-hidden />
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {sheet.roi != null
                    ? '(Gain − coût) / coût — calcul serveur'
                    : roiHint ?? ''}
                </p>
              </div>
              <div className="rounded-lg border border-border/80 bg-muted/20 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  2. Priorité décisionnelle
                </p>
                <p className="mt-2 text-2xl font-semibold tabular-nums">{fmt(sheet.priorityScore)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Priorité réf. :{' '}
                  <span className="font-medium text-foreground">
                    {PROJECT_PRIORITY_LABEL[sheet.priority] ?? sheet.priority}
                  </span>
                </p>
              </div>
              <div className="rounded-lg border border-border/80 bg-muted/20 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  3. Critères valeur
                </p>
                <div className="mt-2 space-y-1.5 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Valeur</span>
                    <span className="font-medium tabular-nums">{scoreOutOf5(sheet.businessValueScore)}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Alignement</span>
                    <span className="font-medium tabular-nums">{scoreOutOf5(sheet.strategicAlignment)}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Urgence</span>
                    <span className="font-medium tabular-nums">{scoreOutOf5(sheet.urgencyScore)}</span>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-border/80 bg-muted/20 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  4. Recommandation
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge className={decision.badgeClassName}>{decision.badge}</Badge>
                </div>
                <p className="mt-2 text-xs leading-snug text-muted-foreground">{decision.message}</p>
              </div>
            </div>
          </div>

          {missingCritical.length > 0 ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm">
              <p className="font-medium text-amber-900 dark:text-amber-200">
                Fiche incomplète :
              </p>
              <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground">
                {missingCritical.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="border-t border-border pt-6">
            <p className="mb-3 text-sm font-medium">Arbitrage CODIR</p>
            <div className="mb-4 text-sm text-muted-foreground">
              Priorité projet (réf.) :{' '}
              <span className="font-medium text-foreground">
                {PROJECT_PRIORITY_LABEL[sheet.priority] ?? sheet.priority}
              </span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="arb">Statut d’arbitrage</Label>
              <Select
                value={arbDraft}
                onValueChange={(v) => setArbDraft(v as ProjectArbitrationStatus)}
                disabled={!canEdit}
              >
                <SelectTrigger id="arb">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ARBITRATION_LABEL) as ProjectArbitrationStatus[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {ARBITRATION_LABEL[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {canEdit ? (
              <Button
                type="button"
                className="mt-3"
                variant="secondary"
                disabled={arbitrationMutation.isPending}
                onClick={() => arbitrationMutation.mutate(arbDraft)}
              >
                {arbitrationMutation.isPending ? 'Application…' : 'Appliquer le statut'}
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* B — Cadrage OQQCQPC */}
      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">B. Cadrage projet (OQQCQPC)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cadre-quoi">Quoi</Label>
              <Input
                id="cadre-quoi"
                disabled={!canEdit}
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Nom du projet"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cadre-qui">Qui</Label>
              <Input
                id="cadre-qui"
                disabled={!canEdit}
                value={cadreWho}
                onChange={(e) => setCadreWho(e.target.value)}
                placeholder="Ex : responsable métier, sponsor…"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cadre-ou">Où</Label>
              <Input
                id="cadre-ou"
                disabled={!canEdit}
                value={cadreWhere}
                onChange={(e) => setCadreWhere(e.target.value)}
                placeholder="Périmètre, site, région…"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Quand</Label>
              <div className="flex flex-wrap gap-2">
                <Input
                  type="date"
                  disabled={!canEdit}
                  className="min-w-0 flex-1"
                  value={cadreStart}
                  onChange={(e) => setCadreStart(e.target.value)}
                  aria-label="Date de début"
                />
                <Input
                  type="date"
                  disabled={!canEdit}
                  className="min-w-0 flex-1"
                  value={cadreEnd}
                  onChange={(e) => setCadreEnd(e.target.value)}
                  aria-label="Date de fin cible"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cadre-pourquoi">Pourquoi</Label>
              <textarea
                id="cadre-pourquoi"
                className={cn(textareaClass, 'min-h-[56px]')}
                disabled={!canEdit}
                rows={2}
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                placeholder="Ex : réduire les coûts IT"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cadre-combien">Combien (€)</Label>
              <Input
                id="cadre-combien"
                type="number"
                min={0}
                step="0.01"
                disabled={!canEdit}
                value={cost}
                onChange={(e) => setCost(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="cadre-comment">Comment</Label>
              <textarea
                id="cadre-comment"
                className={cn(textareaClass, 'min-h-[72px]')}
                disabled={!canEdit}
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex : migration progressive, phase pilote…"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* C — Valeur métier */}
      <Card size="sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <LayoutDashboard className="size-4" />
            C. Valeur métier
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project-desc">Description du projet</Label>
            <textarea
              id="project-desc"
              className={textareaClass}
              disabled={!canEdit}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Synthèse du projet pour la décision…"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="bv">Valeur métier (1–5)</Label>
              <Input
                id="bv"
                type="number"
                min={1}
                max={5}
                disabled={!canEdit}
                value={bv}
                onChange={(e) => setBv(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sa">Alignement stratégique (1–5)</Label>
              <Input
                id="sa"
                type="number"
                min={1}
                max={5}
                disabled={!canEdit}
                value={sa}
                onChange={(e) => setSa(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="us">Urgence (1–5)</Label>
              <Input
                id="us"
                type="number"
                min={1}
                max={5}
                disabled={!canEdit}
                value={us}
                onChange={(e) => setUs(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="prob">Objectif métier</Label>
            <textarea
              id="prob"
              className={textareaClass}
              disabled={!canEdit}
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ben">Impact attendu</Label>
            <textarea
              id="ben"
              className={textareaClass}
              disabled={!canEdit}
              value={benefits}
              onChange={(e) => setBenefits(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label>KPI de succès</Label>
              {canEdit ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => setKpiLines((prev) => [...prev, ''])}
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Ajouter une ligne
                </Button>
              ) : null}
            </div>
            <div className="space-y-2">
              {kpiLines.map((line, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    id={i === 0 ? 'kpi-0' : undefined}
                    className="min-w-0 flex-1"
                    disabled={!canEdit}
                    placeholder={`Indicateur ${i + 1}`}
                    value={line}
                    onChange={(e) =>
                      setKpiLines((prev) => {
                        const next = [...prev];
                        next[i] = e.target.value;
                        return next;
                      })
                    }
                  />
                  {canEdit && kpiLines.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      aria-label={`Supprimer la ligne ${i + 1}`}
                      onClick={() =>
                        setKpiLines((prev) => {
                          const next = prev.filter((_, j) => j !== i);
                          return next.length ? next : [''];
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* D — Financier */}
      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">D. Arbitrage financier</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm">
            <span className="text-muted-foreground">Budget cible (réf.) : </span>
            <span className="font-medium tabular-nums text-foreground">
              {fmtEuro(sheet.targetBudgetAmount)}
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cost">Coût estimé (fiche)</Label>
              <Input
                id="cost"
                type="number"
                min={0}
                step="0.01"
                disabled={!canEdit}
                value={cost}
                onChange={(e) => setCost(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gain">Gain estimé</Label>
              <Input
                id="gain"
                type="number"
                min={0}
                step="0.01"
                disabled={!canEdit}
                value={gain}
                onChange={(e) => setGain(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* E — Risque */}
      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">E. Risque, priorité et risques projet</CardTitle>
          <p className="text-xs text-muted-foreground">
            Synthèse fiche (agrégée) · risques métier saisis sur ce projet
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Synthèse fiche (calcul serveur)
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-muted-foreground">Niveau de risque</span>
              {sheet.riskLevel ? (
                <Badge
                  variant="outline"
                  className={cn(
                    sheet.riskLevel === 'LOW' && 'border-emerald-500/50 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
                    sheet.riskLevel === 'MEDIUM' &&
                      'border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200',
                    sheet.riskLevel === 'HIGH' &&
                      'border-red-500/50 bg-red-500/10 text-red-800 dark:text-red-300',
                  )}
                >
                  {RISK_LABEL[sheet.riskLevel]}
                </Badge>
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              )}
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Score de priorité (calculé) : </span>
              <span className="font-medium tabular-nums text-foreground">
                {sheet.priorityScore != null ? fmt(sheet.priorityScore) : '—'}
              </span>
            </div>
            <div className="space-y-2">
              <Label>Modifier le niveau de risque</Label>
              <Select
                value={risk}
                onValueChange={(v) => setRisk(v ?? RISK_UNSET)}
                disabled={!canEdit}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={RISK_UNSET}>—</SelectItem>
                  {(Object.keys(RISK_LABEL) as ProjectSheetRiskLevel[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {RISK_LABEL[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t border-border pt-6">
            <div className="mb-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Risques identifiés
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Probabilité × impact → criticité (aligné portefeuille)
              </p>
            </div>

            {risksQuery.isLoading ? (
              <LoadingState rows={2} />
            ) : !risksQuery.data?.length ? (
              <p className="text-sm text-muted-foreground">Aucun risque — ajoutez-en ci-dessous.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border/60">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Titre</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Criticité</TableHead>
                      <TableHead>P / I</TableHead>
                      {canEdit ? <TableHead className="w-[52px] text-right" /> : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {risksQuery.data.map((r) => {
                      const crit = riskCriticalityForRisk(r);
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="max-w-[220px] font-medium">{r.title}</TableCell>
                          <TableCell className="text-sm">
                            {RISK_STATUS_LABEL[r.status] ?? r.status}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                crit === 'LOW' &&
                                  'border-emerald-500/50 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
                                crit === 'MEDIUM' &&
                                  'border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200',
                                crit === 'HIGH' &&
                                  'border-red-500/50 bg-red-500/10 text-red-800 dark:text-red-300',
                              )}
                            >
                              {riskTierFr(crit)}
                            </Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                            {riskTierFr(r.probability)} / {riskTierFr(r.impact)}
                          </TableCell>
                          {canEdit ? (
                            <TableCell className="text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                disabled={
                                  deleteRiskMutation.isPending && deletingRiskId === r.id
                                }
                                aria-label={`Supprimer le risque ${r.title}`}
                                onClick={() => deleteRiskMutation.mutate(r.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          ) : null}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="mt-4 space-y-3">
              <p className="text-xs font-medium text-muted-foreground">Ajouter un risque</p>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                <div className="min-w-0 flex-1 space-y-2">
                  <Label htmlFor="new-risk-title">Titre</Label>
                  <Input
                    id="new-risk-title"
                    value={newRiskTitle}
                    onChange={(e) => setNewRiskTitle(e.target.value)}
                    disabled={!canEdit || createRiskMutation.isPending}
                    placeholder="ex. Dépendance fournisseur unique"
                    maxLength={500}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 sm:w-auto sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Probabilité</Label>
                    <Select
                      value={newRiskProb}
                      onValueChange={(v) => setNewRiskProb(v as ProjectSheetRiskLevel)}
                      disabled={!canEdit || createRiskMutation.isPending}
                    >
                      <SelectTrigger className="w-full min-w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(RISK_LABEL) as ProjectSheetRiskLevel[]).map((k) => (
                          <SelectItem key={k} value={k}>
                            {RISK_LABEL[k]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Impact</Label>
                    <Select
                      value={newRiskImpact}
                      onValueChange={(v) => setNewRiskImpact(v as ProjectSheetRiskLevel)}
                      disabled={!canEdit || createRiskMutation.isPending}
                    >
                      <SelectTrigger className="w-full min-w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(RISK_LABEL) as ProjectSheetRiskLevel[]).map((k) => (
                          <SelectItem key={k} value={k}>
                            {RISK_LABEL[k]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  type="button"
                  disabled={
                    !canEdit || createRiskMutation.isPending || !newRiskTitle.trim()
                  }
                  onClick={() => {
                    if (!newRiskTitle.trim()) {
                      toast.error('Titre requis');
                      return;
                    }
                    createRiskMutation.mutate({
                      title: newRiskTitle,
                      probability: newRiskProb,
                      impact: newRiskImpact,
                    });
                  }}
                >
                  {createRiskMutation.isPending ? 'Enregistrement…' : 'Ajouter'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* F — SWOT (matrice classique 2×2) */}
      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">F. Analyse stratégique (SWOT)</CardTitle>
          <p className="text-xs text-muted-foreground">
            Matrice : interne / externe × favorable / défavorable — lignes libres par quadrant
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="hidden text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground sm:grid sm:grid-cols-2 sm:gap-3">
            <span className="rounded-md bg-muted/50 py-1.5">Favorable</span>
            <span className="rounded-md bg-muted/50 py-1.5">Défavorable</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-0 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.07] p-4 shadow-sm dark:bg-emerald-500/10">
              <div className="mb-3 flex flex-wrap items-baseline gap-2 border-b border-emerald-500/20 pb-2">
                <span className="text-lg font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                  S
                </span>
                <span className="font-semibold text-foreground">Forces</span>
                <span className="text-xs text-muted-foreground">Interne</span>
              </div>
              <Label className="sr-only">Forces — points</Label>
              <DynamicLinesField
                lines={swS}
                onLinesChange={setSwS}
                canEdit={canEdit}
                placeholder={(i) => `Atout ${i + 1}`}
                inputClassName="border-emerald-500/20 bg-background/80"
              />
            </div>

            <div className="space-y-0 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] p-4 shadow-sm dark:bg-amber-500/10">
              <div className="mb-3 flex flex-wrap items-baseline gap-2 border-b border-amber-500/20 pb-2">
                <span className="text-lg font-bold tabular-nums text-amber-800 dark:text-amber-400">
                  W
                </span>
                <span className="font-semibold text-foreground">Faiblesses</span>
                <span className="text-xs text-muted-foreground">Interne</span>
              </div>
              <Label className="sr-only">Faiblesses — points</Label>
              <DynamicLinesField
                lines={swW}
                onLinesChange={setSwW}
                canEdit={canEdit}
                placeholder={(i) => `Limite ${i + 1}`}
                inputClassName="border-amber-500/20 bg-background/80"
              />
            </div>

            <div className="space-y-0 rounded-xl border border-sky-500/25 bg-sky-500/[0.07] p-4 shadow-sm dark:bg-sky-500/10">
              <div className="mb-3 flex flex-wrap items-baseline gap-2 border-b border-sky-500/20 pb-2">
                <span className="text-lg font-bold tabular-nums text-sky-800 dark:text-sky-400">
                  O
                </span>
                <span className="font-semibold text-foreground">Opportunités</span>
                <span className="text-xs text-muted-foreground">Externe</span>
              </div>
              <Label className="sr-only">Opportunités — points</Label>
              <DynamicLinesField
                lines={swO}
                onLinesChange={setSwO}
                canEdit={canEdit}
                placeholder={(i) => `Opportunité ${i + 1}`}
                inputClassName="border-sky-500/20 bg-background/80"
              />
            </div>

            <div className="space-y-0 rounded-xl border border-rose-500/25 bg-rose-500/[0.07] p-4 shadow-sm dark:bg-rose-500/10">
              <div className="mb-3 flex flex-wrap items-baseline gap-2 border-b border-rose-500/20 pb-2">
                <span className="text-lg font-bold tabular-nums text-rose-800 dark:text-rose-400">
                  T
                </span>
                <span className="font-semibold text-foreground">Menaces</span>
                <span className="text-xs text-muted-foreground">Externe</span>
              </div>
              <Label className="sr-only">Menaces — points</Label>
              <DynamicLinesField
                lines={swT}
                onLinesChange={setSwT}
                canEdit={canEdit}
                placeholder={(i) => `Menace ${i + 1}`}
                inputClassName="border-rose-500/20 bg-background/80"
              />
            </div>
          </div>

          <p className="text-center text-[11px] text-muted-foreground sm:hidden">
            Ligne du haut : interne · ligne du bas : externe
          </p>
        </CardContent>
      </Card>

      {/* G — TOWS (matrice S×O / S×T / W×O / W×T) */}
      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">G. Décisions recommandées (TOWS)</CardTitle>
          <p className="text-xs text-muted-foreground">
            Croisement forces-faiblesses (lignes) × opportunités-menaces (colonnes) — stratégies par quadrant,
            lignes libres
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="hidden text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground sm:grid sm:grid-cols-2 sm:gap-3">
            <span className="rounded-md bg-muted/50 py-1.5">Opportunités (O)</span>
            <span className="rounded-md bg-muted/50 py-1.5">Menaces (T)</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {/* Ligne S — SO | ST */}
            <div className="space-y-0 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.07] p-4 shadow-sm dark:bg-emerald-500/10">
              <div className="mb-3 flex flex-wrap items-baseline gap-2 border-b border-emerald-500/25 pb-2">
                <span className="text-lg font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                  SO
                </span>
                <span className="font-semibold text-foreground">Accélérer</span>
                <span className="text-xs text-muted-foreground">S × O · offensif</span>
              </div>
              <Label className="sr-only">SO — actions</Label>
              <DynamicLinesField
                lines={tSO}
                onLinesChange={setTSO}
                canEdit={canEdit}
                placeholder={(i) => `Action ${i + 1}`}
                inputClassName="border-emerald-500/20 bg-background/80"
              />
            </div>

            <div className="space-y-0 rounded-xl border border-amber-500/30 bg-amber-500/[0.07] p-4 shadow-sm dark:bg-amber-500/10">
              <div className="mb-3 flex flex-wrap items-baseline gap-2 border-b border-amber-500/25 pb-2">
                <span className="text-lg font-bold tabular-nums text-amber-800 dark:text-amber-400">
                  ST
                </span>
                <span className="font-semibold text-foreground">Sécuriser</span>
                <span className="text-xs text-muted-foreground">S × T · diversifier / réduire l’exposition</span>
              </div>
              <Label className="sr-only">ST — actions</Label>
              <DynamicLinesField
                lines={tST}
                onLinesChange={setTST}
                canEdit={canEdit}
                placeholder={(i) => `Action ${i + 1}`}
                inputClassName="border-amber-500/20 bg-background/80"
              />
            </div>

            {/* Ligne W — WO | WT */}
            <div className="space-y-0 rounded-xl border border-sky-500/30 bg-sky-500/[0.07] p-4 shadow-sm dark:bg-sky-500/10">
              <div className="mb-3 flex flex-wrap items-baseline gap-2 border-b border-sky-500/25 pb-2">
                <span className="text-lg font-bold tabular-nums text-sky-800 dark:text-sky-400">
                  WO
                </span>
                <span className="font-semibold text-foreground">Corriger</span>
                <span className="text-xs text-muted-foreground">W × O · renforcer / pivoter</span>
              </div>
              <Label className="sr-only">WO — actions</Label>
              <DynamicLinesField
                lines={tWO}
                onLinesChange={setTWO}
                canEdit={canEdit}
                placeholder={(i) => `Action ${i + 1}`}
                inputClassName="border-sky-500/20 bg-background/80"
              />
            </div>

            <div className="space-y-0 rounded-xl border border-rose-500/30 bg-rose-500/[0.07] p-4 shadow-sm dark:bg-rose-500/10">
              <div className="mb-3 flex flex-wrap items-baseline gap-2 border-b border-rose-500/25 pb-2">
                <span className="text-lg font-bold tabular-nums text-rose-800 dark:text-rose-400">
                  WT
                </span>
                <span className="font-semibold text-foreground">Réduire / stopper</span>
                <span className="text-xs text-muted-foreground">W × T · défensif</span>
              </div>
              <Label className="sr-only">WT — actions</Label>
              <DynamicLinesField
                lines={tWT}
                onLinesChange={setTWT}
                canEdit={canEdit}
                placeholder={(i) => `Action ${i + 1}`}
                inputClassName="border-rose-500/20 bg-background/80"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center text-[11px] text-muted-foreground sm:justify-between">
            <span className="sm:hidden">Haut : ligne S (forces) · bas : ligne W (faiblesses)</span>
            <span className="hidden sm:inline">Ligne du haut : stratégies à partir des forces · ligne du bas : à partir des faiblesses</span>
          </div>
        </CardContent>
      </Card>

      {canEdit && (
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? 'Enregistrement…' : 'Enregistrer la fiche'}
          </Button>
        </div>
      )}
    </div>
  );
}
