'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChevronLeft, LayoutDashboard, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  postProjectArbitration,
  updateProjectSheet,
} from '../api/projects.api';
import { projectDetail, projectsList } from '../constants/project-routes';
import {
  PROJECT_KIND_LABEL,
  PROJECT_PRIORITY_LABEL,
  PROJECT_STATUS_LABEL,
  PROJECT_TYPE_LABEL,
} from '../constants/project-enum-labels';
import { projectQueryKeys } from '../lib/project-query-keys';
import { useProjectSheetQuery } from '../hooks/use-project-sheet-query';
import type {
  ProjectArbitrationStatus,
  ProjectSheetRiskLevel,
  TowsActionsPayload,
  UpdateProjectSheetPayload,
} from '../types/project.types';

const RISK_LABEL: Record<ProjectSheetRiskLevel, string> = {
  LOW: 'Faible',
  MEDIUM: 'Moyen',
  HIGH: 'Élevé',
};

const ARBITRATION_LABEL: Record<ProjectArbitrationStatus, string> = {
  DRAFT: 'Brouillon',
  TO_REVIEW: 'À revue CODIR',
  VALIDATED: 'Validé',
  REJECTED: 'Refusé',
};

/** Texte court pour le bloc « recommandation » (statut arbitrage enregistré) */
const ARBITRATION_RECOMMENDATION: Record<ProjectArbitrationStatus, string> = {
  DRAFT: 'Compléter la fiche et les critères avant arbitrage.',
  TO_REVIEW: 'Soumettre à la CODIR pour décision.',
  VALIDATED: 'Décision favorable — lancer ou poursuivre selon le plan.',
  REJECTED: 'Décision défavorable — ne pas engager les moyens prévus.',
};

/** Valeur Select stable (évite uncontrolled → controlled si `undefined` au 1er rendu) */
const RISK_UNSET = '__unset__';

function pad3(arr: string[]): [string, string, string] {
  const a = [...arr];
  while (a.length < 3) a.push('');
  return [(a[0] ?? '').slice(0, 2000), (a[1] ?? '').slice(0, 2000), (a[2] ?? '').slice(0, 2000)];
}

function from3(s0: string, s1: string, s2: string): string[] | undefined {
  const o = [s0, s1, s2].map((x) => x.trim()).filter(Boolean);
  return o.length ? o.slice(0, 3) : undefined;
}

function pad2(arr: string[]): [string, string] {
  const a = [...arr];
  while (a.length < 2) a.push('');
  return [(a[0] ?? '').slice(0, 2000), (a[1] ?? '').slice(0, 2000)];
}

function from2(s0: string, s1: string): string[] | undefined {
  const o = [s0, s1].map((x) => x.trim()).filter(Boolean);
  return o.length ? o.slice(0, 2) : undefined;
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

  const [swS, setSwS] = useState(['', '', '']);
  const [swW, setSwW] = useState(['', '', '']);
  const [swO, setSwO] = useState(['', '', '']);
  const [swT, setSwT] = useState(['', '', '']);

  const [tSO, setTSO] = useState(['', '']);
  const [tST, setTST] = useState(['', '']);
  const [tWO, setTWO] = useState(['', '']);
  const [tWT, setTWT] = useState(['', '']);

  useEffect(() => {
    if (!sheet) return;
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
    setSwS(pad3(sheet.swotStrengths ?? []));
    setSwW(pad3(sheet.swotWeaknesses ?? []));
    setSwO(pad3(sheet.swotOpportunities ?? []));
    setSwT(pad3(sheet.swotThreats ?? []));
    const t = sheet.towsActions;
    setTSO(pad2(t?.SO ?? []));
    setTST(pad2(t?.ST ?? []));
    setTWO(pad2(t?.WO ?? []));
    setTWT(pad2(t?.WT ?? []));
  }, [sheet]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: UpdateProjectSheetPayload = {};
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
      const aS = from3(swS[0], swS[1], swS[2]);
      const aW = from3(swW[0], swW[1], swW[2]);
      const aO = from3(swO[0], swO[1], swO[2]);
      const aT = from3(swT[0], swT[1], swT[2]);
      if (aS) payload.swotStrengths = aS;
      if (aW) payload.swotWeaknesses = aW;
      if (aO) payload.swotOpportunities = aO;
      if (aT) payload.swotThreats = aT;
      const tows: TowsActionsPayload = {};
      const so = from2(tSO[0], tSO[1]);
      const st = from2(tST[0], tST[1]);
      const wo = from2(tWO[0], tWO[1]);
      const wt = from2(tWT[0], tWT[1]);
      if (so) tows.SO = so;
      if (st) tows.ST = st;
      if (wo) tows.WO = wo;
      if (wt) tows.WT = wt;
      if (Object.keys(tows).length > 0) payload.towsActions = tows;
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
          title={sheet.name}
          description="Fiche projet — décision CODIR (vue synthétique)"
        />
      </div>

      {/* A — Résumé + synthèse (un seul cadre) */}
      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">A. Résumé projet & synthèse décisionnelle</CardTitle>
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
                <p className="mt-2 text-2xl font-semibold tabular-nums">{fmtRoi(sheet.roi)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  (Gain − coût) / coût — calcul serveur
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
                  3. Objectif métier
                </p>
                <div className="mt-2 space-y-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Valeur</span>
                    <span className="font-medium tabular-nums">
                      {sheet.businessValueScore ?? '—'}
                      <span className="text-muted-foreground"> /5</span>
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Alignement</span>
                    <span className="font-medium tabular-nums">
                      {sheet.strategicAlignment ?? '—'}
                      <span className="text-muted-foreground"> /5</span>
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Urgence</span>
                    <span className="font-medium tabular-nums">
                      {sheet.urgencyScore ?? '—'}
                      <span className="text-muted-foreground"> /5</span>
                    </span>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-border/80 bg-muted/20 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  4. Recommandation
                </p>
                <p className="mt-2 text-sm font-semibold leading-snug">
                  {ARBITRATION_LABEL[arbDraft]}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {ARBITRATION_RECOMMENDATION[arbDraft]}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* B — Valeur métier */}
      <Card size="sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <LayoutDashboard className="size-4" />
            B. Valeur métier
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
            <Label htmlFor="prob">Problème à résoudre</Label>
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
            <Label htmlFor="ben">Bénéfices attendus</Label>
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

      {/* C — Financier */}
      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">C. Arbitrage financier</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Budget cible (réf.) :{' '}
            <span className="font-medium text-foreground">{fmt(sheet.targetBudgetAmount)}</span>
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

      {/* D — Risque */}
      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">D. Risque et priorité (calcul serveur)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Niveau de risque</Label>
            <Select
              value={risk}
              onValueChange={setRisk}
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
        </CardContent>
      </Card>

      {/* E — Arbitrage */}
      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">E. Arbitrage CODIR</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm">
            Priorité projet (réf.) :{' '}
            {PROJECT_PRIORITY_LABEL[sheet.priority] ?? sheet.priority}
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
          {canEdit && (
            <Button
              type="button"
              variant="secondary"
              disabled={arbitrationMutation.isPending}
              onClick={() => arbitrationMutation.mutate(arbDraft)}
            >
              {arbitrationMutation.isPending ? 'Application…' : 'Appliquer le statut'}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* F — SWOT (matrice classique 2×2) */}
      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">F. Analyse stratégique (SWOT)</CardTitle>
          <p className="text-xs text-muted-foreground">
            Matrice : interne / externe × favorable / défavorable — max. 3 points par quadrant
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
              <div className="space-y-2">
                <Label className="sr-only">Forces — points</Label>
                {[0, 1, 2].map((i) => (
                  <Input
                    key={i}
                    disabled={!canEdit}
                    className="border-emerald-500/20 bg-background/80"
                    value={swS[i]}
                    onChange={(e) => {
                      const next = [...swS] as [string, string, string];
                      next[i] = e.target.value;
                      setSwS(next);
                    }}
                    placeholder={`Atout ${i + 1}`}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-0 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] p-4 shadow-sm dark:bg-amber-500/10">
              <div className="mb-3 flex flex-wrap items-baseline gap-2 border-b border-amber-500/20 pb-2">
                <span className="text-lg font-bold tabular-nums text-amber-800 dark:text-amber-400">
                  W
                </span>
                <span className="font-semibold text-foreground">Faiblesses</span>
                <span className="text-xs text-muted-foreground">Interne</span>
              </div>
              <div className="space-y-2">
                <Label className="sr-only">Faiblesses — points</Label>
                {[0, 1, 2].map((i) => (
                  <Input
                    key={i}
                    disabled={!canEdit}
                    className="border-amber-500/20 bg-background/80"
                    value={swW[i]}
                    onChange={(e) => {
                      const next = [...swW] as [string, string, string];
                      next[i] = e.target.value;
                      setSwW(next);
                    }}
                    placeholder={`Limite ${i + 1}`}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-0 rounded-xl border border-sky-500/25 bg-sky-500/[0.07] p-4 shadow-sm dark:bg-sky-500/10">
              <div className="mb-3 flex flex-wrap items-baseline gap-2 border-b border-sky-500/20 pb-2">
                <span className="text-lg font-bold tabular-nums text-sky-800 dark:text-sky-400">
                  O
                </span>
                <span className="font-semibold text-foreground">Opportunités</span>
                <span className="text-xs text-muted-foreground">Externe</span>
              </div>
              <div className="space-y-2">
                <Label className="sr-only">Opportunités — points</Label>
                {[0, 1, 2].map((i) => (
                  <Input
                    key={i}
                    disabled={!canEdit}
                    className="border-sky-500/20 bg-background/80"
                    value={swO[i]}
                    onChange={(e) => {
                      const next = [...swO] as [string, string, string];
                      next[i] = e.target.value;
                      setSwO(next);
                    }}
                    placeholder={`Opportunité ${i + 1}`}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-0 rounded-xl border border-rose-500/25 bg-rose-500/[0.07] p-4 shadow-sm dark:bg-rose-500/10">
              <div className="mb-3 flex flex-wrap items-baseline gap-2 border-b border-rose-500/20 pb-2">
                <span className="text-lg font-bold tabular-nums text-rose-800 dark:text-rose-400">
                  T
                </span>
                <span className="font-semibold text-foreground">Menaces</span>
                <span className="text-xs text-muted-foreground">Externe</span>
              </div>
              <div className="space-y-2">
                <Label className="sr-only">Menaces — points</Label>
                {[0, 1, 2].map((i) => (
                  <Input
                    key={i}
                    disabled={!canEdit}
                    className="border-rose-500/20 bg-background/80"
                    value={swT[i]}
                    onChange={(e) => {
                      const next = [...swT] as [string, string, string];
                      next[i] = e.target.value;
                      setSwT(next);
                    }}
                    placeholder={`Menace ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <p className="text-center text-[11px] text-muted-foreground sm:hidden">
            Ligne du haut : interne · ligne du bas : externe
          </p>
        </CardContent>
      </Card>

      {/* G — TOWS */}
      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">G. Décisions recommandées (TOWS)</CardTitle>
          <p className="text-xs text-muted-foreground">
            SO accélérer · ST sécuriser · WO corriger · WT réduire / stopper — max. 2 par quadrant
          </p>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          {(
            [
              ['SO — Accélérer', tSO, setTSO] as const,
              ['ST — Sécuriser', tST, setTST] as const,
              ['WO — Corriger', tWO, setTWO] as const,
              ['WT — Réduire / stopper', tWT, setTWT] as const,
            ] as const
          ).map(([label, vals, setVals]) => (
            <div key={label} className="space-y-2">
              <Label>{label}</Label>
              {[0, 1].map((i) => (
                <Input
                  key={i}
                  disabled={!canEdit}
                  value={vals[i]}
                  onChange={(e) => {
                    const next = [...vals] as [string, string];
                    next[i] = e.target.value;
                    setVals(next);
                  }}
                  placeholder={`Action ${i + 1}`}
                />
              ))}
            </div>
          ))}
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
