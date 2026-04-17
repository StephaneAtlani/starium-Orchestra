'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import {
  AlertTriangle,
  Briefcase,
  Building2,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  Eye,
  Info,
  LayoutDashboard,
  Layers3,
  MessagesSquare,
  Pencil,
  Percent,
  Plus,
  Split,
  Trash2,
  TrendingUp,
  UsersRound,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { RegistryBadge } from '@/lib/ui/registry-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  getProjectSheetDecisionSnapshot,
  listProjectSheetDecisionSnapshots,
  updateProjectSheet,
} from '../api/projects.api';
import {
  projectsList,
  projectRisks,
  projectScenarioCockpit,
  projectScenarios,
} from '../constants/project-routes';
import {
  MILESTONE_STATUS_LABEL,
  PROJECT_CRITICALITY_LABEL,
  PROJECT_KIND_LABEL,
  PROJECT_PRIORITY_LABEL,
  PROJECT_STATUS_LABEL,
  PROJECT_TYPE_LABEL,
  WARNING_CODE_LABEL,
} from '../constants/project-enum-labels';
import { projectQueryKeys } from '../lib/project-query-keys';
import { isProjectScenarioEditingAllowed } from '../lib/project-scenario-editing-allowed';
import { riskCriticalityForRisk } from '../lib/risk-criticality';
import { HealthBadge, ProjectPortfolioBadges } from './project-badges';
import { useClientUiBadgeConfig } from '@/features/ui/hooks/use-client-ui-badge-config';
import { ProjectRetroplanMacroDialog } from './project-retroplan-macro-dialog';
import { CreateScenarioDialog } from '../scenarios/CreateScenarioDialog';
import { ScenarioWorkspacePage } from '../scenario-workspace/ScenarioWorkspacePage';
import { ProjectDocumentsSection } from './project-documents-section';
import { ProjectTeamMatrix } from './project-team-matrix';
import { ProjectWorkspaceTabs } from './project-workspace-tabs';
import { useProjectDetailQuery } from '../hooks/use-project-detail-query';
import { computeRoiFromCostGain } from '../lib/project-sheet-priority-preview';
import { mapAuditPayloadToProjectSheet } from '../lib/map-audit-payload-to-project-sheet';
import { useProjectMilestonesQuery } from '../hooks/use-project-milestones-query';
import { useProjectScenariosMutations } from '../hooks/use-project-scenarios-mutations';
import { useProjectScenariosQuery } from '../hooks/use-project-scenarios-query';
import { useProjectSheetQuery } from '../hooks/use-project-sheet-query';
import { useProjectRisksQuery } from '../hooks/use-project-risks-query';
import type {
  ProjectArbitrationLevelStatus,
  ProjectCopilRecommendation,
  ProjectMilestoneApi,
  ProjectScenarioApi,
  ProjectSheet,
  ProjectSheetRiskLevel,
  UpdateProjectSheetPayload,
} from '../types/project.types';

const RISK_LABEL: Record<ProjectSheetRiskLevel, string> = {
  LOW: 'Faible',
  MEDIUM: 'Moyen',
  HIGH: 'Élevé',
};

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
  BROUILLON: 'Proposition de projet',
  EN_COURS: 'En préparation',
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

const DECISION_LEVEL_LABEL: Record<string, string> = {
  METIER: 'Métier',
  COMITE: 'Comité de projet',
  CODIR: 'Sponsor / CODIR',
};

/** Liste historique snapshots : date lisible (jour, heure). */
function formatSnapshotHistoryDate(iso: string): string {
  try {
    const d = new Date(iso);
    const s = new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(d);
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  } catch {
    return iso;
  }
}

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

const SCORE_1_5_UNSET = '__score_1_5_unset__';

function scoreStringFromSheet(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '';
  const x = Math.round(Number(n));
  if (x < 1 || x > 5) return '';
  return String(x);
}

function Score15Field({
  id,
  label,
  value,
  onValueChange,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onValueChange: (next: string) => void;
  disabled: boolean;
}) {
  const normalized = /^[1-5]$/.test(value.trim()) ? value.trim() : '';
  const selectValue = normalized === '' ? SCORE_1_5_UNSET : normalized;
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select
        value={selectValue}
        onValueChange={(v) => {
          const s = v ?? SCORE_1_5_UNSET;
          onValueChange(s === SCORE_1_5_UNSET ? '' : s);
        }}
        disabled={disabled}
      >
        <SelectTrigger id={id} className="w-full" aria-label={label}>
          <SelectValue>
            {normalized === '' ? 'Non renseigné' : `${normalized} / 5`}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={SCORE_1_5_UNSET}>Non renseigné</SelectItem>
          {(['1', '2', '3', '4', '5'] as const).map((n) => (
            <SelectItem key={n} value={n}>
              {n} / 5
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

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
  'min-h-[72px] w-full rounded-lg border border-border/70 bg-background px-2.5 py-2 text-sm',
  'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
  'disabled:cursor-not-allowed disabled:opacity-50',
);

/** Scope fiche projet : filets gris (tokens) plutôt que bordures trop contrastées. Carte navigation (onglets) exclue : même trait que la synthèse. */
const projectSheetChromeClass = cn(
  '[&_[data-slot=card]:not([data-workspace-tabs])]:border-border/65',
  '[&_[data-slot=input]]:border-border/70',
  '[&_[data-slot=select-trigger]]:border-border/70',
  '[&_textarea]:border-border/70',
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

export function ProjectSheetView({
  projectId,
  sheetReadOnlyOverride,
  embedMode = 'page',
}: {
  projectId: string;
  /** Affiche la fiche figée (snapshot audit) sans requête GET sheet ni édition. */
  sheetReadOnlyOverride?: ProjectSheet;
  embedMode?: 'page' | 'snapshotModal';
}) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const queryClient = useQueryClient();
  const { has } = usePermissions();
  const canEdit = has('projects.update') && !sheetReadOnlyOverride;

  const { data: querySheet, isLoading, error } = useProjectSheetQuery(projectId, {
    enabled: !sheetReadOnlyOverride,
  });
  const sheet = sheetReadOnlyOverride ?? querySheet;

  const projectDetailQuery = useProjectDetailQuery(projectId);
  const { merged: badgeMerged } = useClientUiBadgeConfig();

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
  const [copilNote, setCopilNote] = useState('');
  const [copilNoteOpen, setCopilNoteOpen] = useState(false);

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

  const [snapshotDialogOpen, setSnapshotDialogOpen] = useState(false);
  const [pendingArbValidation, setPendingArbValidation] = useState<{
    level: 0 | 1 | 2;
    next: ProjectArbitrationLevelStatus;
    previousValue: ProjectArbitrationLevelStatus;
  } | null>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);
  /** Modale pleine fiche (lecture seule) pour un snapshot sélectionné dans l’historique. */
  const [snapshotSheetViewerOpen, setSnapshotSheetViewerOpen] = useState(false);

  const pendingArbValidationRef = useRef(pendingArbValidation);
  pendingArbValidationRef.current = pendingArbValidation;

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
    setBv(scoreStringFromSheet(sheet.businessValueScore));
    setSa(scoreStringFromSheet(sheet.strategicAlignment));
    setUs(scoreStringFromSheet(sheet.urgencyScore));
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
    setCopilNote(sheet.copilRecommendationNote ?? '');
    setCopilNoteOpen(false);
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
    payload.copilRecommendationNote =
      copilDraft === 'NOT_SET' ? null : copilNote.trim() ? copilNote.trim() : null;
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
    copilNote,
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

  /** Toujours la dernière fonction de payload (évite closure stale dans `useMutation` au moment du debounce). */
  const buildProjectSheetPayloadRef = useRef(buildProjectSheetPayload);
  buildProjectSheetPayloadRef.current = buildProjectSheetPayload;

  const applyArbitrationSelectChange = useCallback(
    (i: 0 | 1 | 2, next: ProjectArbitrationLevelStatus) => {
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
    },
    [],
  );

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
        copilNote,
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
      copilNote,
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
    mutationFn: async (opts?: { recordDecisionSnapshot?: boolean }) => {
      const base = buildProjectSheetPayloadRef.current();
      return updateProjectSheet(authFetch, projectId, {
        ...base,
        ...(opts && 'recordDecisionSnapshot' in opts
          ? { recordDecisionSnapshot: opts.recordDecisionSnapshot }
          : {}),
      });
    },
    onSuccess: () => {
      setLastSheetSavedAt(Date.now());
      void queryClient.invalidateQueries({
        queryKey: projectQueryKeys.sheet(clientId, projectId),
      });
      void queryClient.invalidateQueries({
        queryKey: projectQueryKeys.detail(clientId, projectId),
      });
      void queryClient.invalidateQueries({
        queryKey: ['projects', 'project', projectId, 'sheet-decision-snapshots'],
      });
    },
    onError: (e: Error) => {
      toast.error(e.message || 'Erreur enregistrement');
    },
  });

  /** Après confirmation : applique le statut arbitrage + enregistre un snapshot dans l’historique. */
  const confirmPendingArbitrationDecision = useCallback(() => {
    const p = pendingArbValidationRef.current;
    if (!p) return;
    setSnapshotDialogOpen(false);
    setPendingArbValidation(null);
    flushSync(() => {
      applyArbitrationSelectChange(p.level, p.next);
    });
    suppressNextSheetAutosaveRef.current = true;
    // `buildProjectSheetPayloadRef` doit refléter l’état post-flushSync ; un `mutate` synchrone
    // lisait encore l’ancienne closure et envoyait l’ancien arbitrage au PATCH.
    queueMicrotask(() => {
      saveMutation.mutate({ recordDecisionSnapshot: true });
    });
  }, [applyArbitrationSelectChange, saveMutation]);

  const snapshotsListQuery = useQuery({
    queryKey: projectQueryKeys.sheetDecisionSnapshots(clientId, projectId, { limit: 50, offset: 0 }),
    queryFn: () =>
      listProjectSheetDecisionSnapshots(authFetch, projectId, { limit: 50, offset: 0 }),
    enabled: Boolean(historyDialogOpen && clientId && projectId),
  });

  const snapshotDetailQuery = useQuery({
    queryKey: projectQueryKeys.sheetDecisionSnapshot(clientId, projectId, selectedSnapshotId ?? ''),
    queryFn: () =>
      getProjectSheetDecisionSnapshot(authFetch, projectId, selectedSnapshotId!),
    enabled: Boolean(
      snapshotSheetViewerOpen && selectedSnapshotId && clientId && projectId,
    ),
  });

  useEffect(() => {
    if (sheetReadOnlyOverride) return;
    if (!canEdit || !sheet) return;
    if (suppressNextSheetAutosaveRef.current) {
      suppressNextSheetAutosaveRef.current = false;
      return;
    }
    const id = window.setTimeout(() => {
      saveMutation.mutate(undefined);
    }, SHEET_AUTOSAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
    // sheet / refetch exclus : évite un POST à chaque invalidation ; mutationFn lit l’état courant.
    // Champs suivis via autosaveFormSnapshotKey (deps de taille fixe).
  }, [sheetReadOnlyOverride, canEdit, sheet?.id, projectId, autosaveFormSnapshotKey]);

  const copilSaveMutation = useMutation({
    mutationFn: (value: ProjectCopilRecommendation) =>
      updateProjectSheet(authFetch, projectId, {
        copilRecommendation: value,
        ...(value === 'NOT_SET' ? { copilRecommendationNote: null } : {}),
      }),
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

  const risksQuery = useProjectRisksQuery(projectId, { enabled: !sheetReadOnlyOverride });
  const milestonesQuery = useProjectMilestonesQuery(projectId, {
    enabled: !sheetReadOnlyOverride,
  });
  const milestonesSorted = useMemo((): ProjectMilestoneApi[] => {
    const items = milestonesQuery.data?.items ?? [];
    return [...items].sort(
      (a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime(),
    );
  }, [milestonesQuery.data]);
  const scenariosQuery = useProjectScenariosQuery(projectId, {
    enabled: !sheetReadOnlyOverride,
  });
  const scenariosSorted = useMemo((): ProjectScenarioApi[] => {
    const items = scenariosQuery.data?.items ?? [];
    return [...items].sort((a, b) => {
      const rank = (s: ProjectScenarioApi) =>
        s.status === 'SELECTED' || s.isBaseline ? 0 : s.status === 'ARCHIVED' ? 2 : 1;
      const ra = rank(a);
      const rb = rank(b);
      if (ra !== rb) return ra - rb;
      return a.name.localeCompare(b.name, 'fr');
    });
  }, [scenariosQuery.data]);
  const { createMutation, isAnyPending: scenariosMutationPending } =
    useProjectScenariosMutations(projectId);
  const [createScenarioOpen, setCreateScenarioOpen] = useState(false);
  const [scenarioWorkspaceModal, setScenarioWorkspaceModal] = useState<{
    id: string;
    mode: 'view' | 'edit';
  } | null>(null);
  const canAddScenarioOnSheet = useMemo(() => {
    if (!canEdit) return false;
    const st = projectDetailQuery.data?.status ?? projectStatus;
    return isProjectScenarioEditingAllowed({ status: st });
  }, [canEdit, projectDetailQuery.data?.status, projectStatus]);
  const [retroplanOpen, setRetroplanOpen] = useState(false);

  if (!projectId) {
    return (
      <p className="text-sm text-destructive">Identifiant de projet manquant.</p>
    );
  }

  if (!sheetReadOnlyOverride) {
    if (isLoading) {
      return <LoadingState rows={6} />;
    }

    if (error || !querySheet) {
      return (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Fiche introuvable ou accès refusé.
        </div>
      );
    }
  }

  if (!sheet) {
    return <LoadingState rows={6} />;
  }

  const fmtRoi = (n: number | null) =>
    n == null
      ? '—'
      : new Intl.NumberFormat('fr-FR', { style: 'percent', maximumFractionDigits: 1 }).format(n);

  const risksLoaded =
    !sheetReadOnlyOverride && !risksQuery.isLoading && risksQuery.data !== undefined;
  /** Risques métier (GET /risks) en criticité HIGH — même grille P×I que le pilotage ; indépendant du niveau fiche. */
  const criticalRiskCount = sheetReadOnlyOverride
    ? null
    : risksLoaded
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
    <div className={cn('space-y-6', projectSheetChromeClass)}>
      {embedMode === 'page' ? (
        <div className="space-y-5">
          <header className="flex flex-col gap-5">
            <div className="space-y-3">
              <Link
                href={projectsList()}
                className={cn(
                  buttonVariants({ variant: 'ghost', size: 'sm' }),
                  '-ml-2 w-fit gap-1 text-muted-foreground hover:text-foreground',
                )}
              >
                <ChevronLeft className="size-4" />
                Portefeuille projets
              </Link>
              <PageHeader
                title={
                  projectDetailQuery.data?.name ??
                  (projectName.trim() || sheet.name)
                }
                description={
                  projectDetailQuery.data?.code
                    ? `Code : ${projectDetailQuery.data.code}`
                    : sheet.code
                      ? `Code : ${sheet.code}`
                      : undefined
                }
                actions={
                  <div className="flex flex-wrap items-center gap-2">
                    {projectDetailQuery.data ? (
                      <HealthBadge
                        health={projectDetailQuery.data.computedHealth}
                        merged={badgeMerged}
                      />
                    ) : projectDetailQuery.isLoading ? (
                      <span
                        className="text-xs text-muted-foreground"
                        aria-live="polite"
                      >
                        Chargement santé…
                      </span>
                    ) : null}
                  </div>
                }
              />
            </div>

            {projectDetailQuery.data ? (
              <>
                <div className="min-w-0">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    Signaux portefeuille
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <ProjectPortfolioBadges
                      signals={projectDetailQuery.data.signals}
                      merged={badgeMerged}
                    />
                  </div>
                </div>
                {projectDetailQuery.data.warnings.length > 0 ? (
                  <Alert
                    className="border-amber-500/35 bg-amber-500/5 text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-600"
                    role="status"
                  >
                    <AlertTriangle
                      className="text-amber-800 dark:text-amber-600"
                      aria-hidden
                    />
                    <AlertTitle className="font-semibold text-amber-950 dark:text-amber-600">
                      Alertes projet
                    </AlertTitle>
                    <AlertDescription className="text-amber-950/95 dark:text-amber-600/95">
                      {projectDetailQuery.data.warnings
                        .map((w) => WARNING_CODE_LABEL[w] ?? w)
                        .join(' · ')}
                    </AlertDescription>
                  </Alert>
                ) : null}
              </>
            ) : null}
          </header>

          <Suspense
            fallback={
              <Card
                size="sm"
                data-workspace-tabs=""
                className="min-w-0 overflow-hidden py-0 shadow-sm"
                aria-hidden
              >
                <CardHeader className="space-y-0 border-b border-border/60 bg-muted/35 px-3 py-3.5 sm:px-5">
                  <div className="h-11 w-full animate-pulse rounded-xl bg-muted/60 ring-1 ring-border/50" />
                </CardHeader>
              </Card>
            }
          >
            <Card
              size="sm"
              data-workspace-tabs=""
              className="min-w-0 overflow-hidden py-0 shadow-sm"
            >
                <CardHeader className="space-y-0 border-b border-border/60 bg-muted/35 px-3 py-3.5 sm:px-5">
                  <ProjectWorkspaceTabs
                  projectId={projectId}
                  projectStatus={projectDetailQuery.data?.status ?? projectStatus}
                />
              </CardHeader>
            </Card>
          </Suspense>
        </div>
      ) : null}

      {embedMode === 'page' ? <ProjectTeamMatrix projectId={projectId} /> : null}

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

          <div className="border-t border-border/70 pt-8">
            <div className="mb-5 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-sm font-semibold tracking-tight text-foreground">
                  Indicateurs de lecture
                </h4>
                <RegistryBadge className="bg-secondary text-secondary-foreground font-normal text-[10px] uppercase tracking-wide">
                  Décision
                </RegistryBadge>
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
                  'relative overflow-hidden rounded-xl border border-border/65 bg-card p-4 shadow-sm',
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
                  'relative overflow-hidden rounded-xl border border-border/65 bg-card p-4 shadow-sm',
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
                  'relative overflow-hidden rounded-xl border border-border/65 bg-card p-4 shadow-sm',
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
                  'relative overflow-hidden rounded-xl border border-border/65 bg-card p-4 shadow-sm',
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
                      if (next === 'NOT_SET') setCopilNote('');
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
                  {copilDraft !== 'NOT_SET' ? (
                    <div className="mt-3 space-y-2">
                      {!canEdit && !copilNote.trim() ? (
                        <p className="text-xs text-muted-foreground">Aucune annotation.</p>
                      ) : (
                        <>
                          <Button
                            type="button"
                            variant={canEdit ? 'default' : 'outline'}
                            size="sm"
                            className={cn(
                              'w-full justify-between gap-2 sm:w-auto',
                              canEdit &&
                                cn(
                                  'border-transparent shadow-sm',
                                  'bg-violet-600 text-white hover:bg-violet-700 hover:text-white',
                                  'focus-visible:border-violet-500 focus-visible:ring-violet-500/35',
                                  'dark:bg-violet-500 dark:hover:bg-violet-600',
                                ),
                            )}
                            disabled={copilSaveMutation.isPending}
                            aria-expanded={copilNoteOpen}
                            onClick={() => setCopilNoteOpen((o) => !o)}
                          >
                            <span className="inline-flex items-center gap-1.5">
                              {canEdit ? <Pencil className="size-3.5 shrink-0" aria-hidden /> : null}
                              {copilNote.trim()
                                ? copilNoteOpen
                                  ? 'Masquer l’annotation'
                                  : canEdit
                                    ? 'Voir / modifier l’annotation'
                                    : 'Voir l’annotation'
                                : 'Ajouter une annotation'}
                            </span>
                            {copilNoteOpen ? (
                              <ChevronUp
                                className={cn(
                                  'size-4 shrink-0',
                                  canEdit ? 'text-white/90' : 'text-muted-foreground',
                                )}
                                aria-hidden
                              />
                            ) : (
                              <ChevronDown
                                className={cn(
                                  'size-4 shrink-0',
                                  canEdit ? 'text-white/90' : 'text-muted-foreground',
                                )}
                                aria-hidden
                              />
                            )}
                          </Button>
                          {copilNoteOpen ? (
                            <div className="space-y-1.5">
                              <Label htmlFor="copil-note" className="sr-only">
                                Annotation COPIL
                              </Label>
                              <textarea
                                id="copil-note"
                                className={textareaClass}
                                disabled={!canEdit}
                                value={copilNote}
                                onChange={(e) => setCopilNote(e.target.value)}
                                onBlur={() => {
                                  if (!canEdit || !sheet) return;
                                  saveMutation.mutate(undefined);
                                }}
                                placeholder="Précisions, conditions, contexte pour la position retenue…"
                                maxLength={4000}
                                rows={4}
                                aria-label="Annotation liée à la position COPIL"
                              />
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>
                  ) : null}
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

          <div className="border-t border-border/70 pt-8">
            <div className="mb-5 space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-semibold tracking-tight text-foreground">Arbitrage</h4>
                  <RegistryBadge className="bg-secondary text-secondary-foreground font-normal text-[10px] uppercase tracking-wide">
                    3 niveaux
                  </RegistryBadge>
                </div>
                {!sheetReadOnlyOverride ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      setSelectedSnapshotId(null);
                      setHistoryDialogOpen(true);
                    }}
                  >
                    Voir l’historique des décisions
                  </Button>
                ) : null}
              </div>
              <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">
                Métier → comité de projet → sponsor / CODIR. Statuts : proposition de projet, en préparation,
                soumis à validation, validé, refusé. Le niveau suivant s’ouvre après « Validé » sur le
                précédent. Tout changement impliquant « Validé » ou « Refusé » (y compris en sortir) ouvre une
                confirmation : en continuant, la fiche est enregistrée dans l&apos;historique des décisions.
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
                            <RegistryBadge className="h-5 border border-border px-1.5 text-[10px] text-foreground">
                              Verrouillé
                            </RegistryBadge>
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
                            const terminal = (s: ProjectArbitrationLevelStatus) =>
                              s === 'VALIDE' || s === 'REFUSE';
                            const arbitrationChangeNeedsConfirmation =
                              next !== value && (terminal(value) || terminal(next));
                            if (arbitrationChangeNeedsConfirmation) {
                              setPendingArbValidation({
                                level: i as 0 | 1 | 2,
                                next,
                                previousValue: value,
                              });
                              setSnapshotDialogOpen(true);
                              return;
                            }
                            applyArbitrationSelectChange(i as 0 | 1 | 2, next);
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
            <Score15Field
              id="bv"
              label="Valeur métier (1–5)"
              value={bv}
              onValueChange={setBv}
              disabled={!canEdit}
            />
            <Score15Field
              id="sa"
              label="Alignement stratégique (1–5)"
              value={sa}
              onValueChange={setSa}
              disabled={!canEdit}
            />
            <Score15Field
              id="us"
              label="Urgence (1–5)"
              value={us}
              onValueChange={setUs}
              disabled={!canEdit}
            />
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
              <Label>Indicateurs de réussite</Label>
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
      <Card size="sm" id="risques-projet" className="scroll-mt-20">
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
          <div className="space-y-2 border-t border-border/70 pt-4">
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

          {!sheetReadOnlyOverride ? (
            <div className="space-y-2 border-t border-border/70 pt-4">
              <p className="text-sm text-muted-foreground">
                {risksQuery.isLoading
                  ? 'Chargement du registre des risques…'
                  : `${risksQuery.data?.length ?? 0} risque(s) sur ce projet.`}{' '}
                <Link
                  href={projectRisks(projectId)}
                  className={cn(
                    buttonVariants({ variant: 'link' }),
                    'h-auto inline p-0 font-medium text-primary',
                  )}
                >
                  Ouvrir le registre des risques
                </Link>
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* F — SWOT (matrice classique 2×2) */}
      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">F. Analyse stratégique (SWOT)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="border-t border-border/70 pt-8">
            <div className="mb-5 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-sm font-semibold tracking-tight text-foreground">Matrice SWOT</h4>
                <RegistryBadge className="bg-secondary text-secondary-foreground font-normal text-[10px] uppercase tracking-wide">
                  Stratégie
                </RegistryBadge>
              </div>
              <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">
                Interne / externe × favorable / défavorable — lignes libres par quadrant.
              </p>
            </div>

            <div className="mb-3 hidden text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground sm:grid sm:grid-cols-2 sm:gap-3">
              <span className="rounded-md bg-muted/50 py-1.5">Favorable</span>
              <span className="rounded-md bg-muted/50 py-1.5">Défavorable</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div
                className={cn(
                  'relative overflow-hidden rounded-xl border border-border/65 bg-card p-4 shadow-sm',
                  'border-l-[3px] border-l-emerald-500/70',
                )}
              >
                <div className="mb-4 flex items-start gap-2">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                    <span className="text-sm font-bold tabular-nums">S</span>
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Forces
                    </p>
                    <p className="text-[10px] text-muted-foreground">Interne · favorable</p>
                  </div>
                </div>
                <Label className="sr-only">Forces — points</Label>
                <DynamicLinesField
                  lines={swS}
                  onLinesChange={setSwS}
                  canEdit={canEdit}
                  placeholder={(i) => `Atout ${i + 1}`}
                  inputClassName="border-border/70 bg-background"
                />
              </div>

              <div
                className={cn(
                  'relative overflow-hidden rounded-xl border border-border/65 bg-card p-4 shadow-sm',
                  'border-l-[3px] border-l-amber-500/70',
                )}
              >
                <div className="mb-4 flex items-start gap-2">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-800 dark:text-amber-500">
                    <span className="text-sm font-bold tabular-nums">W</span>
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Faiblesses
                    </p>
                    <p className="text-[10px] text-muted-foreground">Interne · défavorable</p>
                  </div>
                </div>
                <Label className="sr-only">Faiblesses — points</Label>
                <DynamicLinesField
                  lines={swW}
                  onLinesChange={setSwW}
                  canEdit={canEdit}
                  placeholder={(i) => `Limite ${i + 1}`}
                  inputClassName="border-border/70 bg-background"
                />
              </div>

              <div
                className={cn(
                  'relative overflow-hidden rounded-xl border border-border/65 bg-card p-4 shadow-sm',
                  'border-l-[3px] border-l-sky-500/70',
                )}
              >
                <div className="mb-4 flex items-start gap-2">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-800 dark:text-sky-400">
                    <span className="text-sm font-bold tabular-nums">O</span>
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Opportunités
                    </p>
                    <p className="text-[10px] text-muted-foreground">Externe · favorable</p>
                  </div>
                </div>
                <Label className="sr-only">Opportunités — points</Label>
                <DynamicLinesField
                  lines={swO}
                  onLinesChange={setSwO}
                  canEdit={canEdit}
                  placeholder={(i) => `Opportunité ${i + 1}`}
                  inputClassName="border-border/70 bg-background"
                />
              </div>

              <div
                className={cn(
                  'relative overflow-hidden rounded-xl border border-border/65 bg-card p-4 shadow-sm',
                  'border-l-[3px] border-l-rose-500/70',
                )}
              >
                <div className="mb-4 flex items-start gap-2">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-800 dark:text-rose-400">
                    <span className="text-sm font-bold tabular-nums">T</span>
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Menaces
                    </p>
                    <p className="text-[10px] text-muted-foreground">Externe · défavorable</p>
                  </div>
                </div>
                <Label className="sr-only">Menaces — points</Label>
                <DynamicLinesField
                  lines={swT}
                  onLinesChange={setSwT}
                  canEdit={canEdit}
                  placeholder={(i) => `Menace ${i + 1}`}
                  inputClassName="border-border/70 bg-background"
                />
              </div>
            </div>

            <p className="mt-4 text-center text-[11px] text-muted-foreground sm:hidden">
              Ligne du haut : interne · ligne du bas : externe
            </p>
          </div>
        </CardContent>
      </Card>

      {/* G — TOWS (matrice S×O / S×T / W×O / W×T) */}
      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">G. Décisions recommandées (TOWS)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="border-t border-border/70 pt-8">
            <div className="mb-5 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-sm font-semibold tracking-tight text-foreground">Matrice TOWS</h4>
                <RegistryBadge className="bg-secondary text-secondary-foreground font-normal text-[10px] uppercase tracking-wide">
                  Décision
                </RegistryBadge>
              </div>
              <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">
                Croisement forces-faiblesses (lignes) × opportunités-menaces (colonnes) — stratégies par
                quadrant, lignes libres.
              </p>
            </div>

            <div className="mb-3 hidden text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground sm:grid sm:grid-cols-2 sm:gap-3">
              <span className="rounded-md bg-muted/50 py-1.5">Opportunités (O)</span>
              <span className="rounded-md bg-muted/50 py-1.5">Menaces (T)</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div
                className={cn(
                  'relative overflow-hidden rounded-xl border border-border/65 bg-card p-4 shadow-sm',
                  'border-l-[3px] border-l-emerald-500/70',
                )}
              >
                <div className="mb-4 flex items-start gap-2">
                  <span className="flex min-h-8 min-w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 px-1 text-emerald-700 dark:text-emerald-400">
                    <span className="text-[10px] font-bold leading-none tabular-nums">SO</span>
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Accélérer
                    </p>
                    <p className="text-[10px] text-muted-foreground">S × O · offensif</p>
                  </div>
                </div>
                <Label className="sr-only">SO — actions</Label>
                <DynamicLinesField
                  lines={tSO}
                  onLinesChange={setTSO}
                  canEdit={canEdit}
                  placeholder={(i) => `Action ${i + 1}`}
                  inputClassName="border-border/70 bg-background"
                />
              </div>

              <div
                className={cn(
                  'relative overflow-hidden rounded-xl border border-border/65 bg-card p-4 shadow-sm',
                  'border-l-[3px] border-l-amber-500/70',
                )}
              >
                <div className="mb-4 flex items-start gap-2">
                  <span className="flex min-h-8 min-w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 px-1 text-amber-800 dark:text-amber-500">
                    <span className="text-[10px] font-bold leading-none tabular-nums">ST</span>
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Sécuriser
                    </p>
                    <p className="text-[10px] text-muted-foreground">S × T · diversifier / réduire l’exposition</p>
                  </div>
                </div>
                <Label className="sr-only">ST — actions</Label>
                <DynamicLinesField
                  lines={tST}
                  onLinesChange={setTST}
                  canEdit={canEdit}
                  placeholder={(i) => `Action ${i + 1}`}
                  inputClassName="border-border/70 bg-background"
                />
              </div>

              <div
                className={cn(
                  'relative overflow-hidden rounded-xl border border-border/65 bg-card p-4 shadow-sm',
                  'border-l-[3px] border-l-sky-500/70',
                )}
              >
                <div className="mb-4 flex items-start gap-2">
                  <span className="flex min-h-8 min-w-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 px-1 text-sky-800 dark:text-sky-400">
                    <span className="text-[10px] font-bold leading-none tabular-nums">WO</span>
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Corriger
                    </p>
                    <p className="text-[10px] text-muted-foreground">W × O · renforcer / pivoter</p>
                  </div>
                </div>
                <Label className="sr-only">WO — actions</Label>
                <DynamicLinesField
                  lines={tWO}
                  onLinesChange={setTWO}
                  canEdit={canEdit}
                  placeholder={(i) => `Action ${i + 1}`}
                  inputClassName="border-border/70 bg-background"
                />
              </div>

              <div
                className={cn(
                  'relative overflow-hidden rounded-xl border border-border/65 bg-card p-4 shadow-sm',
                  'border-l-[3px] border-l-rose-500/70',
                )}
              >
                <div className="mb-4 flex items-start gap-2">
                  <span className="flex min-h-8 min-w-8 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 px-1 text-rose-800 dark:text-rose-400">
                    <span className="text-[10px] font-bold leading-none tabular-nums">WT</span>
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Réduire / stopper
                    </p>
                    <p className="text-[10px] text-muted-foreground">W × T · défensif</p>
                  </div>
                </div>
                <Label className="sr-only">WT — actions</Label>
                <DynamicLinesField
                  lines={tWT}
                  onLinesChange={setTWT}
                  canEdit={canEdit}
                  placeholder={(i) => `Action ${i + 1}`}
                  inputClassName="border-border/70 bg-background"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center text-[11px] text-muted-foreground sm:justify-between">
              <span className="sm:hidden">Haut : ligne S (forces) · bas : ligne W (faiblesses)</span>
              <span className="hidden sm:inline">
                Ligne du haut : stratégies à partir des forces · ligne du bas : à partir des faiblesses
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {!sheetReadOnlyOverride ? (
      <>
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
                      <RegistryBadge className="mt-2 border border-border text-xs text-foreground">
                        {MILESTONE_STATUS_LABEL[m.status] ?? m.status}
                      </RegistryBadge>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
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

      {/* I — Scénarios (variantes / baseline) */}
      <Card size="sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Split className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            I. Scénarios
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Variantes de plan possibles et baseline — arbitrage budgétaire et capacité ; accès détaillé depuis
            la liste ou le cockpit.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {scenariosQuery.isLoading ? (
            <LoadingState rows={3} />
          ) : scenariosSorted.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun scénario — créez des variantes depuis l’onglet Scénarios du projet pour comparer les
              options et fixer une baseline.
            </p>
          ) : (
            <ul className="divide-y divide-border/60 rounded-lg border border-border/60 bg-muted/10">
              {scenariosSorted.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-col gap-3 border-border/60 py-3 pl-3 pr-3 sm:flex-row sm:items-center sm:gap-4 sm:py-2.5 sm:pl-4 sm:pr-3"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium leading-snug text-foreground">{s.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {s.code ? `Code ${s.code}` : 'Code non renseigné'} · v{s.version}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                      {s.status === 'SELECTED' || s.isBaseline ? (
                        <RegistryBadge className="border border-emerald-500/35 bg-emerald-500/10 text-xs text-emerald-900 dark:text-emerald-300">
                          Baseline
                        </RegistryBadge>
                      ) : (
                        <RegistryBadge
                          className={cn(
                            'border text-xs',
                            s.status === 'ARCHIVED'
                              ? 'border-border/70 bg-muted text-muted-foreground'
                              : 'border-sky-500/40 bg-sky-500/10 text-sky-900 dark:text-sky-300',
                          )}
                        >
                          {s.status}
                        </RegistryBadge>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:max-w-[min(100%,20rem)]">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => setScenarioWorkspaceModal({ id: s.id, mode: 'view' })}
                    >
                      <Eye className="size-4 shrink-0" aria-hidden />
                      Visualisation
                    </Button>
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      className="gap-1.5"
                      disabled={!canAddScenarioOnSheet}
                      title={
                        canAddScenarioOnSheet
                          ? undefined
                          : 'Modification : projet en lecture seule ou hors brouillon.'
                      }
                      onClick={() => setScenarioWorkspaceModal({ id: s.id, mode: 'edit' })}
                    >
                      <Pencil className="size-4 shrink-0" aria-hidden />
                      Modification
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Gestion complète (création, sélection baseline, archivage) dans l’espace Scénarios.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={projectScenarios(projectId)}
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
              >
                Liste scénarios
              </Link>
              <Link
                href={projectScenarioCockpit(projectId)}
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
              >
                Cockpit comparaison
              </Link>
              {canAddScenarioOnSheet ? (
                <Button
                  type="button"
                  size="sm"
                  disabled={scenariosMutationPending}
                  title={
                    scenariosMutationPending
                      ? 'Création en cours…'
                      : 'Créer un nouveau scénario sur ce projet'
                  }
                  className={cn(
                    'gap-1.5 border-violet-600 bg-violet-600 text-white shadow-sm',
                    'hover:bg-violet-700 dark:border-violet-600 dark:bg-violet-600 dark:hover:bg-violet-700',
                    'focus-visible:ring-violet-500/40',
                  )}
                  onClick={() => setCreateScenarioOpen(true)}
                >
                  <Plus className="size-4 shrink-0" aria-hidden />
                  Ajouter un scénario
                </Button>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <CreateScenarioDialog
        open={createScenarioOpen}
        onOpenChange={setCreateScenarioOpen}
        disabled={!canAddScenarioOnSheet || scenariosMutationPending}
        onSubmit={async (payload) => {
          await createMutation.mutateAsync(payload);
          setCreateScenarioOpen(false);
        }}
      />

      <Dialog
        open={scenarioWorkspaceModal !== null}
        onOpenChange={(open) => {
          if (!open) setScenarioWorkspaceModal(null);
        }}
      >
        <DialogContent
          className={cn(
            'flex max-h-[min(92vh,900px)] w-[min(96vw,1200px)] max-w-[min(96vw,1200px)] flex-col gap-0 overflow-hidden p-0',
            'border-border/60 bg-background shadow-2xl ring-1 ring-black/[0.06] sm:max-w-[min(96vw,1200px)]',
            'dark:ring-white/[0.08]',
          )}
          showCloseButton
        >
          <div className="sr-only">
            <DialogTitle>Détail scénario</DialogTitle>
            <DialogDescription>
              Édition et synthèses du scénario ouvert depuis la fiche projet.
            </DialogDescription>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="shrink-0 border-b border-border/50 bg-background/80 px-4 py-3 backdrop-blur-md sm:px-6 sm:py-3.5 sm:pr-14">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Workspace scénario
              </p>
              <p className="mt-0.5 text-sm text-foreground/90">Fiche projet — aperçu rapide</p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-4 sm:px-6 sm:pb-7 sm:pr-14 sm:pt-5">
              {scenarioWorkspaceModal ? (
                <ScenarioWorkspacePage
                  projectId={projectId}
                  scenarioId={scenarioWorkspaceModal.id}
                  embedded
                  embedForceReadOnly={scenarioWorkspaceModal.mode === 'view'}
                  onEmbeddedDismiss={() => setScenarioWorkspaceModal(null)}
                />
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ProjectDocumentsSection projectId={projectId} />
      </>
      ) : null}

      {embedMode === 'page' ? (
        <>
          <Dialog
            open={snapshotDialogOpen}
            onOpenChange={(open) => {
              if (!open) {
                setSnapshotDialogOpen(false);
                setPendingArbValidation(null);
              }
            }}
          >
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Confirmer la décision</DialogTitle>
                <DialogDescription>
                  <span className="block space-y-2">
                    <span className="block">
                      Changement : « {LEVEL_STATUS_LABEL[pendingArbValidation?.previousValue ?? 'BROUILLON']} » → «{' '}
                      {LEVEL_STATUS_LABEL[pendingArbValidation?.next ?? 'BROUILLON']} » pour ce niveau
                      d&apos;arbitrage.
                    </span>
                    <span className="block">
                      La version actuelle de la fiche sera ajoutée à l&apos;historique des décisions.
                      Souhaitez-vous continuer ?
                    </span>
                  </span>
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSnapshotDialogOpen(false);
                    setPendingArbValidation(null);
                  }}
                >
                  Annuler
                </Button>
                <Button type="button" onClick={confirmPendingArbitrationDecision}>
                  Continuer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog
            open={historyDialogOpen}
            onOpenChange={(open) => {
              setHistoryDialogOpen(open);
              if (!open && !snapshotSheetViewerOpen) {
                setSelectedSnapshotId(null);
              }
            }}
          >
            <DialogContent className="max-h-[min(90vh,720px)] w-[75vw] max-w-[75vw] overflow-hidden sm:max-w-[75vw]">
              <DialogHeader>
                <DialogTitle>Historique des décisions</DialogTitle>
                <DialogDescription>
                  Snapshots lors d&apos;un changement de statut impliquant « Validé » ou « Refusé » (entrée ou
                  sortie). Sélectionnez une entrée pour ouvrir la fiche complète en lecture seule.
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-[min(60vh,480px)] space-y-2 overflow-y-auto">
                {snapshotsListQuery.isLoading ? (
                  <p className="text-sm text-muted-foreground">Chargement…</p>
                ) : snapshotsListQuery.isError ? (
                  <p className="text-sm text-destructive">Impossible de charger la liste.</p>
                ) : (snapshotsListQuery.data?.items.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun snapshot enregistré.</p>
                ) : (
                  <ul className="space-y-1">
                    {snapshotsListQuery.data?.items.map((row) => (
                      <li key={row.id}>
                        <button
                          type="button"
                          className={cn(
                            'w-full rounded-lg border px-3 py-2.5 text-left text-xs transition-colors',
                            'border-border/70 hover:bg-muted/40',
                          )}
                          onClick={() => {
                            setSelectedSnapshotId(row.id);
                            setSnapshotSheetViewerOpen(true);
                            setHistoryDialogOpen(false);
                          }}
                        >
                          <span className="font-semibold text-foreground">
                            {DECISION_LEVEL_LABEL[row.decisionLevel] ?? row.decisionLevel}
                          </span>
                          <span className="mt-1 block text-[11px] leading-snug text-muted-foreground">
                            {formatSnapshotHistoryDate(row.createdAt)}
                          </span>
                          {row.createdByDisplayName ? (
                            <span className="mt-0.5 block text-[11px] text-muted-foreground">
                              Par {row.createdByDisplayName}
                            </span>
                          ) : (
                            <span className="mt-0.5 block text-[11px] italic text-muted-foreground/85">
                              Auteur inconnu
                            </span>
                          )}
                          <span className="mt-1 block text-[10px] leading-snug text-muted-foreground/70">
                            Réf.{' '}
                            {(sheet?.name?.trim()
                              ? sheet.name
                              : sheet?.code?.trim()) ?? '—'}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog
            open={snapshotSheetViewerOpen && !!selectedSnapshotId}
            onOpenChange={(open) => {
              if (!open) {
                setSnapshotSheetViewerOpen(false);
                setSelectedSnapshotId(null);
              }
            }}
          >
            <DialogContent className="flex max-h-[92vh] w-[75vw] max-w-[75vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-[75vw]">
              <DialogHeader className="shrink-0 space-y-1 border-b border-border/60 px-6 py-4">
                <DialogTitle>Fiche projet — version historisée</DialogTitle>
                <DialogDescription>
                  {snapshotDetailQuery.data ? (
                    <span className="block space-y-0.5">
                      <span className="block">
                        {DECISION_LEVEL_LABEL[snapshotDetailQuery.data.decisionLevel] ??
                          snapshotDetailQuery.data.decisionLevel}{' '}
                        · {formatSnapshotHistoryDate(snapshotDetailQuery.data.createdAt)}
                      </span>
                      {snapshotDetailQuery.data.createdByDisplayName ? (
                        <span className="block text-muted-foreground">
                          Par {snapshotDetailQuery.data.createdByDisplayName}
                        </span>
                      ) : null}
                      <span className="block text-muted-foreground">Lecture seule.</span>
                    </span>
                  ) : (
                    'Chargement…'
                  )}
                </DialogDescription>
              </DialogHeader>
              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-2 sm:px-6">
                {snapshotDetailQuery.isLoading ? (
                  <LoadingState rows={10} />
                ) : snapshotDetailQuery.isError || !snapshotDetailQuery.data ? (
                  <p className="text-sm text-destructive">Impossible d&apos;afficher cette version.</p>
                ) : (
                  <ProjectSheetView
                    key={selectedSnapshotId}
                    projectId={projectId}
                    embedMode="snapshotModal"
                    sheetReadOnlyOverride={mapAuditPayloadToProjectSheet(
                      { id: sheet.id, code: sheet.code, kind: sheet.kind },
                      snapshotDetailQuery.data.sheetPayload,
                    )}
                  />
                )}
              </div>
            </DialogContent>
          </Dialog>

          <ProjectRetroplanMacroDialog
            projectId={projectId}
            defaultAnchorDate={sheet.targetEndDate}
            open={retroplanOpen}
            onOpenChange={setRetroplanOpen}
          />
        </>
      ) : null}

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
