'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Briefcase,
  Building2,
  ChevronDown,
  ChevronLeft,
  Info,
  LayoutDashboard,
  Layers3,
  MessagesSquare,
  Pencil,
  Percent,
  Plus,
  Trash2,
  TrendingUp,
  UsersRound,
} from 'lucide-react';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import {
  createProjectRisk,
  deleteProjectRisk,
  updateProjectSheet,
} from '../api/projects.api';
import { projectDetail, projectsList } from '../constants/project-routes';
import {
  MILESTONE_STATUS_LABEL,
  PROJECT_CRITICALITY_LABEL,
  PROJECT_KIND_LABEL,
  PROJECT_PRIORITY_LABEL,
  PROJECT_STATUS_LABEL,
  PROJECT_TYPE_LABEL,
} from '../constants/project-enum-labels';
import { projectQueryKeys } from '../lib/project-query-keys';
import { riskCriticalityForRisk } from '../lib/risk-criticality';
import { ProjectRetroplanMacroDialog } from './project-retroplan-macro-dialog';
import { ProjectTeamMatrix } from './project-team-matrix';
import { computeRoiFromCostGain } from '../lib/project-sheet-priority-preview';
import { useProjectMilestonesQuery } from '../hooks/use-project-milestones-query';
import { useProjectSheetQuery } from '../hooks/use-project-sheet-query';
import { useProjectRisksQuery } from '../hooks/use-project-risks-query';
import type {
  ProjectArbitrationLevelStatus,
  ProjectCopilRecommendation,
  ProjectMilestoneApi,
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

/** Niveaux d’arbitrage — titres des cartes. */
const ARBITRATION_LEVEL_STEPS = [
  {
    title: 'Métier',
    body: 'Cadrage, arbitrage initial et alignement avec la ligne métier.',
  },
  {
    title: 'Comité de projet',
    body: 'Revue collégiale, arbitrage inter-directions avant escalade.',
  },
  {
    title: 'Sponsor / CODIR',
    body: 'Décision de sponsorisation et arbitrage CODIR / direction.',
  },
] as const;

const LEVEL_STATUS_LABEL: Record<ProjectArbitrationLevelStatus, string> = {
  BROUILLON: 'Brouillon',
  EN_COURS: 'En cours',
  SOUMIS_VALIDATION: 'Soumis à validation',
  VALIDE: 'Validé',
  REFUSE: 'Refusé',
};

const LEVEL_STATUS_ORDER: ProjectArbitrationLevelStatus[] = [
  'BROUILLON',
  'EN_COURS',
  'SOUMIS_VALIDATION',
  'VALIDE',
  'REFUSE',
];

/** Carte mise en avant : premier niveau non « Validé », sinon dernier actif. */
function arbitrationFocusStep(
  m: ProjectArbitrationLevelStatus,
  c: ProjectArbitrationLevelStatus | null,
  _d: ProjectArbitrationLevelStatus | null,
): 0 | 1 | 2 {
  if (m !== 'VALIDE') return 0;
  if (c !== 'VALIDE') return 1;
  return 2;
}

/** Carte arbitrage : même langage que les indicateurs (bordure gauche + fond léger selon statut). */
function arbitrationLevelCardClasses(
  status: ProjectArbitrationLevelStatus | null,
  focus: boolean,
): string {
  const ring = focus ? 'ring-2 ring-primary/20' : '';
  if (status == null) {
    return cn(
      'border border-border/80 border-l-[3px] border-l-muted-foreground/30 bg-muted/15 opacity-[0.98]',
      ring,
    );
  }
  switch (status) {
    case 'VALIDE':
      return cn(
        'border border-border/80 border-l-[3px] border-l-emerald-500/70 bg-emerald-500/[0.04] dark:bg-emerald-500/[0.06]',
        ring,
      );
    case 'REFUSE':
      return cn(
        'border border-border/80 border-l-[3px] border-l-red-500/70 bg-red-500/[0.04] dark:bg-red-500/[0.06]',
        ring,
      );
    case 'SOUMIS_VALIDATION':
      return cn(
        'border border-border/80 border-l-[3px] border-l-amber-500/70 bg-amber-500/[0.07] dark:bg-amber-500/[0.09]',
        ring,
      );
    case 'EN_COURS':
      return cn(
        'border border-border/80 border-l-[3px] border-l-blue-500/70 bg-blue-500/[0.04] dark:bg-blue-500/[0.06]',
        ring,
      );
    default:
      return cn(
        'border border-border/80 border-l-[3px] border-l-border/70 bg-muted/15',
        ring,
      );
  }
}

const ARBITRATION_STEP_ICONS = [Briefcase, UsersRound, Building2] as const;
const ARBITRATION_STEP_ICON_BGS = [
  'bg-teal-500/10 text-teal-700 dark:text-teal-400',
  'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400',
  'bg-rose-500/10 text-rose-700 dark:text-rose-400',
] as const;

const COPIL_LABEL: Record<ProjectCopilRecommendation, string> = {
  NOT_SET: 'Non renseigné',
  POURSUIVRE: 'Poursuivre',
  NE_PAS_ENGAGER: 'Ne pas engager',
  SOUS_RESERVE: 'Sous réserve / conditions',
  REPORTER: 'Reporter / ajourner',
  AJUSTER_CADRAGE: 'Ajuster le cadrage / approfondir',
};

/** Valeur Select stable (évite uncontrolled → controlled si `undefined` au 1er rendu) */
const RISK_UNSET = '__unset__';

function scoreOutOf5(n: number | null | undefined): string {
  if (n == null || n === undefined) return '—';
  return `${n} / 5`;
}

/** Critères cockpit — formulaire + repli fiche (objectif métier déjà enregistré). Le gain n’est pas obligatoire (parcours ROE). */
function cockpitMissingLinesFromForm(params: {
  cost: number | undefined;
  bv: number | undefined;
  sa: number | undefined;
  us: number | undefined;
  problemFilled: boolean;
}): string[] {
  const lines: string[] = [];
  if (params.cost === undefined) lines.push('Coût manquant');
  if (params.bv === undefined) lines.push('Valeur (score) manquant');
  if (params.sa === undefined) lines.push('Alignement manquant');
  if (params.us === undefined) lines.push('Urgence manquant');
  if (!params.problemFilled) lines.push('Objectif métier (pourquoi) absent');
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

/** Même logique que l’aperçu / décision : champs formulaire, sinon valeurs fiche déjà enregistrées (évite écran serveur vs calcul local). */
function effectiveNumFromFormOrSheet(
  formStr: string,
  server: number | null | undefined,
): number | undefined {
  const fromForm = numOrUndef(formStr);
  if (fromForm !== undefined) return fromForm;
  if (server == null || server === undefined) return undefined;
  const n = Number(server);
  return Number.isFinite(n) ? n : undefined;
}

function formatMilestoneDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fr-FR');
  } catch {
    return '—';
  }
}

const textareaClass = cn(
  'min-h-[72px] w-full rounded-lg border border-input bg-background px-2.5 py-2 text-sm',
  'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
  'disabled:cursor-not-allowed disabled:opacity-50',
);

/** Délai après la dernière frappe avant envoi API (sauvegarde automatique fiche projet). */
const SHEET_AUTOSAVE_DEBOUNCE_MS = 900;

function formatSavedClock(ts: number): string {
  try {
    return new Date(ts).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '';
  }
}

/** Barre 0–5 pour lecture rapide (tuile ROE). */
function ScoreMiniBar({ value }: { value: number | undefined }) {
  const pct =
    value != null && Number.isFinite(value)
      ? Math.min(100, Math.max(0, (value / 5) * 100))
      : 0;
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-muted/80">
      <div
        className="h-full rounded-full bg-violet-500/75 transition-[width] duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function ProjectSheetView({ projectId }: { projectId: string }) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const queryClient = useQueryClient();
  const { has } = usePermissions();
  const canEdit = has('projects.update');

  const { data: sheet, isLoading, error } = useProjectSheetQuery(projectId);

  const [projectName, setProjectName] = useState('');
  const [priority, setPriority] = useState<string>('MEDIUM');
  const [projectType, setProjectType] = useState<string>('TRANSFORMATION');
  const [projectStatus, setProjectStatus] = useState<string>('DRAFT');
  const [criticality, setCriticality] = useState<string>('MEDIUM');
  const [cadreWhere, setCadreWhere] = useState('');
  const [cadreWho, setCadreWho] = useState('');
  const [cadreStart, setCadreStart] = useState('');
  const [cadreEnd, setCadreEnd] = useState('');
  const [involvedTeams, setInvolvedTeams] = useState('');

  const [bv, setBv] = useState('');
  const [sa, setSa] = useState('');
  const [us, setUs] = useState('');
  const [cost, setCost] = useState('');
  const [gain, setGain] = useState('');
  const [risk, setRisk] = useState<string>(RISK_UNSET);
  const [riskResponse, setRiskResponse] = useState('');
  const [arbMetier, setArbMetier] = useState<ProjectArbitrationLevelStatus>('BROUILLON');
  const [arbComite, setArbComite] = useState<ProjectArbitrationLevelStatus | null>(null);
  const [arbCodir, setArbCodir] = useState<ProjectArbitrationLevelStatus | null>(null);
  const [arbMetierRefusalNote, setArbMetierRefusalNote] = useState('');
  const [arbComiteRefusalNote, setArbComiteRefusalNote] = useState('');
  const [arbCodirRefusalNote, setArbCodirRefusalNote] = useState('');
  const [copilDraft, setCopilDraft] = useState<ProjectCopilRecommendation>('NOT_SET');

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

  /** Une seule hydratation par navigation projet : les refetch n’écrasent pas la saisie (autosave). */
  const hydratedProjectIdRef = useRef<string | null>(null);
  /** Après hydratation, ignore une exécution du debounce (évite un POST au chargement). */
  const suppressNextSheetAutosaveRef = useRef(false);
  const [lastSheetSavedAt, setLastSheetSavedAt] = useState<number | null>(null);

  useEffect(() => {
    hydratedProjectIdRef.current = null;
  }, [projectId]);

  useEffect(() => {
    if (!sheet) return;
    if (hydratedProjectIdRef.current === projectId) return;
    hydratedProjectIdRef.current = projectId;
    suppressNextSheetAutosaveRef.current = true;

    setProjectName(sheet.name);
    setPriority(sheet.priority);
    setProjectType(sheet.type);
    setProjectStatus(sheet.status);
    setCriticality(sheet.criticality);
    setCadreWhere(sheet.cadreLocation ?? '');
    setCadreWho(sheet.cadreQui ?? '');
    setCadreStart(sheet.startDate ? sheet.startDate.slice(0, 10) : '');
    setCadreEnd(sheet.targetEndDate ? sheet.targetEndDate.slice(0, 10) : '');
    setInvolvedTeams(sheet.involvedTeams ?? '');
    setBv(sheet.businessValueScore != null ? String(sheet.businessValueScore) : '');
    setSa(sheet.strategicAlignment != null ? String(sheet.strategicAlignment) : '');
    setUs(sheet.urgencyScore != null ? String(sheet.urgencyScore) : '');
    setCost(sheet.estimatedCost != null ? String(sheet.estimatedCost) : '');
    setGain(sheet.estimatedGain != null ? String(sheet.estimatedGain) : '');
    setRisk(sheet.riskLevel ?? RISK_UNSET);
    setRiskResponse(sheet.riskResponse ?? '');
    setArbMetier(sheet.arbitrationMetierStatus ?? 'BROUILLON');
    setArbComite(sheet.arbitrationComiteStatus ?? null);
    setArbCodir(sheet.arbitrationCodirStatus ?? null);
    setArbMetierRefusalNote(sheet.arbitrationMetierRefusalNote ?? '');
    setArbComiteRefusalNote(sheet.arbitrationComiteRefusalNote ?? '');
    setArbCodirRefusalNote(sheet.arbitrationCodirRefusalNote ?? '');
    setCopilDraft(sheet.copilRecommendation ?? 'NOT_SET');
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
  }, [projectId, sheet]);

  const buildProjectSheetPayload = useCallback((): UpdateProjectSheetPayload => {
    if (!sheet) throw new Error('Fiche indisponible');
    const payload: UpdateProjectSheetPayload = {};
    payload.name = projectName.trim() || sheet.name;
    payload.priority = priority as 'LOW' | 'MEDIUM' | 'HIGH';
    payload.type = projectType;
    payload.status = projectStatus;
    payload.criticality = criticality as 'LOW' | 'MEDIUM' | 'HIGH';
    payload.cadreLocation = cadreWhere.trim() ? cadreWhere.trim() : null;
    payload.cadreQui = cadreWho.trim() ? cadreWho.trim() : null;
    payload.involvedTeams = involvedTeams.trim() ? involvedTeams.trim() : null;
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
    payload.riskResponse = riskResponse.trim() ? riskResponse.trim() : null;
    payload.copilRecommendation = copilDraft;
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
    payload.arbitrationMetierStatus = arbMetier;
    if (arbMetier !== 'VALIDE') {
      payload.arbitrationComiteStatus = null;
      payload.arbitrationCodirStatus = null;
    } else {
      const c = arbComite ?? 'BROUILLON';
      payload.arbitrationComiteStatus = c;
      payload.arbitrationCodirStatus = c === 'VALIDE' ? (arbCodir ?? 'BROUILLON') : null;
    }
    payload.arbitrationMetierRefusalNote =
      arbMetier === 'REFUSE' ? (arbMetierRefusalNote.trim() || null) : null;
    payload.arbitrationComiteRefusalNote =
      arbMetier === 'VALIDE' && arbComite === 'REFUSE'
        ? (arbComiteRefusalNote.trim() || null)
        : null;
    payload.arbitrationCodirRefusalNote =
      arbMetier === 'VALIDE' && arbComite === 'VALIDE' && arbCodir === 'REFUSE'
        ? (arbCodirRefusalNote.trim() || null)
        : null;
    return payload;
  }, [
    sheet,
    projectName,
    priority,
    projectType,
    projectStatus,
    criticality,
    arbMetier,
    arbComite,
    arbCodir,
    arbMetierRefusalNote,
    arbComiteRefusalNote,
    arbCodirRefusalNote,
    cadreWhere,
    cadreWho,
    cadreStart,
    cadreEnd,
    involvedTeams,
    description,
    bv,
    sa,
    us,
    cost,
    gain,
    risk,
    riskResponse,
    copilDraft,
    problem,
    benefits,
    kpiLines,
    swS,
    swW,
    swO,
    swT,
    tSO,
    tST,
    tWO,
    tWT,
  ]);

  /** Une seule clé dérivée pour l’autosave : le useEffect garde un deps de taille fixe (évite erreur React si la liste change / HMR). */
  const autosaveFormSnapshotKey = useMemo(
    () =>
      JSON.stringify({
        projectName,
        priority,
        projectType,
        projectStatus,
        criticality,
        cadreWhere,
        cadreWho,
        cadreStart,
        cadreEnd,
        involvedTeams,
        description,
        bv,
        sa,
        us,
        cost,
        gain,
        risk,
        riskResponse,
        copilDraft,
        problem,
        benefits,
        kpiLines,
        swS,
        swW,
        swO,
        swT,
        tSO,
        tST,
        tWO,
        tWT,
        arbMetier,
        arbComite,
        arbCodir,
        arbMetierRefusalNote,
        arbComiteRefusalNote,
        arbCodirRefusalNote,
      }),
    [
      projectName,
      priority,
      projectType,
      projectStatus,
      criticality,
      cadreWhere,
      cadreWho,
      cadreStart,
      cadreEnd,
      involvedTeams,
      description,
      bv,
      sa,
      us,
      cost,
      gain,
      risk,
      riskResponse,
      copilDraft,
      problem,
      benefits,
      kpiLines,
      swS,
      swW,
      swO,
      swT,
      tSO,
      tST,
      tWO,
      tWT,
      arbMetier,
      arbComite,
      arbCodir,
      arbMetierRefusalNote,
      arbComiteRefusalNote,
      arbCodirRefusalNote,
    ],
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      return updateProjectSheet(authFetch, projectId, buildProjectSheetPayload());
    },
    onSuccess: () => {
      setLastSheetSavedAt(Date.now());
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

  useEffect(() => {
    if (!canEdit || !sheet) return;
    if (suppressNextSheetAutosaveRef.current) {
      suppressNextSheetAutosaveRef.current = false;
      return;
    }
    const id = window.setTimeout(() => {
      saveMutation.mutate();
    }, SHEET_AUTOSAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
    // sheet / refetch exclus : évite un POST à chaque invalidation ; mutationFn lit l’état courant.
    // Champs suivis via autosaveFormSnapshotKey (deps de taille fixe).
  }, [canEdit, sheet?.id, projectId, autosaveFormSnapshotKey]);

  const copilSaveMutation = useMutation({
    mutationFn: (value: ProjectCopilRecommendation) =>
      updateProjectSheet(authFetch, projectId, { copilRecommendation: value }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: projectQueryKeys.sheet(clientId, projectId),
      });
      void queryClient.invalidateQueries({
        queryKey: projectQueryKeys.detail(clientId, projectId),
      });
    },
    onError: (e: Error) => {
      toast.error(e.message || 'Impossible d’enregistrer la recommandation');
    },
  });

  const risksQuery = useProjectRisksQuery(projectId);
  const milestonesQuery = useProjectMilestonesQuery(projectId);
  const milestonesSorted = useMemo((): ProjectMilestoneApi[] => {
    const items = milestonesQuery.data ?? [];
    return [...items].sort(
      (a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime(),
    );
  }, [milestonesQuery.data]);
  const [newRiskTitle, setNewRiskTitle] = useState('');
  const [newRiskProb, setNewRiskProb] = useState<ProjectSheetRiskLevel>('MEDIUM');
  const [newRiskImpact, setNewRiskImpact] = useState<ProjectSheetRiskLevel>('MEDIUM');
  const [deletingRiskId, setDeletingRiskId] = useState<string | null>(null);
  /** Panneau « Détail des risques » : ouvert par défaut (état contrôlé). */
  const [risksDetailOpen, setRisksDetailOpen] = useState(true);
  const [retroplanOpen, setRetroplanOpen] = useState(false);

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
      void queryClient.invalidateQueries({
        queryKey: projectQueryKeys.sheet(clientId, projectId),
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
      void queryClient.invalidateQueries({
        queryKey: projectQueryKeys.sheet(clientId, projectId),
      });
    },
    onError: (e: Error) => {
      toast.error(e.message || 'Erreur suppression');
    },
  });

  useEffect(() => {
    setRisksDetailOpen(true);
  }, [projectId]);

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

  const fmtRoi = (n: number | null) =>
    n == null
      ? '—'
      : new Intl.NumberFormat('fr-FR', { style: 'percent', maximumFractionDigits: 1 }).format(n);

  const risksLoaded = !risksQuery.isLoading && risksQuery.data !== undefined;
  /** Risques métier (GET /risks) en criticité HIGH — même grille P×I que le pilotage ; indépendant du niveau fiche. */
  const criticalRiskCount = risksLoaded
    ? risksQuery.data.filter((r) => riskCriticalityForRisk(r) === 'HIGH').length
    : null;

  const bvEff = effectiveNumFromFormOrSheet(bv, sheet.businessValueScore);
  const saEff = effectiveNumFromFormOrSheet(sa, sheet.strategicAlignment);
  const usEff = effectiveNumFromFormOrSheet(us, sheet.urgencyScore);
  const costEff = effectiveNumFromFormOrSheet(cost, sheet.estimatedCost);
  const gainEff = effectiveNumFromFormOrSheet(gain, sheet.estimatedGain);
  const roiEff = computeRoiFromCostGain(costEff, gainEff);

  const problemFilled =
    Boolean(problem.trim()) || Boolean(sheet.businessProblem?.trim());
  const missingCritical = cockpitMissingLinesFromForm({
    cost: costEff,
    bv: bvEff,
    sa: saEff,
    us: usEff,
    problemFilled,
  });
  const roiDisplayed = roiEff ?? sheet.roi ?? null;
  const roiHint =
    costEff === undefined
      ? 'ROI non calculable (coût manquant)'
      : gainEff === undefined
        ? 'Sans gain financier : pas de ROI — la priorité suit les critères valeur (ROE)'
        : roiEff == null && sheet.roi == null
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

      <ProjectTeamMatrix projectId={projectId} />

      {/* A — Équipes impliquées */}
      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">A. Équipes impliquées</CardTitle>
          <p className="text-xs text-muted-foreground">
            Directions, services ou équipes concernés par le projet (hors rôles nominatifs ci-dessus).
          </p>
        </CardHeader>
        <CardContent>
          <Input
            id="involved-teams"
            disabled={!canEdit}
            value={involvedTeams}
            onChange={(e) => setInvolvedTeams(e.target.value)}
            placeholder="Ex. : DSI, RH, Achats, Finance, équipe métier…"
            maxLength={2000}
            className="w-full"
            aria-label="Équipes impliquées"
          />
        </CardContent>
      </Card>

      {/* B — Résumé + synthèse décisionnelle + arbitrage CODIR */}
      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">B. Résumé projet & synthèse décisionnelle</CardTitle>
          <p className="text-xs text-muted-foreground">
            Lecture cockpit — décision en 2 minutes
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="sheet-project-name">Nom du projet</Label>
              <Input
                id="sheet-project-name"
                disabled={!canEdit}
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Nom du projet"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Quand (début — fin cible)</Label>
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
            <div>
              <span className="text-muted-foreground">Code : </span>
              {sheet.code}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
              <span className="text-sm text-muted-foreground shrink-0">Type :</span>
              {canEdit ? (
                <Select
                  value={projectType}
                  onValueChange={(v) => {
                    if (v != null) setProjectType(v);
                  }}
                  disabled={saveMutation.isPending}
                >
                  <SelectTrigger
                    size="sm"
                    id="sheet-project-type"
                    className="w-full min-w-[12rem] max-w-xs sm:w-auto"
                    aria-label="Type de projet"
                  >
                    <SelectValue>
                      {PROJECT_TYPE_LABEL[projectType] ?? projectType}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      Object.keys(PROJECT_TYPE_LABEL) as Array<keyof typeof PROJECT_TYPE_LABEL>
                    ).map((k) => (
                      <SelectItem key={k} value={k}>
                        {PROJECT_TYPE_LABEL[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="text-sm font-medium text-foreground">
                  {PROJECT_TYPE_LABEL[projectType] ?? projectType}
                </span>
              )}
            </div>
            <div>
              <span className="text-muted-foreground">Nature : </span>
              {PROJECT_KIND_LABEL[sheet.kind] ?? sheet.kind}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
              <span className="text-sm text-muted-foreground shrink-0">Statut :</span>
              {canEdit ? (
                <Select
                  value={projectStatus}
                  onValueChange={(v) => {
                    if (v != null) setProjectStatus(v);
                  }}
                  disabled={saveMutation.isPending}
                >
                  <SelectTrigger
                    size="sm"
                    id="sheet-project-status"
                    className="w-full min-w-[12rem] max-w-xs sm:w-auto"
                    aria-label="Statut du projet"
                  >
                    <SelectValue>
                      {PROJECT_STATUS_LABEL[projectStatus] ?? projectStatus}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      Object.keys(PROJECT_STATUS_LABEL) as Array<
                        keyof typeof PROJECT_STATUS_LABEL
                      >
                    ).map((k) => (
                      <SelectItem key={k} value={k}>
                        {PROJECT_STATUS_LABEL[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="text-sm font-medium text-foreground">
                  {PROJECT_STATUS_LABEL[projectStatus] ?? projectStatus}
                </span>
              )}
            </div>
            <div className="sm:col-span-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                <span className="text-sm text-muted-foreground shrink-0">
                  Criticité (impact / enjeu) :
                </span>
                {canEdit ? (
                  <Select
                    value={criticality}
                    onValueChange={(v) => {
                      if (v != null) setCriticality(v);
                    }}
                    disabled={saveMutation.isPending}
                  >
                    <SelectTrigger
                      id="sheet-criticality"
                      size="sm"
                      className="w-full min-w-[12rem] max-w-xs sm:w-auto"
                      aria-label="Criticité du projet"
                    >
                      <SelectValue>
                        {PROJECT_CRITICALITY_LABEL[criticality] ?? criticality}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {(
                        Object.keys(PROJECT_CRITICALITY_LABEL) as Array<
                          keyof typeof PROJECT_CRITICALITY_LABEL
                        >
                      ).map((k) => (
                        <SelectItem key={k} value={k}>
                          {PROJECT_CRITICALITY_LABEL[k]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-sm font-medium text-foreground">
                    {PROJECT_CRITICALITY_LABEL[criticality] ?? criticality}
                  </span>
                )}
              </div>
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                Distincte de la priorité portefeuille — enregistrée avec la fiche.
              </p>
            </div>
          </div>

          <div className="border-t border-border pt-8">
            <div className="mb-5 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-sm font-semibold tracking-tight text-foreground">
                  Indicateurs de lecture
                </h4>
                <Badge variant="secondary" className="font-normal text-[10px] uppercase tracking-wide">
                  Décision
                </Badge>
              </div>
              <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">
                Vue synthétique pour l’arbitrage : rentabilité, priorité portefeuille, critères valeur et
                position COPIL. Aucun GO automatique — la recommandation COPIL s’enregistre à la
                sélection.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div
                className={cn(
                  'relative overflow-hidden rounded-xl border bg-card p-4 shadow-sm',
                  'border-l-[3px] border-l-emerald-500/70',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                      <Percent className="size-4" aria-hidden />
                    </span>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        ROI financier
                      </p>
                      <p className="text-[10px] text-muted-foreground">Gain − coût / coût</p>
                    </div>
                  </div>
                  {roiHint ? (
                    <span className="inline-flex shrink-0" title={roiHint}>
                      <Info className="size-4 text-muted-foreground" aria-hidden />
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 flex items-baseline gap-1.5 text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                  {fmtRoi(roiDisplayed)}
                </p>
                <p className="mt-2 min-h-[2.5rem] text-[11px] leading-snug text-muted-foreground">
                  {roiDisplayed != null
                    ? roiEff != null
                      ? 'Données issues des champs coût / gain (ou fiche enregistrée).'
                      : 'Valeur calculée côté serveur à partir de la fiche.'
                    : roiHint ?? '—'}
                </p>
                {roiDisplayed != null ? (
                  <p className="mt-3 border-t border-border/60 pt-3 text-[10px] leading-snug text-muted-foreground">
                    Croiser avec le ROE et la criticité — la priorité portefeuille est une autre lecture.
                  </p>
                ) : null}
              </div>

              <div
                className={cn(
                  'relative overflow-hidden rounded-xl border bg-card p-4 shadow-sm',
                  'border-l-[3px] border-l-sky-500/70',
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-700 dark:text-sky-400">
                    <Layers3 className="size-4" aria-hidden />
                  </span>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Priorité portefeuille
                    </p>
                    <p className="text-[10px] text-muted-foreground">Référence CODIR — pas un score calculé</p>
                  </div>
                </div>
                <Select
                  value={priority}
                  onValueChange={(v) => {
                    if (v != null) setPriority(v);
                  }}
                  disabled={!canEdit || saveMutation.isPending}
                >
                  <SelectTrigger
                    id="sheet-priority"
                    className="mt-4 w-full text-left"
                    aria-label="Priorité projet"
                  >
                    <SelectValue>
                      {PROJECT_PRIORITY_LABEL[priority] ?? priority}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PROJECT_PRIORITY_LABEL) as Array<keyof typeof PROJECT_PRIORITY_LABEL>).map(
                      (k) => (
                        <SelectItem key={k} value={k}>
                          {PROJECT_PRIORITY_LABEL[k]}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
                <p className="mt-3 border-t border-border/60 pt-3 text-[10px] text-muted-foreground">
                  Sauvegardée avec la fiche (automatique).
                </p>
              </div>

              <div
                className={cn(
                  'relative overflow-hidden rounded-xl border bg-card p-4 shadow-sm',
                  'border-l-[3px] border-l-violet-500/70',
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-700 dark:text-violet-400">
                    <TrendingUp className="size-4" aria-hidden />
                  </span>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      ROE — critères valeur
                    </p>
                    <p className="text-[10px] text-muted-foreground">Scores 1 à 5 (valeur / alignement / urgence)</p>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {(
                    [
                      { label: 'Valeur', v: bvEff },
                      { label: 'Alignement', v: saEff },
                      { label: 'Urgence', v: usEff },
                    ] as const
                  ).map((row) => (
                    <div key={row.label} className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="text-muted-foreground">{row.label}</span>
                        <span className="font-medium tabular-nums text-foreground">
                          {scoreOutOf5(row.v)}
                        </span>
                      </div>
                      <ScoreMiniBar value={row.v} />
                    </div>
                  ))}
                </div>
              </div>

              <div
                className={cn(
                  'relative overflow-hidden rounded-xl border bg-card p-4 shadow-sm',
                  'border-l-[3px] border-l-amber-500/70',
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-800 dark:text-amber-400">
                    <MessagesSquare className="size-4" aria-hidden />
                  </span>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      COPIL / COPRO
                    </p>
                    <p className="text-[10px] text-muted-foreground">Position du collège — pas de verdict auto</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <Label htmlFor="copil-rec" className="text-xs text-muted-foreground">
                    Position retenue
                  </Label>
                  <Select
                    value={copilDraft}
                    onValueChange={(v) => {
                      const next = v as ProjectCopilRecommendation;
                      const prev = copilDraft;
                      if (next === prev) return;
                      setCopilDraft(next);
                      copilSaveMutation.mutate(next, {
                        onError: () => setCopilDraft(prev),
                      });
                    }}
                    disabled={!canEdit || copilSaveMutation.isPending}
                  >
                    <SelectTrigger
                      id="copil-rec"
                      className="w-full text-left"
                      aria-busy={copilSaveMutation.isPending}
                    >
                      <SelectValue>{COPIL_LABEL[copilDraft]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(COPIL_LABEL) as ProjectCopilRecommendation[]).map((k) => (
                        <SelectItem key={k} value={k}>
                          {COPIL_LABEL[k]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {missingCritical.length > 0 ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm">
              <p className="font-medium text-amber-950 dark:text-amber-600">
                Fiche incomplète :
              </p>
              <ul className="mt-1 list-inside list-disc text-xs text-amber-950/90 dark:text-amber-600">
                {missingCritical.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="border-t border-border pt-8">
            <div className="mb-5 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-sm font-semibold tracking-tight text-foreground">Arbitrage</h4>
                <Badge variant="secondary" className="font-normal text-[10px] uppercase tracking-wide">
                  3 niveaux
                </Badge>
              </div>
              <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">
                Métier → comité de projet → sponsor / CODIR. Statuts : brouillon, en cours, soumis à
                validation, validé, refusé. Le niveau suivant s’ouvre après « Validé » sur le précédent.
                Sauvegarde avec la fiche (automatique).
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {ARBITRATION_LEVEL_STEPS.map((step, i) => {
                const StepIcon = ARBITRATION_STEP_ICONS[i];
                const unlocked =
                  i === 0 ||
                  (i === 1 && arbMetier === 'VALIDE') ||
                  (i === 2 && arbMetier === 'VALIDE' && arbComite === 'VALIDE');
                const focus =
                  arbitrationFocusStep(arbMetier, arbComite, arbCodir) === i;
                const value: ProjectArbitrationLevelStatus =
                  i === 0
                    ? arbMetier
                    : i === 1
                      ? (arbComite ?? 'BROUILLON')
                      : (arbCodir ?? 'BROUILLON');
                const refusalNote =
                  i === 0
                    ? arbMetierRefusalNote
                    : i === 1
                      ? arbComiteRefusalNote
                      : arbCodirRefusalNote;
                const toneStatus: ProjectArbitrationLevelStatus | null = unlocked ? value : null;
                return (
                  <div
                    key={step.title}
                    className={cn(
                      'relative overflow-hidden rounded-xl p-4 shadow-sm transition-colors',
                      arbitrationLevelCardClasses(toneStatus, focus),
                    )}
                    aria-current={focus ? 'step' : undefined}
                  >
                    <div className="flex gap-3">
                      <span
                        className={cn(
                          'flex size-9 shrink-0 items-center justify-center rounded-lg',
                          ARBITRATION_STEP_ICON_BGS[i],
                        )}
                      >
                        <StepIcon className="size-4" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                            Niveau {i + 1}
                          </p>
                          {!unlocked ? (
                            <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-normal">
                              Verrouillé
                            </Badge>
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-sm font-semibold leading-snug text-foreground">
                          {step.title}
                        </p>
                        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{step.body}</p>
                      </div>
                    </div>

                    {canEdit && unlocked ? (
                      <div className="mt-4 space-y-1.5 border-t border-border/50 pt-4">
                        <Label className="text-xs text-muted-foreground" htmlFor={`project-arb-status-${i}`}>
                          Statut
                        </Label>
                        <Select
                          value={value}
                          onValueChange={(v) => {
                            const next = v as ProjectArbitrationLevelStatus;
                            if (i === 0) {
                              setArbMetier(next);
                              if (next !== 'REFUSE') setArbMetierRefusalNote('');
                              if (next !== 'VALIDE') {
                                setArbComite(null);
                                setArbCodir(null);
                                setArbComiteRefusalNote('');
                                setArbCodirRefusalNote('');
                              } else {
                                setArbComite((c) => c ?? 'BROUILLON');
                              }
                            } else if (i === 1) {
                              setArbComite(next);
                              if (next !== 'REFUSE') setArbComiteRefusalNote('');
                              if (next !== 'VALIDE') {
                                setArbCodir(null);
                                setArbCodirRefusalNote('');
                              } else {
                                setArbCodir((d) => d ?? 'BROUILLON');
                              }
                            } else {
                              setArbCodir(next);
                              if (next !== 'REFUSE') setArbCodirRefusalNote('');
                            }
                          }}
                          disabled={saveMutation.isPending}
                        >
                          <SelectTrigger
                            id={`project-arb-status-${i}`}
                            className="w-full text-left"
                          >
                            <SelectValue>{LEVEL_STATUS_LABEL[value]}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {LEVEL_STATUS_ORDER.map((k) => (
                              <SelectItem key={k} value={k}>
                                {LEVEL_STATUS_LABEL[k]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : null}
                    {canEdit && !unlocked ? (
                      <p className="mt-4 border-t border-border/50 pt-4 text-[11px] leading-snug text-muted-foreground">
                        Débloqué lorsque le niveau précédent est « Validé ».
                      </p>
                    ) : null}
                    {!canEdit && unlocked ? (
                      <div className="mt-4 border-t border-border/50 pt-4">
                        <p className="text-xs text-muted-foreground">Statut</p>
                        <p className="mt-1 text-sm font-medium text-foreground">
                          {LEVEL_STATUS_LABEL[value]}
                        </p>
                      </div>
                    ) : null}
                    {unlocked && value === 'REFUSE' ? (
                      <div className="mt-4 space-y-1.5 border-t border-border/50 pt-4">
                        <Label
                          className="text-xs text-muted-foreground"
                          htmlFor={canEdit ? `project-arb-refusal-${i}` : undefined}
                        >
                          Motif du refus
                        </Label>
                        {canEdit ? (
                          <textarea
                            id={`project-arb-refusal-${i}`}
                            className={cn(textareaClass, 'min-h-[56px]')}
                            rows={2}
                            maxLength={2000}
                            disabled={saveMutation.isPending}
                            value={refusalNote}
                            onChange={(e) => {
                              const t = e.target.value;
                              if (i === 0) setArbMetierRefusalNote(t);
                              else if (i === 1) setArbComiteRefusalNote(t);
                              else setArbCodirRefusalNote(t);
                            }}
                            placeholder="Précisez le motif…"
                          />
                        ) : refusalNote.trim() ? (
                          <p className="text-sm whitespace-pre-wrap text-foreground">{refusalNote}</p>
                        ) : (
                          <p className="text-sm text-muted-foreground">Non renseigné</p>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })}
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
            <Label htmlFor="project-desc">Description métier</Label>
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
            <Label htmlFor="ben">Gains attendus</Label>
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
              <TooltipProvider delay={200}>
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="gain">Gain estimé</Label>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <button
                          type="button"
                          className="inline-flex shrink-0 rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          aria-label="Aide : gain estimé"
                        />
                      }
                    >
                      <Info className="size-3.5" aria-hidden />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      Ne s&apos;applique pas à tous les cas — laisser vide si sans objet.
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
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
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Synthèse CODIR */}
          <div className="space-y-1.5 text-sm">
            <div>
              <span className="text-muted-foreground">Niveau de risque (affiché) : </span>
              <span className="font-semibold tabular-nums text-foreground">
                {sheet.riskLevel != null ? RISK_LABEL[sheet.riskLevel] : '—'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Priorité projet (portefeuille) : </span>
              <span className="font-semibold text-foreground">
                {PROJECT_PRIORITY_LABEL[priority] ?? priority}
              </span>
            </div>
            {criticalRiskCount != null && criticalRiskCount > 0 ? (
              <p className="pt-0.5 text-sm font-medium text-amber-950 dark:text-amber-600">
                ⚠️{' '}
                {criticalRiskCount === 1
                  ? '1 risque critique'
                  : `${criticalRiskCount} risques critiques`}
              </p>
            ) : null}
          </div>

          {/* Paramétrage fiche (opérationnel) */}
          <div className="space-y-2 border-t border-border pt-4">
            <div className="space-y-1">
              <Label htmlFor="sheet-risk-level" className="text-muted-foreground">
                Niveau de risque — saisie fiche (CODIR)
              </Label>
              <p className="text-[11px] leading-snug text-muted-foreground">
                Appréciation du risque du projet (faible / moyen / élevé). Distinct de la priorité
                portefeuille (section A et ligne ci-dessus).
              </p>
            </div>
            <Select
              value={risk}
              onValueChange={(v) => setRisk(v ?? RISK_UNSET)}
              disabled={!canEdit}
            >
              <SelectTrigger id="sheet-risk-level" className="max-w-xs">
                <SelectValue placeholder="Non renseigné">
                  {risk === RISK_UNSET
                    ? 'Non renseigné'
                    : RISK_LABEL[risk as ProjectSheetRiskLevel]}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={RISK_UNSET}>Non renseigné</SelectItem>
                {(Object.keys(RISK_LABEL) as ProjectSheetRiskLevel[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {RISK_LABEL[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="space-y-1.5 pt-2">
              <Label htmlFor="sheet-risk-response" className="text-muted-foreground">
                Réponse au risque
              </Label>
              <p className="text-[11px] leading-snug text-muted-foreground">
                Mesures envisagées : réduction, transfert, acceptation, plan de contingence, etc.
              </p>
              <textarea
                id="sheet-risk-response"
                className={cn(textareaClass, 'min-h-[88px]')}
                disabled={!canEdit}
                value={riskResponse}
                onChange={(e) => setRiskResponse(e.target.value)}
                placeholder="Ex. : plan de reprise, renfort MOA, revue architecture, assurance…"
                maxLength={20000}
                aria-label="Réponse au risque"
              />
            </div>
          </div>

          {/* Saisie nouveau risque — au-dessus du détail liste */}
          <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:flex-wrap sm:items-end">
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
                    <SelectValue>{RISK_LABEL[newRiskProb]}</SelectValue>
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
                    <SelectValue>{RISK_LABEL[newRiskImpact]}</SelectValue>
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
              disabled={!canEdit || createRiskMutation.isPending || !newRiskTitle.trim()}
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
              {createRiskMutation.isPending ? 'Enregistrement…' : 'Ajouter un risque'}
            </Button>
          </div>

          {/* Détail opérationnel — liste */}
          <details
            className="group rounded-lg border border-border/60"
            open={risksDetailOpen}
            onToggle={(e) => setRisksDetailOpen(e.currentTarget.open)}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
              <span>Détail des risques</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <div className="border-t border-border/60 px-3 pb-3 pt-2">
              <TooltipProvider delay={250}>
                {risksQuery.isLoading ? (
                  <LoadingState rows={2} />
                ) : !risksQuery.data?.length ? (
                  <p className="text-sm text-muted-foreground">Aucun risque enregistré.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Titre</TableHead>
                          <TableHead className="w-[140px]">Criticité</TableHead>
                          {canEdit ? (
                            <TableHead className="w-[44px] p-2 text-right" />
                          ) : null}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {risksQuery.data.map((r) => {
                          const crit = riskCriticalityForRisk(r);
                          const piHint = `Probabilité : ${riskTierFr(r.probability)} · Impact : ${riskTierFr(r.impact)}`;
                          const critBadge = (
                            <Badge
                              variant="outline"
                              className={cn(
                                'cursor-help',
                                crit === 'LOW' &&
                                  'border-emerald-600/45 bg-emerald-500/10 text-emerald-950 dark:text-emerald-500',
                                crit === 'MEDIUM' &&
                                  'border-amber-500/50 bg-amber-500/10 text-amber-950 dark:text-amber-600',
                                crit === 'HIGH' &&
                                  'border-red-500/50 bg-red-500/10 text-red-800 dark:text-red-300',
                              )}
                            >
                              {riskTierFr(crit)}
                            </Badge>
                          );
                          return (
                            <TableRow key={r.id}>
                              <TableCell className="max-w-[min(100%,280px)] font-medium">
                                {r.title}
                              </TableCell>
                              <TableCell>
                                <Tooltip>
                                  <TooltipTrigger render={<span className="inline-flex" />}>
                                    {critBadge}
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs">
                                    {piHint}
                                  </TooltipContent>
                                </Tooltip>
                              </TableCell>
                              {canEdit ? (
                                <TableCell className="p-2 text-right">
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
              </TooltipProvider>
            </div>
          </details>
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
                <span className="text-lg font-bold tabular-nums text-emerald-950 dark:text-emerald-500">
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
                <span className="text-lg font-bold tabular-nums text-amber-950 dark:text-amber-600">
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
                <span className="text-lg font-bold tabular-nums text-emerald-950 dark:text-emerald-500">
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
                <span className="text-lg font-bold tabular-nums text-amber-950 dark:text-amber-600">
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

      {/* H — Rétroplanning macro (jalons) */}
      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">H. Rétroplanning macro</CardTitle>
          <p className="text-xs text-muted-foreground">
            Jalons du projet (chronologie) — générables par rétroplan à partir d&apos;une date de fin et
            d&apos;écarts en jours.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {milestonesQuery.isLoading ? (
            <LoadingState rows={3} />
          ) : milestonesSorted.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun jalon — les jalons créés ici ou depuis le détail projet apparaissent dans ce
              planning.
            </p>
          ) : (
            <div className="max-h-[min(24rem,55vh)] overflow-y-auto rounded-lg border border-border/60 bg-muted/10 px-3 py-4 sm:px-4">
              <ol className="list-none space-y-0 p-0" aria-label="Ligne de temps des jalons">
                {milestonesSorted.map((m, idx) => (
                  <li key={m.id} className="flex gap-3">
                    <div className="flex w-4 shrink-0 flex-col items-center pt-1">
                      <span
                        className="size-3.5 shrink-0 rounded-full border-2 border-primary bg-background shadow-sm ring-2 ring-background"
                        aria-hidden
                      />
                      {idx < milestonesSorted.length - 1 ? (
                        <span
                          className="mt-2 block min-h-[2.75rem] w-px shrink-0 bg-border"
                          aria-hidden
                        />
                      ) : null}
                    </div>
                    <div
                      className={cn(
                        'min-w-0 flex-1 pb-6',
                        idx === milestonesSorted.length - 1 && 'pb-0',
                      )}
                    >
                      <time
                        dateTime={m.targetDate}
                        className="block text-xs font-medium tabular-nums text-muted-foreground"
                      >
                        {formatMilestoneDate(m.targetDate)}
                      </time>
                      <p className="mt-1 font-medium leading-snug text-foreground">{m.name}</p>
                      <Badge variant="outline" className="mt-2 text-xs font-normal">
                        {MILESTONE_STATUS_LABEL[m.status] ?? m.status}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Assistant : plusieurs jalons en une fois à partir d&apos;une date de fin et de jours
              avant cette fin.
            </p>
            {canEdit ? (
              <Button
                type="button"
                variant="default"
                size="sm"
                className="w-full gap-1.5 sm:w-auto"
                onClick={() => setRetroplanOpen(true)}
              >
                <Pencil className="size-4 shrink-0" aria-hidden />
                Éditer
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">Lecture seule — pas de création.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <ProjectRetroplanMacroDialog
        projectId={projectId}
        defaultAnchorDate={sheet.targetEndDate}
        open={retroplanOpen}
        onOpenChange={setRetroplanOpen}
      />

      {canEdit && (
        <div className="flex flex-col items-end gap-0.5 text-right">
          <p className="text-xs text-muted-foreground" role="status" aria-live="polite">
            {saveMutation.isPending ? (
              <span className="text-foreground">Enregistrement de la fiche…</span>
            ) : lastSheetSavedAt != null ? (
              <>
                Fiche enregistrée automatiquement —{' '}
                <time dateTime={new Date(lastSheetSavedAt).toISOString()}>
                  {formatSavedClock(lastSheetSavedAt)}
                </time>
              </>
            ) : (
              'Les champs de la fiche sont enregistrés automatiquement après la saisie.'
            )}
          </p>
        </div>
      )}
    </div>
  );
}
