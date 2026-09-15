'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  Archive,
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileText,
  FileUp,
  GitBranch,
  LayoutGrid,
  Pencil,
  Plus,
  Printer,
  Share2,
  SquareKanban,
  Target,
  Trash2,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LoadingState } from '@/components/feedback/loading-state';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { displayLabel, firstDisplayLabel } from '@/lib/display-label';
import { toast } from '@/lib/toast';
import { usePermissions } from '@/hooks/use-permissions';
import { StrategicDirectionCreateEditDialog } from '@/features/strategic-vision/components/strategic-direction-create-edit-dialog';
import {
  axisDisplayTitle,
  StrategicAxisNameLabel,
} from '@/features/strategic-vision/components/strategic-axis-name-label';
import type { StrategicDirectionDto } from '@/features/strategic-vision/types/strategic-vision.types';
import { StrategyDocumentPicker } from './strategy-document-picker';
import { StrategyBlockImagePreview } from './strategy-block-image-preview';
import { StrategyBlockDocumentPreview } from './strategy-block-document-preview';
import { HumanResourceCombobox } from '@/features/teams/work-teams/components/human-resource-combobox';
import { humanResourceLeadLabel } from '@/features/teams/work-teams/components/work-team-lead-combobox';
import {
  useArchiveStrategicDirectionStrategyMutation,
  useReviewStrategicDirectionStrategyMutation,
  useReplaceStrategicDirectionStrategyAxesMutation,
  useStrategicDirectionOptionsQuery,
  useStrategicDirectionStrategyDetailQuery,
  useStrategicDirectionStrategyLinksQuery,
  useStrategicDirectionStrategySchemaMetricsQuery,
  useStrategicDirectionStrategyValidatorOptionsQuery,
  useStrategicDirectionStrategyVersionsQuery,
  useStrategicDirectionStrategyWorkflowSettingsQuery,
  useSubmitStrategicDirectionStrategyMutation,
  useUpdateStrategicDirectionStrategyMutation,
} from '../hooks/use-strategic-direction-strategy-queries';
import { resolveSchemaActionCaps } from '../lib/schema-action-caps';
import {
  getStrategicDirectionStrategyStatusLabel,
  STRATEGIC_DIRECTION_STRATEGY_APPROVE_LABEL,
  STRATEGIC_DIRECTION_STRATEGY_REJECT_LABEL,
  STRATEGIC_DIRECTION_STRATEGY_SUBMIT_LABEL,
} from '../lib/strategic-direction-strategy-labels';
import {
  contribFillColor,
  computeOkrProgressPct,
  formatEurCents,
  formatOkrValueWithUnit,
  formatReviewDate,
  MATURITY_DIMS,
  progressFillColor,
  stgBarPct,
  stgPersonName,
  stgQuarterLabel,
  stgTone,
} from '../lib/strategie-ui';
import type {
  StrategyContentBlock,
  StrategyInitiative,
  StrategyKpi,
  StrategyOutcome,
  StrategyOwnAxis,
  StrategyRisk,
  StrategySchemaNormalized,
} from '../types/strategic-direction-strategy.types';
import '../styles/strategie.css';

const TABS = [
  { id: 'axes', label: 'Axes stratégiques' },
  { id: 'objectifs', label: 'Objectifs' },
  { id: 'alignement', label: 'Alignement' },
  { id: 'alertes', label: 'Alertes' },
  { id: 'historique', label: 'Historique' },
] as const;

type TabId = (typeof TABS)[number]['id'];

const AXIS_TONES = [
  { value: 'info', label: 'Bleu' },
  { value: 'gold', label: 'Or' },
  { value: 'purple', label: 'Violet' },
  { value: 'teal', label: 'Teal' },
] as const;

const TIMELINE_LANE_TONES = ['info', 'purple', 'gold', 'teal', 'success'] as const;

function isTabId(v: string | null): v is TabId {
  return TABS.some((t) => t.id === v);
}

function strategyStatusBadgeClass(status: string): string {
  switch (status) {
    case 'APPROVED':
      return 'bdg-success';
    case 'SUBMITTED':
      return 'bdg-warn';
    case 'REJECTED':
      return 'bdg-danger';
    case 'ARCHIVED':
      return 'bdg-neutral';
    default:
      return 'bdg-neutral';
  }
}

/** Options trimestre pour fenêtre chantier / jalons (mock STG). */
function quarterOptions(startYear: number, yearCount: number) {
  const n = Math.max(1, yearCount) * 12;
  const opts: Array<{ value: number; label: string }> = [];
  for (let m = 0; m < n; m += 3) {
    opts.push({ value: m, label: stgQuarterLabel(m, startYear) });
  }
  return opts;
}

function snapToQuarter(monthOffset: number): number {
  return Math.max(0, Math.floor(monthOffset / 3) * 3);
}

function ScoreRingLarge({ score, color }: { score: number; color: string }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - score / 100);
  return (
    <div className="stg-ring" style={{ width: 72, height: 72 }} aria-label={`Alignement ${score} %`}>
      <svg width="72" height="72" viewBox="0 0 52 52" style={{ width: 72, height: 72 }} aria-hidden>
        <circle cx="26" cy="26" r={r} fill="none" stroke="var(--neutral-200)" strokeWidth="6" />
        <circle
          cx="26"
          cy="26"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c.toFixed(1)}
          strokeDashoffset={offset.toFixed(1)}
          transform="rotate(-90 26 26)"
        />
      </svg>
      <div
        className="stg-ring-v"
        style={{ color, fontSize: 17, flexDirection: 'column' }}
      >
        <div>{score}</div>
        <div
          style={{
            fontSize: 8.5,
            fontWeight: 700,
            color: 'var(--neutral-500)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          align.
        </div>
      </div>
    </div>
  );
}

function emptyInitiative(lane = 0): StrategyInitiative {
  return {
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `init-${Date.now()}`,
    title: '',
    description: '',
    ownerLabel: '',
    budgetCents: 0,
    progressPct: 0,
    lane,
    startMonthOffset: 0,
    endMonthOffset: 11,
    strategicAxisIds: [],
    milestones: [],
    linkedProjectNames: [],
  };
}

function emptyOutcome(): StrategyOutcome {
  return {
    title: '',
    ownerLabel: '',
    target: '',
    current: '',
    unit: '',
    progressPct: 0,
  };
}

function emptyBlock(): StrategyContentBlock {
  return { kind: 'text', title: '', body: '', documentId: null };
}

function emptyRisk(): StrategyRisk {
  return {
    name: '',
    probability: '',
    impact: '',
    ownerLabel: '',
    level: 'warning',
    mitigation: '',
  };
}

function emptyOwnAxis(): StrategyOwnAxis {
  return {
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `axis-${Date.now()}`,
    name: '',
    tone: 'info',
  };
}

function emptyKpi(): StrategyKpi {
  return { label: '', value: '', detail: '' };
}

function outcomeToKpi(outcome: StrategyOutcome): StrategyKpi {
  const unit = outcome.unit.trim();
  const current = outcome.current.trim();
  const target = outcome.target.trim();
  const value =
    current ||
    (target ? `cible ${target}` : '') ||
    (outcome.progressPct > 0 ? `${outcome.progressPct} %` : '—');
  const detailParts = [
    target && current ? `cible ${target}${unit ? ` ${unit}` : ''}` : unit || '',
    outcome.progressPct > 0 ? `${outcome.progressPct} %` : '',
  ].filter(Boolean);
  return {
    label: outcome.title.trim(),
    value,
    detail: detailParts.join(' · '),
    linkedFromOutcome: true,
  };
}

function kpiLabelKey(label: string): string {
  return label.trim().toLowerCase();
}

/** Met à jour le KPI déjà en bande (lié ou même libellé) — ne crée pas. */
function upsertLinkedKpiFromOutcome(
  kpis: StrategyKpi[],
  matchKeys: string[],
  outcome: StrategyOutcome,
): StrategyKpi[] {
  const next = outcomeToKpi(outcome);
  const keys = [...new Set(matchKeys.map(kpiLabelKey).filter(Boolean))];
  if (keys.length === 0) return kpis;
  const linkedIdx = kpis.findIndex(
    (k) => k.linkedFromOutcome === true && keys.includes(kpiLabelKey(k.label)),
  );
  const sameLabelIdx = kpis.findIndex((k) => keys.includes(kpiLabelKey(k.label)));
  const targetIdx = linkedIdx >= 0 ? linkedIdx : sameLabelIdx;
  if (targetIdx < 0) return kpis;
  const list = [...kpis];
  list[targetIdx] = next;
  return list;
}

function removeLinkedKpisForKeys(kpis: StrategyKpi[], matchKeys: string[]): StrategyKpi[] {
  const keys = new Set(matchKeys.map(kpiLabelKey).filter(Boolean));
  if (keys.size === 0) return kpis;
  return kpis.filter((k) => {
    const key = kpiLabelKey(k.label);
    if (!keys.has(key)) return true;
    // KPI poussé depuis l’objectif (flag) ou même libellé (promotions antérieures)
    return false;
  });
}

/** Affichage live : si le libellé KPI = titre d’un objectif, on affiche les valeurs de l’objectif. */
function resolveDisplayKpis(
  kpis: StrategyKpi[],
  outcomes: StrategyOutcome[],
): StrategyKpi[] {
  const byKey = new Map(outcomes.map((o) => [kpiLabelKey(o.title), o]));
  return kpis.map((k) => {
    const outcome = byKey.get(kpiLabelKey(k.label));
    return outcome ? outcomeToKpi(outcome) : k;
  });
}

type Props = { strategyId: string };

export function StrategicDirectionSchemaPage({ strategyId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tab: TabId = isTabId(tabParam) ? tabParam : 'axes';

  const { has } = usePermissions();
  const canReview = has('strategic_direction_strategy.review');
  const canManageDirection =
    has('strategic_vision.update') || has('strategic_vision.manage_directions');

  const detailQ = useStrategicDirectionStrategyDetailQuery(strategyId);
  const canUpdateStrategyFlag =
    has('strategic_direction_strategy.update') ||
    Boolean(detailQ.data?.canUpdateStrategy);
  const canCreate =
    has('strategic_direction_strategy.create') ||
    Boolean(detailQ.data?.canCreateStrategy);
  const actionCaps = useMemo(
    () =>
      resolveSchemaActionCaps({
        status: detailQ.data?.status,
        canUpdateStrategy: canUpdateStrategyFlag,
        canCreateStrategy: canCreate,
        isSponsor: detailQ.data?.isSponsor,
        hasReview: canReview,
        hasManageDirection: canManageDirection,
        canEditContent: detailQ.data?.canEditContent,
        canSubmit: detailQ.data?.canSubmit,
        canAdaptVersion: detailQ.data?.canAdaptVersion,
        canArchive: detailQ.data?.canArchive,
      }),
    [
      detailQ.data?.status,
      detailQ.data?.isSponsor,
      detailQ.data?.canEditContent,
      detailQ.data?.canSubmit,
      detailQ.data?.canAdaptVersion,
      detailQ.data?.canArchive,
      canUpdateStrategyFlag,
      canCreate,
      canReview,
      canManageDirection,
    ],
  );
  const {
    canEditContent,
    canSubmit,
    canDecide,
    canAdaptVersion,
    canArchive,
    showReviewEntry,
    canShare,
    canExport,
  } = actionCaps;
  /** Alias édition contenu (gelé hors DRAFT|REJECTED). */
  const canUpdate = canEditContent;
  const metricsQ = useStrategicDirectionStrategySchemaMetricsQuery(strategyId);
  const versionsQ = useStrategicDirectionStrategyVersionsQuery(strategyId);
  const linksQ = useStrategicDirectionStrategyLinksQuery(strategyId);
  const directionsQ = useStrategicDirectionOptionsQuery({
    enabled: canManageDirection,
  });
  const workflowQ = useStrategicDirectionStrategyWorkflowSettingsQuery({
    enabled: canSubmit || canCreate || canAdaptVersion,
  });
  const validatorsQ = useStrategicDirectionStrategyValidatorOptionsQuery({
    enabled: canSubmit || canCreate,
  });

  const updateMutation = useUpdateStrategicDirectionStrategyMutation();
  const submitMutation = useSubmitStrategicDirectionStrategyMutation();
  const reviewMutation = useReviewStrategicDirectionStrategyMutation();
  const archiveMutation = useArchiveStrategicDirectionStrategyMutation();
  const replaceAxesMutation = useReplaceStrategicDirectionStrategyAxesMutation();

  const [editOpen, setEditOpen] = useState(false);
  const [directionEditOpen, setDirectionEditOpen] = useState(false);
  const [adaptOpen, setAdaptOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [adaptReason, setAdaptReason] = useState('');
  const [archiveReasonDraft, setArchiveReasonDraft] = useState('');
  const [ambitionDraft, setAmbitionDraft] = useState('');
  const [contextDraft, setContextDraft] = useState('');
  const [horizonDraft, setHorizonDraft] = useState('');
  const [ownerDraft, setOwnerDraft] = useState('');

  const [initiativeOpen, setInitiativeOpen] = useState(false);
  const [initiativeDraft, setInitiativeDraft] = useState<StrategyInitiative>(emptyInitiative());
  const [editingInitiativeId, setEditingInitiativeId] = useState<string | null>(null);

  const [okrOpen, setOkrOpen] = useState(false);
  const [okrDraft, setOkrDraft] = useState<StrategyOutcome>(emptyOutcome());
  const [okrOwnerResourceId, setOkrOwnerResourceId] = useState('');
  const [editingOkrIndex, setEditingOkrIndex] = useState<number | null>(null);

  const [blockOpen, setBlockOpen] = useState(false);
  const [blockDraft, setBlockDraft] = useState<StrategyContentBlock>(emptyBlock());
  const [editingBlockIndex, setEditingBlockIndex] = useState<number | null>(null);

  const [riskOpen, setRiskOpen] = useState(false);
  const [riskDraft, setRiskDraft] = useState<StrategyRisk>(emptyRisk());
  const [editingRiskIndex, setEditingRiskIndex] = useState<number | null>(null);

  const [contribDraft, setContribDraft] = useState<Record<string, number>>({});
  const [budgetDraft, setBudgetDraft] = useState<Record<string, string>>({});

  const [axisOpen, setAxisOpen] = useState(false);
  const [axisDraft, setAxisDraft] = useState<StrategyOwnAxis>(emptyOwnAxis());
  const [editingAxisIndex, setEditingAxisIndex] = useState<number | null>(null);

  const [kpiOpen, setKpiOpen] = useState(false);
  const [kpiDraft, setKpiDraft] = useState<StrategyKpi>(emptyKpi());
  const [editingKpiIndex, setEditingKpiIndex] = useState<number | null>(null);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [submitValidatorUserId, setSubmitValidatorUserId] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [reviewInstanceLabel, setReviewInstanceLabel] = useState('CODIR');
  const [decisionNote, setDecisionNote] = useState('');

  const strategy = detailQ.data;
  const schema: StrategySchemaNormalized | null = strategy?.schema ?? null;
  const metrics = metricsQ.data;
  const T = stgTone(strategy?.direction?.accentTone);
  const score = metrics?.score ?? 0;

  useEffect(() => {
    if (!schema) return;
    setContribDraft({ ...schema.axisContributions });
    const bd: Record<string, string> = {};
    for (const [y, cents] of Object.entries(schema.budgetsByYear)) {
      bd[y] = String(Math.round((cents ?? 0) / 100_000) || '');
    }
    // assurer 3 années horizon
    const y0 = schema.horizonStartYear;
    for (let i = 0; i < schema.horizonYearCount; i++) {
      const y = String(y0 + i);
      if (!(y in bd)) bd[y] = '';
    }
    setBudgetDraft(bd);
  }, [schema]);

  const qOpts = useMemo(
    () =>
      quarterOptions(
        schema?.horizonStartYear ?? 2026,
        schema?.horizonYearCount ?? 3,
      ),
    [schema?.horizonStartYear, schema?.horizonYearCount],
  );

  const setTab = (next: TabId) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === 'axes') params.delete('tab');
    else params.set('tab', next);
    const q = params.toString();
    router.replace(
      q
        ? `/strategic-direction-strategy/${strategyId}?${q}`
        : `/strategic-direction-strategy/${strategyId}`,
    );
  };

  const openEdit = () => {
    if (!strategy) return;
    setAmbitionDraft(strategy.ambition ?? '');
    setContextDraft(strategy.context ?? '');
    setHorizonDraft(strategy.horizonLabel ?? '');
    setOwnerDraft(stgPersonName(strategy.ownerLabel) ?? strategy.ownerLabel ?? '');
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!strategy) return;
    try {
      await updateMutation.mutateAsync({
        strategyId: strategy.id,
        body: {
          ambition: ambitionDraft.trim(),
          context: contextDraft.trim(),
          horizonLabel: horizonDraft.trim() || strategy.horizonLabel,
          statement: ambitionDraft.trim() || strategy.statement,
          ownerLabel:
            (stgPersonName(ownerDraft.trim()) ?? ownerDraft.trim()) || undefined,
        },
      });
      toast.success('Schéma directeur mis à jour.');
      setEditOpen(false);
    } catch (e) {
      const msg =
        typeof e === 'object' && e && 'message' in e && typeof (e as { message: unknown }).message === 'string'
          ? (e as { message: string }).message
          : 'Enregistrement impossible.';
      toast.error(msg);
    }
  };

  const patchInitiatives = async (next: StrategyInitiative[]) => {
    if (!strategy || !schema) return;
    await updateMutation.mutateAsync({
      strategyId: strategy.id,
      body: {
        majorInitiatives: next as unknown as Array<Record<string, unknown>>,
      },
    });
  };

  const patchOutcomes = async (next: StrategyOutcome[]) => {
    if (!strategy) return;
    await updateMutation.mutateAsync({
      strategyId: strategy.id,
      body: {
        expectedOutcomes: next as unknown as Array<Record<string, unknown>>,
      },
    });
  };

  const patchBlocks = async (next: StrategyContentBlock[]) => {
    if (!strategy) return;
    await updateMutation.mutateAsync({
      strategyId: strategy.id,
      body: {
        contentBlocks: next as unknown as Array<Record<string, unknown>>,
      },
    });
  };

  const patchRisks = async (next: StrategyRisk[]) => {
    if (!strategy) return;
    await updateMutation.mutateAsync({
      strategyId: strategy.id,
      body: {
        risks: next as unknown as Array<Record<string, unknown>>,
      },
    });
  };

  const openInitiative = (init?: StrategyInitiative) => {
    if (init) {
      setEditingInitiativeId(init.id);
      setInitiativeDraft({
        ...init,
        startMonthOffset: snapToQuarter(init.startMonthOffset),
        endMonthOffset: snapToQuarter(init.endMonthOffset),
        milestones: (init.milestones ?? []).map((m) => ({
          ...m,
          monthOffset: snapToQuarter(m.monthOffset),
        })),
        strategicAxisIds: [...(init.strategicAxisIds ?? [])],
      });
    } else {
      setEditingInitiativeId(null);
      setInitiativeDraft(emptyInitiative(0));
    }
    setInitiativeOpen(true);
  };

  const saveInitiative = async () => {
    if (!schema) return;
    const title = initiativeDraft.title.trim();
    if (!title) {
      toast.error('Intitulé du chantier requis.');
      return;
    }
    if (initiativeDraft.endMonthOffset <= initiativeDraft.startMonthOffset) {
      toast.error('La fin doit être postérieure au début.');
      return;
    }
    const list = [...schema.majorInitiatives];
    const payload = {
      ...initiativeDraft,
      title,
      milestones: (initiativeDraft.milestones ?? []).filter((m) => m.label.trim()),
    };
    if (editingInitiativeId) {
      const idx = list.findIndex((i) => i.id === editingInitiativeId);
      if (idx >= 0) list[idx] = payload;
      else list.push(payload);
    } else {
      list.push(payload);
    }
    try {
      const linkedIds = (linksQ.data?.axes ?? []).map((a) => a.id);
      const selectedAxisIds = payload.strategicAxisIds ?? [];
      const nextLinked = [...new Set([...linkedIds, ...selectedAxisIds])];
      if (
        canUpdate &&
        selectedAxisIds.length > 0 &&
        nextLinked.length !== linkedIds.length
      ) {
        await replaceAxesMutation.mutateAsync({
          strategyId,
          strategicAxisIds: nextLinked,
        });
      }
      await patchInitiatives(list);
      toast.success(editingInitiativeId ? 'Chantier mis à jour.' : 'Chantier ajouté.');
      setInitiativeOpen(false);
    } catch (e) {
      const msg =
        typeof e === 'object' && e && 'message' in e && typeof (e as { message: unknown }).message === 'string'
          ? (e as { message: string }).message
          : 'Enregistrement impossible.';
      toast.error(msg);
    }
  };

  const deleteInitiative = async () => {
    if (!schema || !editingInitiativeId) return;
    const list = schema.majorInitiatives.filter((i) => i.id !== editingInitiativeId);
    try {
      await patchInitiatives(list);
      toast.success('Chantier supprimé.');
      setInitiativeOpen(false);
    } catch (e) {
      const msg =
        typeof e === 'object' && e && 'message' in e && typeof (e as { message: unknown }).message === 'string'
          ? (e as { message: string }).message
          : 'Suppression impossible.';
      toast.error(msg);
    }
  };

  const openOkr = (outcome?: StrategyOutcome, index?: number) => {
    if (outcome && index != null) {
      setEditingOkrIndex(index);
      const owner =
        outcome.ownerLabel.trim() === '—' || outcome.ownerLabel.trim() === '-'
          ? ''
          : outcome.ownerLabel;
      const draft = {
        ...outcome,
        ownerLabel: owner,
        unit: typeof outcome.unit === 'string' ? outcome.unit : '',
      };
      const auto = computeOkrProgressPct(draft.current, draft.target);
      setOkrDraft(auto == null ? draft : { ...draft, progressPct: auto });
    } else {
      setEditingOkrIndex(null);
      setOkrDraft(emptyOutcome());
    }
    setOkrOwnerResourceId('');
    setOkrOpen(true);
  };

  const saveOkr = async () => {
    if (!schema || !strategy) return;
    const title = okrDraft.title.trim();
    if (!title) {
      toast.error('Objectif requis.');
      return;
    }
    const list = [...schema.expectedOutcomes];
    const ownerLabel =
      okrDraft.ownerLabel.trim() === '—' || okrDraft.ownerLabel.trim() === '-'
        ? ''
        : okrDraft.ownerLabel.trim();
    const payload = {
      ...okrDraft,
      title,
      ownerLabel,
      unit: okrDraft.unit.trim(),
    };
    const previousTitle =
      editingOkrIndex != null && editingOkrIndex >= 0
        ? schema.expectedOutcomes[editingOkrIndex]?.title
        : undefined;
    if (editingOkrIndex != null && editingOkrIndex >= 0) list[editingOkrIndex] = payload;
    else list.push(payload);

    const matchKeys = [previousTitle ?? '', title].filter(Boolean);
    const nextKpis = upsertLinkedKpiFromOutcome(schema.kpis, matchKeys, payload);

    try {
      await updateMutation.mutateAsync({
        strategyId: strategy.id,
        body: {
          expectedOutcomes: list as unknown as Array<Record<string, unknown>>,
          kpis: nextKpis as unknown as Array<Record<string, unknown>>,
        },
      });
      toast.success(editingOkrIndex != null ? 'Objectif mis à jour.' : 'Objectif ajouté.');
      setOkrOpen(false);
    } catch (e) {
      const msg =
        typeof e === 'object' && e && 'message' in e && typeof (e as { message: unknown }).message === 'string'
          ? (e as { message: string }).message
          : 'Enregistrement impossible.';
      toast.error(msg);
    }
  };

  const deleteOkr = async () => {
    if (!schema || editingOkrIndex == null) return;
    await deleteOkrAt(editingOkrIndex);
  };

  const deleteOkrAt = async (index: number) => {
    if (!schema || !strategy) return;
    const removed = schema.expectedOutcomes[index];
    const list = schema.expectedOutcomes.filter((_, i) => i !== index);
    const nextKpis = removeLinkedKpisForKeys(schema.kpis, [removed?.title ?? '']);
    try {
      await updateMutation.mutateAsync({
        strategyId: strategy.id,
        body: {
          expectedOutcomes: list as unknown as Array<Record<string, unknown>>,
          kpis: nextKpis as unknown as Array<Record<string, unknown>>,
        },
      });
      toast.success('Objectif supprimé.');
      setOkrOpen(false);
      setEditingOkrIndex(null);
    } catch (e) {
      const msg =
        typeof e === 'object' && e && 'message' in e && typeof (e as { message: unknown }).message === 'string'
          ? (e as { message: string }).message
          : 'Suppression impossible.';
      toast.error(msg);
    }
  };

  const promoteOutcomeToKpi = async (outcome: StrategyOutcome) => {
    if (!schema) return;
    const title = outcome.title.trim();
    if (!title) {
      toast.error('Objectif sans libellé — impossible de l’afficher en bande KPI.');
      return;
    }
    const nextKpi = outcomeToKpi(outcome);
    const key = kpiLabelKey(nextKpi.label);
    const list = [...schema.kpis];
    const existing = list.findIndex((k) => kpiLabelKey(k.label) === key);
    if (existing >= 0) {
      list[existing] = nextKpi;
    } else {
      list.push(nextKpi);
    }
    try {
      await patchKpis(list);
      toast.success(
        existing >= 0
          ? 'Indicateur déjà en bande — lien objectif synchronisé.'
          : 'Objectif ajouté à la bande d’indicateurs (synchro auto).',
      );
    } catch (e) {
      const msg =
        typeof e === 'object' && e && 'message' in e && typeof (e as { message: unknown }).message === 'string'
          ? (e as { message: string }).message
          : 'Ajout à la bande KPI impossible.';
      toast.error(msg);
    }
  };

  const isOutcomeOnKpiBand = (outcome: StrategyOutcome) => {
    const key = kpiLabelKey(outcome.title);
    if (!key) return false;
    return (schema?.kpis ?? []).some((k) => kpiLabelKey(k.label) === key);
  };

  const openBlock = (block?: StrategyContentBlock, index?: number) => {
    if (block && index != null) {
      setEditingBlockIndex(index);
      setBlockDraft({ ...block });
    } else if (block) {
      setEditingBlockIndex(null);
      setBlockDraft({ ...block });
    } else {
      setEditingBlockIndex(null);
      setBlockDraft(emptyBlock());
    }
    setBlockOpen(true);
  };

  const saveBlock = async () => {
    if (!schema) return;
    const title = blockDraft.title.trim();
    if (!title) {
      toast.error('Titre du bloc requis.');
      return;
    }
    if (
      (blockDraft.kind === 'image' || blockDraft.kind === 'document') &&
      !blockDraft.documentId
    ) {
      toast.error('Sélectionnez ou déposez un document.');
      return;
    }
    const list = [...schema.contentBlocks];
    const payload = { ...blockDraft, title, body: blockDraft.body?.trim() ?? '' };
    if (editingBlockIndex != null && editingBlockIndex >= 0) list[editingBlockIndex] = payload;
    else list.push(payload);
    try {
      await patchBlocks(list);
      toast.success(editingBlockIndex != null ? 'Bloc mis à jour.' : 'Bloc ajouté.');
      setBlockOpen(false);
    } catch (e) {
      const msg =
        typeof e === 'object' && e && 'message' in e && typeof (e as { message: unknown }).message === 'string'
          ? (e as { message: string }).message
          : 'Enregistrement impossible.';
      toast.error(msg);
    }
  };

  const deleteBlock = async () => {
    if (!schema || editingBlockIndex == null) return;
    const list = schema.contentBlocks.filter((_, i) => i !== editingBlockIndex);
    try {
      await patchBlocks(list);
      toast.success('Bloc supprimé.');
      setBlockOpen(false);
    } catch (e) {
      const msg =
        typeof e === 'object' && e && 'message' in e && typeof (e as { message: unknown }).message === 'string'
          ? (e as { message: string }).message
          : 'Suppression impossible.';
      toast.error(msg);
    }
  };

  const openRisk = (risk?: StrategyRisk, index?: number) => {
    if (risk && index != null) {
      setEditingRiskIndex(index);
      setRiskDraft({ ...risk });
    } else {
      setEditingRiskIndex(null);
      setRiskDraft(emptyRisk());
    }
    setRiskOpen(true);
  };

  const saveRisk = async () => {
    if (!schema) return;
    const name = riskDraft.name.trim();
    if (!name) {
      toast.error('Libellé du risque requis.');
      return;
    }
    const list = [...schema.risks];
    const payload = { ...riskDraft, name };
    if (editingRiskIndex != null && editingRiskIndex >= 0) list[editingRiskIndex] = payload;
    else list.push(payload);
    try {
      await patchRisks(list);
      toast.success(editingRiskIndex != null ? 'Risque mis à jour.' : 'Risque ajouté.');
      setRiskOpen(false);
    } catch (e) {
      const msg =
        typeof e === 'object' && e && 'message' in e && typeof (e as { message: unknown }).message === 'string'
          ? (e as { message: string }).message
          : 'Enregistrement impossible.';
      toast.error(msg);
    }
  };

  const deleteRisk = async () => {
    if (!schema || editingRiskIndex == null) return;
    const list = schema.risks.filter((_, i) => i !== editingRiskIndex);
    try {
      await patchRisks(list);
      toast.success('Risque supprimé.');
      setRiskOpen(false);
    } catch (e) {
      const msg =
        typeof e === 'object' && e && 'message' in e && typeof (e as { message: unknown }).message === 'string'
          ? (e as { message: string }).message
          : 'Suppression impossible.';
      toast.error(msg);
    }
  };

  const saveContributions = async () => {
    if (!strategy) return;
    try {
      await updateMutation.mutateAsync({
        strategyId: strategy.id,
        body: { axisContributions: contribDraft },
      });
      toast.success('Contributions enregistrées.');
    } catch (e) {
      const msg =
        typeof e === 'object' && e && 'message' in e && typeof (e as { message: unknown }).message === 'string'
          ? (e as { message: string }).message
          : 'Enregistrement impossible.';
      toast.error(msg);
    }
  };

  const saveBudgets = async () => {
    if (!strategy || !schema) return;
    const next: Record<string, number> = {};
    for (const [y, raw] of Object.entries(budgetDraft)) {
      const k = parseFloat(String(raw).replace(',', '.')) || 0;
      next[y] = Math.round(k * 100_000); // k€ → cents
    }
    // garder années existantes non éditées
    for (const y of Object.keys(schema.budgetsByYear)) {
      if (!(y in next)) next[y] = schema.budgetsByYear[y] ?? 0;
    }
    try {
      await updateMutation.mutateAsync({
        strategyId: strategy.id,
        body: { budgetsByYear: next },
      });
      toast.success('Budgets enregistrés.');
    } catch (e) {
      const msg =
        typeof e === 'object' && e && 'message' in e && typeof (e as { message: unknown }).message === 'string'
          ? (e as { message: string }).message
          : 'Enregistrement impossible.';
      toast.error(msg);
    }
  };

  const patchOwnAxes = async (next: StrategyOwnAxis[]) => {
    if (!strategy) return;
    await updateMutation.mutateAsync({
      strategyId: strategy.id,
      body: { ownAxes: next as unknown as Array<Record<string, unknown>> },
    });
  };

  const openAxis = (axis?: StrategyOwnAxis, index?: number) => {
    if (axis && index != null) {
      setEditingAxisIndex(index);
      setAxisDraft({ ...axis });
    } else {
      setEditingAxisIndex(null);
      setAxisDraft(emptyOwnAxis());
    }
    setAxisOpen(true);
  };

  const saveAxis = async () => {
    if (!schema) return;
    const name = axisDraft.name.trim();
    if (!name) {
      toast.error('Nom de l’axe requis.');
      return;
    }
    const list = [...schema.ownAxes];
    const payload = { ...axisDraft, name };
    if (editingAxisIndex != null && editingAxisIndex >= 0) list[editingAxisIndex] = payload;
    else list.push(payload);
    try {
      await patchOwnAxes(list);
      toast.success(editingAxisIndex != null ? 'Axe mis à jour.' : 'Axe ajouté.');
      setAxisOpen(false);
    } catch (e) {
      const msg =
        typeof e === 'object' && e && 'message' in e && typeof (e as { message: unknown }).message === 'string'
          ? (e as { message: string }).message
          : 'Enregistrement impossible.';
      toast.error(msg);
    }
  };

  const deleteAxis = async () => {
    if (!schema || editingAxisIndex == null) return;
    await deleteAxisAt(editingAxisIndex);
  };

  const deleteAxisAt = async (index: number) => {
    if (!schema) return;
    const axisName = axisDisplayTitle(schema.ownAxes[index]?.name, 'Axe');
    const list = schema.ownAxes.filter((_, i) => i !== index);
    try {
      await patchOwnAxes(list);
      toast.success(`Axe « ${axisName} » supprimé.`);
      if (editingAxisIndex === index) setAxisOpen(false);
      else if (editingAxisIndex != null && editingAxisIndex > index) {
        setEditingAxisIndex(editingAxisIndex - 1);
      }
    } catch (e) {
      const msg =
        typeof e === 'object' && e && 'message' in e && typeof (e as { message: unknown }).message === 'string'
          ? (e as { message: string }).message
          : 'Suppression impossible.';
      toast.error(msg);
    }
  };

  const patchKpis = async (next: StrategyKpi[]) => {
    if (!strategy) return;
    await updateMutation.mutateAsync({
      strategyId: strategy.id,
      body: { kpis: next as unknown as Array<Record<string, unknown>> },
    });
  };

  const moveKpi = async (fromIndex: number, toIndex: number) => {
    if (!schema) return;
    if (toIndex < 0 || toIndex >= schema.kpis.length || fromIndex === toIndex) return;
    const list = [...schema.kpis];
    const [item] = list.splice(fromIndex, 1);
    if (!item) return;
    list.splice(toIndex, 0, item);
    try {
      await patchKpis(list);
    } catch (e) {
      const msg =
        typeof e === 'object' && e && 'message' in e && typeof (e as { message: unknown }).message === 'string'
          ? (e as { message: string }).message
          : 'Réordonnancement impossible.';
      toast.error(msg);
    }
  };

  const openKpi = (kpi?: StrategyKpi, index?: number) => {
    if (kpi && index != null) {
      setEditingKpiIndex(index);
      setKpiDraft({ ...kpi });
    } else {
      setEditingKpiIndex(null);
      setKpiDraft(emptyKpi());
    }
    setKpiOpen(true);
  };

  const saveKpi = async () => {
    if (!schema) return;
    const label = kpiDraft.label.trim();
    if (!label) {
      toast.error('Libellé de l’indicateur requis.');
      return;
    }
    const list = [...schema.kpis];
    const payload = {
      ...kpiDraft,
      label,
      value: kpiDraft.value.trim() || '—',
      detail: kpiDraft.detail.trim(),
    };
    if (editingKpiIndex != null && editingKpiIndex >= 0) list[editingKpiIndex] = payload;
    else list.push(payload);
    try {
      await patchKpis(list);
      toast.success(editingKpiIndex != null ? 'Indicateur mis à jour.' : 'Indicateur ajouté.');
      setKpiOpen(false);
    } catch (e) {
      const msg =
        typeof e === 'object' && e && 'message' in e && typeof (e as { message: unknown }).message === 'string'
          ? (e as { message: string }).message
          : 'Enregistrement impossible.';
      toast.error(msg);
    }
  };

  const deleteKpi = async () => {
    if (!schema || editingKpiIndex == null) return;
    const list = schema.kpis.filter((_, i) => i !== editingKpiIndex);
    try {
      await patchKpis(list);
      toast.success('Indicateur supprimé.');
      setKpiOpen(false);
    } catch (e) {
      const msg =
        typeof e === 'object' && e && 'message' in e && typeof (e as { message: unknown }).message === 'string'
          ? (e as { message: string }).message
          : 'Suppression impossible.';
      toast.error(msg);
    }
  };

  const allowPickValidator =
    workflowQ.data?.resolved.allowSubmitterToSelectValidator === true;

  const handleSubmitReview = async () => {
    if (!strategy) return;
    if (strategy.status === 'DRAFT' || strategy.status === 'REJECTED') {
      if (allowPickValidator && !submitValidatorUserId) {
        toast.error('Sélectionnez un validateur.');
        return;
      }
      try {
        await submitMutation.mutateAsync({
          strategyId: strategy.id,
          alignedVisionId: strategy.alignedVisionId,
          validatorUserId: allowPickValidator ? submitValidatorUserId : undefined,
        });
        toast.success('Stratégie soumise pour validation.');
        setReviewOpen(false);
      } catch (e) {
        const msg =
          typeof e === 'object' && e && 'message' in e && typeof (e as { message: unknown }).message === 'string'
            ? (e as { message: string }).message
            : 'Soumission impossible.';
        toast.error(msg);
      }
      return;
    }
  };

  const handleApprove = async () => {
    if (!strategy) return;
    try {
      await reviewMutation.mutateAsync({
        strategyId: strategy.id,
        body: {
          decision: 'APPROVED',
          decisionNote: decisionNote.trim() || undefined,
          reviewInstanceLabel: reviewInstanceLabel.trim() || 'CODIR',
        },
      });
      toast.success('Schéma validé.');
      setReviewOpen(false);
      setDecisionNote('');
    } catch (e) {
      const msg =
        typeof e === 'object' && e && 'message' in e && typeof (e as { message: unknown }).message === 'string'
          ? (e as { message: string }).message
          : 'Validation impossible.';
      toast.error(msg);
    }
  };

  const handleReject = async () => {
    if (!strategy) return;
    if (!rejectReason.trim()) {
      toast.error('Motif de refus requis.');
      return;
    }
    try {
      await reviewMutation.mutateAsync({
        strategyId: strategy.id,
        body: {
          decision: 'REJECTED',
          rejectionReason: rejectReason.trim(),
          decisionNote: decisionNote.trim() || rejectReason.trim(),
          reviewInstanceLabel: reviewInstanceLabel.trim() || 'CODIR',
        },
      });
      toast.success('Schéma refusé.');
      setReviewOpen(false);
      setRejectReason('');
      setDecisionNote('');
    } catch (e) {
      const msg =
        typeof e === 'object' && e && 'message' in e && typeof (e as { message: unknown }).message === 'string'
          ? (e as { message: string }).message
          : 'Refus impossible.';
      toast.error(msg);
    }
  };

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleShare = useCallback(async () => {
    if (!strategy) return;
    const url =
      typeof window !== 'undefined'
        ? `${window.location.origin}/strategic-direction-strategy/${strategy.id}`
        : `/strategic-direction-strategy/${strategy.id}`;
    const title = firstDisplayLabel(
      [strategy.title, strategy.direction?.name],
      'Schéma directeur',
    );
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success('Lien copié dans le presse-papiers');
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      try {
        await navigator.clipboard.writeText(url);
        toast.success('Lien copié dans le presse-papiers');
      } catch {
        toast.error('Impossible de partager le lien');
      }
    }
  }, [strategy]);

  const handleAdaptVersion = async () => {
    if (!strategy) return;
    const reason = adaptReason.trim();
    if (!reason) {
      toast.error('Indiquez le motif de la nouvelle version.');
      return;
    }
    try {
      await updateMutation.mutateAsync({
        strategyId: strategy.id,
        body: { archiveReason: reason },
      });
      toast.success('Nouvelle version ouverte en brouillon.');
      setAdaptOpen(false);
      setAdaptReason('');
    } catch (e) {
      const msg =
        typeof e === 'object' && e && 'message' in e && typeof (e as { message: unknown }).message === 'string'
          ? (e as { message: string }).message
          : 'Création de version impossible.';
      toast.error(msg);
    }
  };

  const handleArchiveStrategy = async () => {
    if (!strategy) return;
    const reason = archiveReasonDraft.trim();
    if (!reason) {
      toast.error('Indiquez le motif d’archivage.');
      return;
    }
    try {
      await archiveMutation.mutateAsync({ strategyId: strategy.id, reason });
      toast.success('Schéma archivé.');
      setArchiveOpen(false);
      setArchiveReasonDraft('');
    } catch (e) {
      const msg =
        typeof e === 'object' && e && 'message' in e && typeof (e as { message: unknown }).message === 'string'
          ? (e as { message: string }).message
          : 'Archivage impossible.';
      toast.error(msg);
    }
  };

  const alerts = metrics?.alerts ?? [];
  const criticalCount = alerts.filter((a) => a.level === 'danger').length;

  const axisNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of linksQ.data?.visionAxes ?? []) map.set(a.id, a.name);
    for (const a of linksQ.data?.axes ?? []) map.set(a.id, a.name);
    return map;
  }, [linksQ.data?.axes, linksQ.data?.visionAxes]);

  const visionGroupAxes = useMemo(() => {
    const fromVision = linksQ.data?.visionAxes ?? [];
    if (fromVision.length > 0) return fromVision;
    return linksQ.data?.axes ?? [];
  }, [linksQ.data?.axes, linksQ.data?.visionAxes]);

  const TIMELINE_TONES = TIMELINE_LANE_TONES;

  /** Lanes Gantt : axes vision alignée en priorité (sinon axes propres / fallback). */
  const timelineLanes = useMemo(() => {
    const localOwnAxes = schema?.ownAxes ?? [];
    if (visionGroupAxes.length > 0) {
      return visionGroupAxes.map((a, i) => ({
        id: a.id,
        name: a.name,
        tone: TIMELINE_TONES[i % TIMELINE_TONES.length]!,
        pick: (c: StrategyInitiative) =>
          c.strategicAxisIds.includes(a.id) ||
          (c.strategicAxisIds.length === 0 && c.lane === i),
      }));
    }
    const lanes =
      localOwnAxes.length > 0
        ? localOwnAxes
        : [{ id: 'default', name: 'Chantiers', tone: 'info' as const }];
    return lanes.map((a, i) => ({
      id: a.id,
      name: a.name,
      tone: a.tone || TIMELINE_TONES[i % TIMELINE_TONES.length]!,
      pick: (c: StrategyInitiative) =>
        localOwnAxes.length > 0 ? c.lane === i : true,
    }));
  }, [visionGroupAxes, schema?.ownAxes]);

  const timelineOrphans = useMemo(() => {
    const list = schema?.majorInitiatives ?? [];
    if (visionGroupAxes.length === 0) return [] as StrategyInitiative[];
    return list.filter((c) => !timelineLanes.some((lane) => lane.pick(c)));
  }, [visionGroupAxes.length, schema?.majorInitiatives, timelineLanes]);

  if (detailQ.isLoading) {
    return (
      <PageContainer>
        <LoadingState />
      </PageContainer>
    );
  }
  if (detailQ.isError || !strategy) {
    return (
      <PageContainer>
        <ErrorState
          message="Impossible de charger le schéma"
          onRetry={() => void detailQ.refetch()}
        />
      </PageContainer>
    );
  }

  const code = displayLabel(strategy.direction?.code, 'Direction');
  const name = displayLabel(strategy.direction?.name, 'Direction');
  const directionFromList = (directionsQ.data ?? []).find((d) => d.id === strategy.directionId);
  const directionForEdit: StrategicDirectionDto | null = directionFromList
    ? directionFromList
    : strategy.direction
      ? {
          id: strategy.direction.id,
          clientId: strategy.clientId,
          code: strategy.direction.code,
          name: strategy.direction.name,
          description: strategy.direction.description ?? null,
          accentTone: strategy.direction.accentTone ?? null,
          parentLabel: strategy.direction.parentLabel ?? null,
          sponsorResourceId: strategy.direction.sponsorResourceId ?? null,
          sponsorLabel: strategy.direction.sponsorLabel ?? null,
          fteCount: strategy.direction.fteCount ?? null,
          operatingBudgetCents: strategy.direction.operatingBudgetCents ?? null,
          sortOrder: 0,
          isActive: true,
          createdAt: strategy.createdAt,
          updatedAt: strategy.updatedAt,
        }
      : null;
  const startYear = schema?.horizonStartYear ?? new Date().getFullYear();
  const yearCount = schema?.horizonYearCount ?? 3;
  const totalMonths = Math.max(1, yearCount * 12);
  const nowMonthOffset =
    (new Date().getFullYear() - startYear) * 12 + new Date().getMonth();
  const years = Array.from({ length: yearCount }, (_, i) => startYear + i);
  const ownAxes = schema?.ownAxes ?? [];
  const initiatives = schema?.majorInitiatives ?? [];
  const outcomes = schema?.expectedOutcomes ?? [];
  const kpis = resolveDisplayKpis(schema?.kpis ?? [], outcomes);
  const risks = schema?.risks ?? [];
  const blocks = schema?.contentBlocks ?? [];
  const budgetsByYear = schema?.budgetsByYear ?? {};
  const contributions = schema?.axisContributions ?? {};

  const heroDirector = firstDisplayLabel(
    [strategy.direction?.sponsorLabel, stgPersonName(strategy.ownerLabel)],
    'Directeur·rice non renseigné',
  );
  const heroParent = strategy.direction?.parentLabel?.trim()
    ? displayLabel(strategy.direction.parentLabel, 'Direction parente')
    : 'Aucune';
  const heroFte = strategy.direction?.fteCount;
  const operatingBudget = strategy.direction?.operatingBudgetCents;
  const schemaBudgetSum = Object.values(budgetsByYear).reduce(
    (s, v) => s + (typeof v === 'number' ? v : 0),
    0,
  );
  const heroBudgetCents =
    operatingBudget != null && operatingBudget > 0
      ? operatingBudget
      : schemaBudgetSum > 0
        ? schemaBudgetSum
        : null;
  const heroStaffing = [
    heroFte != null ? `${heroFte} ETP` : null,
    heroBudgetCents != null ? formatEurCents(heroBudgetCents) : null,
  ].filter(Boolean) as string[];

  const alertLevelLabel = (lvl: string) =>
    lvl === 'danger' ? 'Critique' : lvl === 'warning' ? 'À surveiller' : 'Information';
  const alertBadge = (lvl: string) =>
    lvl === 'danger' ? 'bdg-danger' : lvl === 'warning' ? 'bdg-warn' : 'bdg-info';

  return (
    <PageContainer>
      <div id="view-dirstrat" className="stg-root">
      <PageHeader
        title={`${code} — Schéma directeur`}
        description={`${name} · ${displayLabel(strategy.horizonLabel, 'Horizon non renseigné')} · v${versionsQ.data?.versions.find((v) => v.isCurrent)?.versionNumber ?? 1}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/strategic-direction-strategy"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'icon' }),
                'min-h-11 min-w-11',
              )}
              aria-label="Toutes les directions"
            >
              <ArrowLeft className="size-4" aria-hidden />
            </Link>
            {canShare ? (
              <IconButton
                type="button"
                variant="outline"
                className="min-h-11 min-w-11"
                aria-label="Partager"
                onClick={() => void handleShare()}
              >
                <Share2 className="size-4" aria-hidden />
              </IconButton>
            ) : null}
            {showReviewEntry ? (
              <IconButton
                type="button"
                variant="outline"
                className="min-h-11 min-w-11"
                aria-label="Nouvelle revue"
                onClick={() => setReviewOpen(true)}
              >
                <ClipboardCheck className="size-4" aria-hidden />
              </IconButton>
            ) : null}
            {canAdaptVersion ? (
              <IconButton
                type="button"
                variant="outline"
                className="min-h-11 min-w-11"
                aria-label="Nouvelle version"
                onClick={() => setAdaptOpen(true)}
              >
                <GitBranch className="size-4" aria-hidden />
              </IconButton>
            ) : null}
            {canExport ? (
              <IconButton
                type="button"
                variant="outline"
                className="min-h-11 min-w-11"
                aria-label="Export PDF 1 page"
                onClick={handlePrint}
              >
                <Printer className="size-4" aria-hidden />
              </IconButton>
            ) : null}
            {canArchive ? (
              <IconButton
                type="button"
                variant="outline"
                className="min-h-11 min-w-11"
                aria-label="Archiver"
                onClick={() => setArchiveOpen(true)}
              >
                <Archive className="size-4" aria-hidden />
              </IconButton>
            ) : null}
            {canManageDirection ? (
              <IconButton
                type="button"
                variant="outline"
                className="min-h-11 min-w-11"
                aria-label="Modifier la direction"
                onClick={() => setDirectionEditOpen(true)}
              >
                <Pencil className="size-4" aria-hidden />
              </IconButton>
            ) : null}
          </div>
        }
      />

      <div className="space-y-3" aria-live="polite">
        {strategy.status === 'SUBMITTED' ? (
          <Alert>
            <AlertTitle>En revue — contenu gelé</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center gap-3">
              <span>Le schéma est soumis ; les modifications sont bloquées jusqu’à la décision.</span>
              {canDecide ? (
                <Button
                  type="button"
                  size="sm"
                  className="min-h-11"
                  onClick={() => setReviewOpen(true)}
                >
                  Décider
                </Button>
              ) : null}
            </AlertDescription>
          </Alert>
        ) : null}
        {strategy.status === 'ARCHIVED' ? (
          <Alert>
            <AlertTitle>Schéma archivé — lecture seule</AlertTitle>
            <AlertDescription>
              Ce schéma ne peut plus être modifié. Un nouveau schéma peut être créé pour la même
              direction et vision.
            </AlertDescription>
          </Alert>
        ) : null}
      </div>

      <div className="card stg-hero">
        <div className="stg-hero-sigle" style={{ background: T.bg, color: T.c }}>
          {code}
        </div>
        <div className="stg-hero-id">
          <h2>{name}</h2>
          <div className="stg-hero-meta">
            <span className={cn('stg-badge', strategyStatusBadgeClass(strategy.status))}>
              {getStrategicDirectionStrategyStatusLabel(strategy.status)}
            </span>
            <span className="stg-hero-sep" aria-hidden />
            <span className="stg-meta">
              {heroDirector} · directeur·rice
            </span>
            <span className="stg-hero-sep" aria-hidden />
            <span className="stg-meta">Rattachée à {heroParent}</span>
            {heroStaffing.length > 0 ? (
              <>
                <span className="stg-hero-sep" aria-hidden />
                <span className="stg-meta">{heroStaffing.join(' · ')}</span>
              </>
            ) : null}
            <span className="stg-hero-sep" aria-hidden />
            <span className="stg-meta">
              Dernière revue {formatReviewDate(strategy.approvedAt ?? strategy.updatedAt)}
            </span>
          </div>
          <p
            className={cn(
              'stg-ambition',
              canUpdate &&
                strategy.status !== 'ARCHIVED' &&
                strategy.status !== 'SUBMITTED' &&
                'cursor-pointer',
            )}
            style={{ marginTop: 16 }}
            onClick={() => {
              if (
                canUpdate &&
                strategy.status !== 'ARCHIVED' &&
                strategy.status !== 'SUBMITTED'
              ) {
                openEdit();
              }
            }}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' && e.key !== ' ') return;
              if (
                canUpdate &&
                strategy.status !== 'ARCHIVED' &&
                strategy.status !== 'SUBMITTED'
              ) {
                e.preventDefault();
                openEdit();
              }
            }}
            role={
              canUpdate &&
              strategy.status !== 'ARCHIVED' &&
              strategy.status !== 'SUBMITTED'
                ? 'button'
                : undefined
            }
            tabIndex={
              canUpdate &&
              strategy.status !== 'ARCHIVED' &&
              strategy.status !== 'SUBMITTED'
                ? 0
                : undefined
            }
            aria-label={
              canUpdate ? 'Modifier l’ambition et le périmètre du schéma' : undefined
            }
          >
            {displayLabel(strategy.ambition, 'Ambition à formuler.')}
          </p>
          <p className="stg-sec-sub" style={{ marginTop: 10 }}>
            {displayLabel(strategy.context, 'Périmètre à préciser')}
          </p>
        </div>
        <ScoreRingLarge score={metricsQ.isSuccess ? score : 0} color={T.c} />
      </div>

      {kpis.length === 0 ? (
        <div className="card mb-4">
          <div className="stg-empty">
            Aucun indicateur.
            {canUpdate && strategy.status !== 'ARCHIVED' && strategy.status !== 'SUBMITTED' ? (
              <>
                {' '}
                <button
                  type="button"
                  className="font-bold text-[color:var(--brand-gold-700)] underline-offset-2 hover:underline"
                  onClick={() => openKpi()}
                >
                  Ajouter un indicateur
                </button>
              </>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="stg-kpis">
          {kpis.map((k, i) => {
            const editable =
              canUpdate &&
              strategy.status !== 'ARCHIVED' &&
              strategy.status !== 'SUBMITTED';
            return (
              <div
                key={`${k.label}-${i}`}
                className={cn(
                  'stg-kpi-wrap',
                  editable && kpis.length > 1 && 'stg-kpi-wrap--reorder',
                )}
              >
                {editable && kpis.length > 1 ? (
                  <div className="stg-kpi-reorder" role="group" aria-label="Ordre de l’indicateur">
                    <button
                      type="button"
                      className="stg-kpi-reorder-btn min-h-11 min-w-11"
                      disabled={i === 0 || updateMutation.isPending}
                      aria-label={`Déplacer « ${displayLabel(k.label, 'Indicateur')} » vers la gauche`}
                      onClick={(e) => {
                        e.stopPropagation();
                        void moveKpi(i, i - 1);
                      }}
                    >
                      <ChevronLeft className="size-4" aria-hidden />
                    </button>
                    <button
                      type="button"
                      className="stg-kpi-reorder-btn min-h-11 min-w-11"
                      disabled={i === kpis.length - 1 || updateMutation.isPending}
                      aria-label={`Déplacer « ${displayLabel(k.label, 'Indicateur')} » vers la droite`}
                      onClick={(e) => {
                        e.stopPropagation();
                        void moveKpi(i, i + 1);
                      }}
                    >
                      <ChevronRight className="size-4" aria-hidden />
                    </button>
                  </div>
                ) : null}
                <button
                  type="button"
                  className={cn('stg-kpi w-full text-left', editable && 'cursor-pointer')}
                  onClick={() => {
                    if (editable) openKpi(k, i);
                  }}
                  aria-label={
                    editable
                      ? `Modifier l’indicateur ${displayLabel(k.label, 'Indicateur')}`
                      : undefined
                  }
                >
                  <div className="l">{displayLabel(k.label, 'Indicateur')}</div>
                  <div className="v">{displayLabel(k.value, '—')}</div>
                  <div className="d">{displayLabel(k.detail, '')}</div>
                </button>
              </div>
            );
          })}
          {canUpdate && strategy.status !== 'ARCHIVED' && strategy.status !== 'SUBMITTED' ? (
            <button
              type="button"
              className="stg-kpi stg-kpi--add min-h-11 w-full"
              onClick={() => openKpi()}
              aria-label="Ajouter un indicateur"
            >
              <Plus className="size-4 shrink-0" aria-hidden />
              <span>Ajouter un indicateur</span>
            </button>
          ) : null}
        </div>
      )}

      <div
        className="starium-tab-group stg-subtabs max-w-full overflow-x-auto"
        id="ds-subtabs"
        role="tablist"
        aria-label="Onglets schéma directeur"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={cn(
              'starium-tab-btn min-h-11 shrink-0 sm:min-h-9',
              tab === t.id && 'starium-tab-btn--active',
            )}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {t.id === 'alertes' && alerts.length > 0 ? (
              <span className={cn('stg-tabn', criticalCount > 0 && 'crit')}>{alerts.length}</span>
            ) : null}
            {t.id === 'objectifs' && outcomes.length > 0 ? (
              <span className="stg-tabn">{outcomes.length}</span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === 'axes' ? (
        <div className="space-y-4">
          <section className="stg-sec">
            <div className="stg-sec-head">
              <div>
                <div className="stg-sec-t">
                  <LayoutGrid className="size-[17px]" aria-hidden />
                  Schéma directeur{' '}
                  {displayLabel(
                    strategy.horizonLabel,
                    `${startYear} → ${startYear + yearCount - 1}`,
                  )}
                </div>
                <div className="stg-sec-sub">
                  {initiatives.length} chantier{initiatives.length > 1 ? 's' : ''} ·{' '}
                  {formatEurCents(
                    initiatives.reduce((s, c) => s + (c.budgetCents || 0), 0),
                  )}{' '}
                  · lanes ={' '}
                  {visionGroupAxes.length > 0
                    ? 'axes stratégiques de la vision'
                    : 'axes propres de la direction'}
                </div>
              </div>
              {canUpdate && strategy.status !== 'ARCHIVED' && strategy.status !== 'SUBMITTED' ? (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  onClick={() => openInitiative()}
                >
                  <Plus className="size-4" aria-hidden />
                  Ajouter un chantier
                </Button>
              ) : null}
            </div>
            {!schema || initiatives.length === 0 ? (
              <EmptyState
                title="Aucun chantier"
                description="Ajoutez des chantiers pour construire le schéma directeur."
              />
            ) : (
              <div className="card stg-tl">
                <div className="stg-tl-row" style={{ ['--stg-ny' as string]: yearCount }}>
                  <div />
                  <div className="stg-tl-years" style={{ ['--stg-ny' as string]: yearCount }}>
                    {years.map((y) => (
                      <div key={y} className="stg-tl-year">
                        {y}
                      </div>
                    ))}
                  </div>
                </div>
                {timelineLanes.map((axis) => {
                  const laneInits = initiatives.filter((c) => axis.pick(c));
                  if (laneInits.length === 0) return null;
                  const t = stgTone(axis.tone);
                  return (
                    <div key={axis.id}>
                      <div className="stg-tl-lane-h">
                        <i style={{ background: t.c }} aria-hidden />
                        <StrategicAxisNameLabel name={axis.name} />
                      </div>
                      {[...laneInits]
                        .sort((a, b) => a.startMonthOffset - b.startMonthOffset)
                        .map((init) => (
                          <div key={init.id} className="stg-tl-row stg-tl-lane">
                            <div>
                              <button
                                type="button"
                                className="stg-tl-name text-left"
                                onClick={() => canUpdate && openInitiative(init)}
                              >
                                {displayLabel(init.title, 'Chantier')}
                              </button>
                              <div className="stg-tl-nsub">
                                {displayLabel(init.ownerLabel, 'Pilote non renseigné')} ·{' '}
                                {formatEurCents(init.budgetCents)}
                              </div>
                            </div>
                            <div
                              className="stg-tl-track"
                              style={{ ['--stg-nq' as string]: 12 }}
                            >
                              <div
                                className="stg-tl-bar"
                                style={{
                                  left: `${stgBarPct(init.startMonthOffset, totalMonths).toFixed(2)}%`,
                                  width: `${stgBarPct(Math.max(1, init.endMonthOffset - init.startMonthOffset), totalMonths).toFixed(2)}%`,
                                  background: t.c,
                                }}
                                title={`${displayLabel(init.title, 'Chantier')} · ${init.progressPct}%`}
                                onClick={() => canUpdate && openInitiative(init)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    if (canUpdate) openInitiative(init);
                                  }
                                }}
                                role={canUpdate ? 'button' : undefined}
                                tabIndex={canUpdate ? 0 : undefined}
                              >
                                <i style={{ width: `${init.progressPct}%` }} aria-hidden />
                                <span>{init.progressPct}%</span>
                              </div>
                              {(init.milestones ?? []).map((m, mi) => (
                                <div
                                  key={`${init.id}-ms-${mi}`}
                                  className="stg-tl-ms"
                                  style={{
                                    left: `${stgBarPct(m.monthOffset, totalMonths).toFixed(2)}%`,
                                  }}
                                  title={displayLabel(m.label, 'Jalon')}
                                />
                              ))}
                              <div
                                className="stg-tl-now"
                                style={{
                                  left: `${stgBarPct(nowMonthOffset, totalMonths).toFixed(2)}%`,
                                }}
                                aria-hidden
                              />
                            </div>
                          </div>
                        ))}
                    </div>
                  );
                })}
                {timelineOrphans.length > 0 ? (
                  <div>
                    <div className="stg-tl-lane-h">
                      <i style={{ background: 'var(--neutral-400)' }} aria-hidden />
                      Hors axes vision
                    </div>
                    {[...timelineOrphans]
                      .sort((a, b) => a.startMonthOffset - b.startMonthOffset)
                      .map((init) => (
                        <div key={init.id} className="stg-tl-row stg-tl-lane">
                          <div>
                            <button
                              type="button"
                              className="stg-tl-name text-left"
                              onClick={() => canUpdate && openInitiative(init)}
                            >
                              {displayLabel(init.title, 'Chantier')}
                            </button>
                            <div className="stg-tl-nsub">
                              {displayLabel(init.ownerLabel, 'Pilote non renseigné')} ·{' '}
                              {formatEurCents(init.budgetCents)}
                            </div>
                          </div>
                          <div
                            className="stg-tl-track"
                            style={{ ['--stg-nq' as string]: 12 }}
                          >
                            <div
                              className="stg-tl-bar"
                              style={{
                                left: `${stgBarPct(init.startMonthOffset, totalMonths).toFixed(2)}%`,
                                width: `${stgBarPct(Math.max(1, init.endMonthOffset - init.startMonthOffset), totalMonths).toFixed(2)}%`,
                                background: 'var(--neutral-500)',
                              }}
                              title={`${displayLabel(init.title, 'Chantier')} · ${init.progressPct}%`}
                              onClick={() => canUpdate && openInitiative(init)}
                              role={canUpdate ? 'button' : undefined}
                              tabIndex={canUpdate ? 0 : undefined}
                            >
                              <i style={{ width: `${init.progressPct}%` }} aria-hidden />
                              <span>{init.progressPct}%</span>
                            </div>
                            <div
                              className="stg-tl-now"
                              style={{
                                left: `${stgBarPct(nowMonthOffset, totalMonths).toFixed(2)}%`,
                              }}
                              aria-hidden
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                ) : null}
                <div className="stg-tl-legend">
                  {timelineLanes.map((a) => (
                    <span key={a.id} className="k">
                      <i style={{ background: stgTone(a.tone).c }} aria-hidden />
                      <StrategicAxisNameLabel name={a.name} />
                    </span>
                  ))}
                  <span className="k">
                    <span className="dia" aria-hidden />
                    Jalon structurant
                  </span>
                  <span className="k">
                    <i
                      style={{
                        background: 'var(--state-danger)',
                        width: 2,
                        height: 12,
                        borderRadius: 0,
                      }}
                      aria-hidden
                    />
                    Aujourd&apos;hui
                  </span>
                </div>
              </div>
            )}
          </section>

          <section className="stg-sec">
            <div className="stg-sec-head">
              <div>
                <div className="stg-sec-t">Axes propres de la direction</div>
                <div className="stg-sec-sub">
                  Organisation locale (lanes métier) — distincte des axes vision affichés sur le Gantt.
                </div>
              </div>
              {canUpdate && strategy.status !== 'ARCHIVED' && strategy.status !== 'SUBMITTED' ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-11 sm:min-h-9"
                  onClick={() => openAxis()}
                >
                  <Plus className="mr-1 size-4" aria-hidden />
                  Ajouter un axe
                </Button>
              ) : null}
            </div>
            {ownAxes.length === 0 ? (
              <div className="card">
                <div className="stg-empty flex flex-col items-center gap-3 py-8">
                  <p className="text-sm text-muted-foreground text-center max-w-md">
                    Aucun axe propre. Optionnel : lanes métier locales (le Gantt utilise les axes
                    vision).
                  </p>
                  {canUpdate &&
                  strategy.status !== 'ARCHIVED' &&
                  strategy.status !== 'SUBMITTED' ? (
                    <Button
                      type="button"
                      className="min-h-11"
                      onClick={() => openAxis()}
                    >
                      <Plus className="mr-2 size-4" aria-hidden />
                      Ajouter un axe propre
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="card space-y-1 p-3 sm:p-4">
                <ul className="divide-y divide-border/60" role="list">
                  {ownAxes.map((a, i) => {
                    const laneInits = initiatives.filter((c) => c.lane === i);
                    const n = laneInits.length;
                    const pct =
                      n > 0
                        ? Math.round(
                            laneInits.reduce((s, c) => s + (c.progressPct || 0), 0) / n,
                          )
                        : 0;
                    const axisLabel = axisDisplayTitle(a.name, 'Axe');
                    const editable =
                      canUpdate &&
                      strategy.status !== 'ARCHIVED' &&
                      strategy.status !== 'SUBMITTED';
                    return (
                      <li
                        key={a.id}
                        className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:gap-4"
                      >
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex items-center gap-2">
                            <i
                              className="size-2.5 shrink-0 rounded-sm"
                              style={{ background: stgTone(a.tone).c }}
                              aria-hidden
                            />
                            <span className="truncate font-semibold text-foreground">
                              <StrategicAxisNameLabel name={a.name} />
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div
                              className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted"
                              role="presentation"
                            >
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${pct}%`,
                                  background: stgTone(a.tone).c,
                                }}
                              />
                            </div>
                            <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                              {pct}%
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-muted-foreground">
                            {n
                              ? `${n} chantier${n > 1 ? 's' : ''} sur cette lane`
                              : 'aucun chantier'}
                          </p>
                        </div>
                        {editable ? (
                          <div className="flex shrink-0 flex-wrap items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="min-h-11 sm:min-h-9"
                              onClick={() => openAxis(a, i)}
                              aria-label={`Modifier l’axe ${axisLabel}`}
                            >
                              <Pencil className="mr-1.5 size-4" aria-hidden />
                              Modifier
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="min-h-11 sm:min-h-9 text-destructive border-destructive/40"
                              disabled={updateMutation.isPending}
                              onClick={() => void deleteAxisAt(i)}
                              aria-label={`Supprimer l’axe ${axisLabel}`}
                            >
                              <Trash2 className="mr-1.5 size-4" aria-hidden />
                              Supprimer
                            </Button>
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </section>

          <section className="stg-sec">
            <div className="stg-sec-head">
              <div>
                <div className="stg-sec-t">
                  <FileText className="size-[17px]" aria-hidden />
                  Notes &amp; pièces du schéma directeur
                </div>
                <div className="stg-sec-sub">
                  Textes de cadrage, principes, schémas d’architecture et documents joints —
                  libre à la direction.
                </div>
              </div>
              {canUpdate && strategy.status !== 'ARCHIVED' && strategy.status !== 'SUBMITTED' ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11"
                    onClick={() => openBlock({ kind: 'text', title: '', body: '', documentId: null })}
                  >
                    Ajouter un texte
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11"
                    onClick={() => openBlock({ kind: 'image', title: '', body: '', documentId: null })}
                  >
                    Ajouter une image
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11"
                    onClick={() =>
                      openBlock({ kind: 'document', title: '', body: '', documentId: null })
                    }
                  >
                    <FileUp className="size-4" aria-hidden />
                    Ajouter un document
                  </Button>
                </div>
              ) : null}
            </div>
            {blocks.length === 0 ? (
              <div className="card">
                <div className="stg-empty">
                  Aucune note. Ajoutez un texte de cadrage, un schéma ou un document joint.
                </div>
              </div>
            ) : (
              <div className="stg-blocks">
                {blocks.map((b, i) => (
                  <button
                    key={`${b.title}-${i}`}
                    type="button"
                    className="card stg-block w-full text-left"
                    onClick={() =>
                      canUpdate &&
                      strategy.status !== 'ARCHIVED' &&
                      strategy.status !== 'SUBMITTED' &&
                      openBlock(b, i)
                    }
                  >
                    <div className="stg-block-t">{displayLabel(b.title, 'Bloc')}</div>
                    {b.kind === 'image' ? (
                      b.documentId ? (
                        <StrategyBlockImagePreview
                          strategyId={strategyId}
                          documentId={b.documentId}
                          alt={b.title}
                        />
                      ) : (
                        <div className="stg-drop">
                          <span>{displayLabel(b.body, 'Déposer une image')}</span>
                          <span style={{ fontWeight: 600, color: 'var(--neutral-400)' }}>
                            Glisser-déposer ou cliquer
                          </span>
                        </div>
                      )
                    ) : b.kind === 'document' ? (
                      b.documentId ? (
                        <StrategyBlockDocumentPreview
                          strategyId={strategyId}
                          documentId={b.documentId}
                          title={b.title}
                          description={b.body || undefined}
                        />
                      ) : (
                        <div className="stg-block-b text-muted-foreground">
                          Document non lié — ouvrez le bloc pour joindre un fichier.
                        </div>
                      )
                    ) : (
                      <div className="stg-block-b">{displayLabel(b.body, '')}</div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}

      {tab === 'objectifs' ? (
        <div className="space-y-4">
          <section className="stg-sec">
            <div className="stg-sec-head">
              <div>
                <div className="stg-sec-t">
                  <Target className="size-[17px]" aria-hidden />
                  Objectifs &amp; résultats mesurables
                </div>
                <div className="stg-sec-sub">
                  {outcomes.length === 0
                    ? 'Aucun objectif suivi par la direction.'
                    : `${outcomes.length} objectif${outcomes.length > 1 ? 's' : ''} suivi${outcomes.length > 1 ? 's' : ''} par la direction`}
                </div>
              </div>
              {canUpdate && strategy.status !== 'ARCHIVED' && strategy.status !== 'SUBMITTED' ? (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  onClick={() => openOkr()}
                >
                  <Plus className="size-4" aria-hidden />
                  Ajouter un objectif
                </Button>
              ) : null}
            </div>
            {outcomes.length === 0 ? (
              <EmptyState
                title="Aucun objectif renseigné"
                description="Déclarez des OKR pour piloter l’avancement de la direction."
              />
            ) : (
              <>
                <div className="card tablecard stg-okr-table">
                  <div className="overflow-x-auto">
                    <table className="dt">
                      <thead>
                        <tr>
                          <th>Objectif</th>
                          <th>Responsable</th>
                          <th>Indicateur cible</th>
                          <th>Actuel</th>
                          <th>Unité</th>
                          <th>Avancement</th>
                          {canUpdate &&
                          strategy.status !== 'ARCHIVED' &&
                          strategy.status !== 'SUBMITTED' ? (
                            <th className="right">
                              <span className="sr-only">Actions</span>
                            </th>
                          ) : null}
                        </tr>
                      </thead>
                      <tbody>
                        {outcomes.map((o, i) => {
                          const editable =
                            canUpdate &&
                            strategy.status !== 'ARCHIVED' &&
                            strategy.status !== 'SUBMITTED';
                          return (
                            <tr
                              key={`${o.title}-${i}`}
                              className={editable ? 'cursor-pointer' : undefined}
                              onClick={() => editable && openOkr(o, i)}
                              onKeyDown={(e) => {
                                if (!editable) return;
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  openOkr(o, i);
                                }
                              }}
                              tabIndex={editable ? 0 : undefined}
                              aria-label={
                                editable
                                  ? `Modifier l’objectif ${displayLabel(o.title, 'Objectif')}`
                                  : undefined
                              }
                            >
                              <td className="cell-strong">
                                {displayLabel(o.title, 'Objectif')}
                              </td>
                              <td>
                                {displayLabel(o.ownerLabel, 'Responsable non renseigné')}
                              </td>
                              <td>{displayLabel(o.target, 'Cible non renseignée')}</td>
                              <td className="tabular-nums font-bold">
                                {displayLabel(o.current, 'Non mesuré')}
                              </td>
                              <td className="text-muted-foreground">
                                {displayLabel(o.unit, '—')}
                              </td>
                              <td>
                                <div className="prog" aria-label={`Avancement ${o.progressPct} %`}>
                                  <div className="prog-track">
                                    <div
                                      className="prog-fill"
                                      style={{
                                        width: `${Math.min(100, Math.max(0, o.progressPct))}%`,
                                        background: progressFillColor(o.progressPct),
                                      }}
                                    />
                                  </div>
                                  <span className="prog-pct">{o.progressPct}%</span>
                                </div>
                              </td>
                              {editable ? (
                                <td className="right">
                                  <div className="inline-flex items-center justify-end gap-1">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="min-h-11 min-w-11"
                                      aria-label={
                                        isOutcomeOnKpiBand(o)
                                          ? `Actualiser « ${displayLabel(o.title, 'Objectif')} » dans la bande d’indicateurs`
                                          : `Ajouter « ${displayLabel(o.title, 'Objectif')} » à la bande d’indicateurs`
                                      }
                                      title={
                                        isOutcomeOnKpiBand(o)
                                          ? 'Actualiser en bande KPI'
                                          : 'Afficher en bande KPI'
                                      }
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        void promoteOutcomeToKpi(o);
                                      }}
                                    >
                                      <SquareKanban className="size-4" aria-hidden />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="min-h-11 min-w-11"
                                      aria-label={`Supprimer l’objectif ${displayLabel(o.title, 'Objectif')}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        void deleteOkrAt(i);
                                      }}
                                    >
                                      <Trash2 className="size-4" aria-hidden />
                                    </Button>
                                  </div>
                                </td>
                              ) : null}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="stg-okr-cards" aria-label="Objectifs (vue mobile)">
                  {outcomes.map((o, i) => {
                    const editable =
                      canUpdate &&
                      strategy.status !== 'ARCHIVED' &&
                      strategy.status !== 'SUBMITTED';
                    return (
                      <div key={`okr-m-${o.title}-${i}`} className="card stg-okr-card">
                        <div className="stg-okr-card-top">
                          {editable ? (
                            <button
                              type="button"
                              className="cell-strong min-h-11 flex-1 text-left"
                              onClick={() => openOkr(o, i)}
                            >
                              {displayLabel(o.title, 'Objectif')}
                            </button>
                          ) : (
                            <div className="cell-strong flex-1">
                              {displayLabel(o.title, 'Objectif')}
                            </div>
                          )}
                          {editable ? (
                            <div className="flex shrink-0 items-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="min-h-11 min-w-11"
                                aria-label={
                                  isOutcomeOnKpiBand(o)
                                    ? `Actualiser « ${displayLabel(o.title, 'Objectif')} » dans la bande d’indicateurs`
                                    : `Ajouter « ${displayLabel(o.title, 'Objectif')} » à la bande d’indicateurs`
                                }
                                title={
                                  isOutcomeOnKpiBand(o)
                                    ? 'Actualiser en bande KPI'
                                    : 'Afficher en bande KPI'
                                }
                                onClick={() => void promoteOutcomeToKpi(o)}
                              >
                                <SquareKanban className="size-4" aria-hidden />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="min-h-11 min-w-11"
                                aria-label={`Supprimer l’objectif ${displayLabel(o.title, 'Objectif')}`}
                                onClick={() => void deleteOkrAt(i)}
                              >
                                <Trash2 className="size-4" aria-hidden />
                              </Button>
                            </div>
                          ) : null}
                        </div>
                        <div className="stg-okr-card-meta">
                          <div>
                            <div className="k">Responsable</div>
                            <div className="v">
                              {displayLabel(o.ownerLabel, 'Non renseigné')}
                            </div>
                          </div>
                          <div>
                            <div className="k">Cible</div>
                            <div className="v">
                              {formatOkrValueWithUnit(o.target, o.unit, 'Non renseignée')}
                            </div>
                          </div>
                          <div>
                            <div className="k">Actuel</div>
                            <div className="v">
                              {formatOkrValueWithUnit(o.current, o.unit, 'Non mesuré')}
                            </div>
                          </div>
                          <div>
                            <div className="k">Avancement</div>
                            <div className="prog mt-1" aria-label={`Avancement ${o.progressPct} %`}>
                              <div className="prog-track">
                                <div
                                  className="prog-fill"
                                  style={{
                                    width: `${Math.min(100, Math.max(0, o.progressPct))}%`,
                                    background: progressFillColor(o.progressPct),
                                  }}
                                />
                              </div>
                              <span className="prog-pct">{o.progressPct}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </section>

          <section className="stg-sec">
            <div className="stg-sec-head">
              <div className="stg-sec-t">Budget prévisionnel par horizon</div>
              {canUpdate ? (
                <Button
                  type="button"
                  size="sm"
                  className="min-h-11 sm:min-h-9"
                  disabled={updateMutation.isPending}
                  onClick={() => void saveBudgets()}
                >
                  Enregistrer les budgets
                </Button>
              ) : null}
            </div>
            {Object.keys(budgetDraft).length === 0 && Object.keys(budgetsByYear).length === 0 ? (
              <EmptyState title="Aucun budget" description="Les montants par année n’ont pas été renseignés." />
            ) : (
              <div className="card stg-contrib">
                {Object.keys(budgetDraft)
                  .sort()
                  .map((y) => {
                    const cents = canUpdate
                      ? (parseFloat(String(budgetDraft[y]).replace(',', '.')) || 0) * 100_000
                      : (budgetsByYear[y] ?? 0);
                    const vals = Object.keys(budgetDraft).map((yy) =>
                      canUpdate
                        ? (parseFloat(String(budgetDraft[yy]).replace(',', '.')) || 0) * 100_000
                        : (budgetsByYear[yy] ?? 0),
                    );
                    const max = Math.max(...vals, 1);
                    const pct = Math.round((cents / max) * 100);
                    return (
                      <div key={y} className="stg-contrib-row">
                        <div className="l">{y}</div>
                        {canUpdate ? (
                          <div className="flex min-w-0 items-center gap-2">
                            <Input
                              type="number"
                              min={0}
                              className="min-h-11"
                              aria-label={`Budget ${y} en k€`}
                              value={budgetDraft[y] ?? ''}
                              onChange={(e) =>
                                setBudgetDraft((d) => ({ ...d, [y]: e.target.value }))
                              }
                            />
                            <span className="text-sm text-muted-foreground shrink-0">k€</span>
                          </div>
                        ) : (
                          <div className="t">
                            <i
                              style={{
                                width: `${pct}%`,
                                background: 'var(--brand-gold)',
                              }}
                            />
                          </div>
                        )}
                        <div className="p">{formatEurCents(cents)}</div>
                      </div>
                    );
                  })}
                <div
                  className="stg-contrib-row"
                  style={{ borderTop: '1px solid var(--neutral-100)', paddingTop: 10 }}
                >
                  <div className="l">Total horizon</div>
                  <div className="t" />
                  <div className="p">
                    {formatEurCents(
                      Object.keys(budgetDraft).reduce((s, y) => {
                        const k = parseFloat(String(budgetDraft[y]).replace(',', '.')) || 0;
                        return s + k * 100_000;
                      }, 0),
                    )}
                  </div>
                </div>
                <div className="stg-contrib-row">
                  <div className="l">Charge chantiers</div>
                  <div className="t" />
                  <div className="p">
                    {formatEurCents(
                      initiatives.reduce((s, c) => s + (c.budgetCents || 0), 0),
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      ) : null}

      {tab === 'alignement' ? (
        <div className="space-y-4">
          <section className="stg-sec">
            <div className="stg-sec-head">
              <div>
                <div className="stg-sec-t">Contribution aux axes du groupe</div>
                <div className="stg-sec-sub">
                  Score global d’alignement : {score} %. La contribution déclarée est
                  confrontée aux chantiers réellement rattachés.
                </div>
              </div>
              {canUpdate && visionGroupAxes.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                  {(linksQ.data?.axes.length ?? 0) === 0 ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-h-11 sm:min-h-9"
                      disabled={replaceAxesMutation.isPending}
                      onClick={() => {
                        void replaceAxesMutation
                          .mutateAsync({
                            strategyId,
                            strategicAxisIds: visionGroupAxes.map((a) => a.id),
                          })
                          .then(() => toast.success('Axes du groupe rattachés.'))
                          .catch(() => toast.error('Rattachement impossible.'));
                      }}
                    >
                      Rattacher les axes de la vision
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    className="min-h-11 sm:min-h-9"
                    disabled={updateMutation.isPending}
                    onClick={() => void saveContributions()}
                  >
                    Enregistrer les contributions
                  </Button>
                </div>
              ) : null}
            </div>
            {visionGroupAxes.length === 0 ? (
              <EmptyState
                title="Aucun axe dans la vision"
                description="Créez des axes dans Vision stratégique pour l’alignement."
              />
            ) : (
              <div className="card stg-contrib">
                {visionGroupAxes.map((a) => {
                  const v = canUpdate
                    ? (contribDraft[a.id] ?? contributions[a.id] ?? 0)
                    : (contributions[a.id] ?? 0);
                  const linked = initiatives.filter((c) => c.strategicAxisIds.includes(a.id));
                  return (
                    <div key={a.id}>
                      <div className="stg-contrib-row">
                        <div className="l" title={axisDisplayTitle(a.name, 'Axe')}>
                          <StrategicAxisNameLabel name={a.name} />
                        </div>
                        <div className="t">
                          {canUpdate ? (
                            <input
                              type="range"
                              min={0}
                              max={100}
                              step={5}
                              className="w-full min-h-11"
                              aria-label={`Contribution ${axisDisplayTitle(a.name, 'Axe')}`}
                              value={v}
                              onChange={(e) =>
                                setContribDraft((d) => ({
                                  ...d,
                                  [a.id]: parseInt(e.target.value, 10) || 0,
                                }))
                              }
                            />
                          ) : (
                            <i style={{ width: `${v}%`, background: contribFillColor(v) }} />
                          )}
                        </div>
                        <div className="p">{v}%</div>
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: 'var(--neutral-500)',
                          fontWeight: 600,
                          margin: '-6px 0 8px',
                        }}
                      >
                        {linked.length
                          ? linked.map((c) => displayLabel(c.title, 'Chantier')).join(' · ')
                          : 'aucun chantier rattaché'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="stg-sec">
            <div className="stg-sec-t" style={{ marginBottom: 12 }}>
              Maturité du schéma directeur
            </div>
            {metricsQ.isLoading ? (
              <LoadingState />
            ) : metricsQ.isError ? (
              <ErrorState message="Maturité indisponible" onRetry={() => void metricsQ.refetch()} />
            ) : metrics ? (
              <div className="card stg-contrib">
                {MATURITY_DIMS.map((dim) => {
                  const v = metrics.maturity[dim];
                  return (
                    <div key={dim} className="stg-contrib-row">
                      <div className="l">{dim}</div>
                      <div className="t">
                        <i
                          style={{
                            width: `${v}%`,
                            background: contribFillColor(v),
                          }}
                        />
                      </div>
                      <div className="p">{v}%</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState title="Pas de métriques" />
            )}
          </section>
        </div>
      ) : null}

      {tab === 'alertes' ? (
        <div className="space-y-4">
          <section className="stg-sec">
            <div className="stg-sec-t">Alertes de désalignement &amp; d’exécution</div>
            <div className="stg-sec-sub" style={{ marginBottom: 12 }}>
              {alerts.length
                ? `${alerts.length} alerte${alerts.length > 1 ? 's' : ''} dont ${criticalCount} critique${criticalCount > 1 ? 's' : ''} — calculées à partir des chantiers, du budget et des revues.`
                : 'Aucune alerte : le schéma directeur est complet et à jour.'}
            </div>
            <div className="card tablecard overflow-x-auto">
              <table className="dt">
                <thead>
                  <tr>
                    <th style={{ width: 130 }}>Niveau</th>
                    <th>Alerte</th>
                    <th>Détail</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.length === 0 ? (
                    <tr>
                      <td colSpan={3}>
                        <div className="stg-empty">Aucune alerte détectée sur ce schéma directeur.</div>
                      </td>
                    </tr>
                  ) : (
                    alerts.map((a, i) => (
                      <tr key={`${a.title}-${i}`}>
                        <td>
                          <span className={cn('stg-badge', alertBadge(a.level))}>
                            {alertLevelLabel(a.level)}
                          </span>
                        </td>
                        <td className="cell-strong">
                          <StrategicAxisNameLabel name={a.title} fallback="Alerte" />
                        </td>
                        <td className="text-muted-foreground">
                          {displayLabel(a.detail, '')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="stg-sec">
            <div className="stg-sec-head">
              <div>
                <div className="stg-sec-t">Risques stratégiques déclarés</div>
              </div>
              {canUpdate ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-11 sm:min-h-9"
                  onClick={() => openRisk()}
                >
                  <Plus className="mr-2 size-4" aria-hidden />
                  Ajouter un risque
                </Button>
              ) : null}
            </div>
            <div className="card tablecard overflow-x-auto">
              <table className="dt">
                <thead>
                  <tr>
                    <th>Risque</th>
                    <th>Prob.</th>
                    <th>Impact</th>
                    <th className="right">Propriétaire</th>
                  </tr>
                </thead>
                <tbody>
                  {risks.length === 0 ? (
                    <tr>
                      <td colSpan={4}>
                        <div className="stg-empty">Aucun risque stratégique déclaré.</div>
                      </td>
                    </tr>
                  ) : (
                    risks.map((r, i) => (
                      <tr
                        key={`${r.name}-${i}`}
                        className={cn(canUpdate && 'cursor-pointer')}
                        onClick={() => {
                          if (canUpdate) openRisk(r, i);
                        }}
                        onKeyDown={(e) => {
                          if (canUpdate && (e.key === 'Enter' || e.key === ' ')) {
                            e.preventDefault();
                            openRisk(r, i);
                          }
                        }}
                        tabIndex={canUpdate ? 0 : undefined}
                        aria-label={
                          canUpdate
                            ? `Modifier le risque ${displayLabel(r.name, 'Risque')}`
                            : undefined
                        }
                      >
                        <td>
                          <span className={cn('stg-badge', alertBadge(r.level))}>
                            {displayLabel(r.name, 'Risque')}
                          </span>
                        </td>
                        <td>{displayLabel(r.probability, '—')}</td>
                        <td>{displayLabel(r.impact, '—')}</td>
                        <td className="right">
                          <span className="stg-chip">
                            {displayLabel(r.ownerLabel, 'Propriétaire non renseigné')}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}

      {tab === 'historique' ? (
        <div className="space-y-4">
          <section className="stg-sec">
            <div className="stg-sec-head">
              <div>
                <div className="stg-sec-t">Revues stratégiques &amp; versions</div>
                <div className="stg-sec-sub">
                  {(versionsQ.data?.versions.length ?? 0)} version
                  {(versionsQ.data?.versions.length ?? 0) > 1 ? 's' : ''} · version courante v
                  {versionsQ.data?.versions.find((v) => v.isCurrent)?.versionNumber ?? 1} (
                  {getStrategicDirectionStrategyStatusLabel(strategy.status).toLowerCase()})
                </div>
              </div>
              {showReviewEntry ? (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  onClick={() => setReviewOpen(true)}
                >
                  Nouvelle revue
                </Button>
              ) : null}
            </div>
            {versionsQ.isLoading ? (
              <LoadingState />
            ) : versionsQ.isError ? (
              <ErrorState
                message="Historique indisponible"
                onRetry={() => void versionsQ.refetch()}
              />
            ) : (versionsQ.data?.versions.length ?? 0) === 0 ? (
              <EmptyState title="Aucune version" />
            ) : (
              <div className="card tablecard overflow-x-auto">
                <table className="dt">
                  <thead>
                    <tr>
                      <th scope="col">Version</th>
                      <th scope="col">Date</th>
                      <th scope="col">Intitulé</th>
                      <th scope="col">Instance</th>
                      <th scope="col">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {versionsQ.data!.versions.map((v) => {
                      const versionShort = `v${v.versionNumber}`;
                      const dated = formatReviewDate(
                        v.approvedAt ?? v.archivedAt ?? v.updatedAt,
                      );
                      const intitule = displayLabel(
                        v.reviewNote || v.rejectionReason || v.archivedReason || v.title,
                        'Revue stratégique',
                      );
                      const instance = displayLabel(
                        v.reviewInstanceLabel,
                        v.isCurrent ? 'Version courante' : 'Version archivée',
                      );
                      return (
                        <tr
                          key={v.id}
                          className={v.isCurrent ? 'stg-rev-row--current' : undefined}
                        >
                          <td className="cell-strong">
                            <span className="tabular-nums">{versionShort}</span>
                            {v.isCurrent ? (
                              <span className="stg-badge bdg-gold nodot ml-2">Courante</span>
                            ) : null}
                          </td>
                          <td className="whitespace-nowrap text-muted-foreground tabular-nums">
                            {dated}
                          </td>
                          <td>{intitule}</td>
                          <td className="text-muted-foreground">{instance}</td>
                          <td>
                            <span className={cn('stg-badge', strategyStatusBadgeClass(v.status))}>
                              {getStrategicDirectionStrategyStatusLabel(v.status)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      ) : null}

      {/* Print block — visible only via print CSS */}
      <div id="stg-print" aria-hidden>
        <div className="stg-p-h">
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 6,
              background: T.bg,
              color: T.c,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '11pt',
            }}
          >
            {code}
          </div>
          <div style={{ flex: 1 }}>
            <h1>
              {name} — schéma directeur {displayLabel(strategy.horizonLabel, '')}
            </h1>
            <div className="s">
              {heroDirector} ·{' '}
              {getStrategicDirectionStrategyStatusLabel(strategy.status)} · alignement {score}%
            </div>
          </div>
        </div>
        <div className="stg-p-amb">{displayLabel(strategy.ambition, '')}</div>
        <div className="stg-p-cols">
          <div>
            <div className="stg-p-t">Chantiers majeurs</div>
            <div className="stg-p-l">
              {initiatives.map((c) => (
                <div key={c.id}>
                  <span>{displayLabel(c.title, 'Chantier')}</span>
                  <b>{c.progressPct}%</b>
                </div>
              ))}
            </div>
            <div className="stg-p-t" style={{ marginTop: 9 }}>
              Objectifs mesurables
            </div>
            <div className="stg-p-l">
              {outcomes.map((o, i) => (
                <div key={i}>
                  <span>{displayLabel(o.title, 'Objectif')}</span>
                  <b>{o.progressPct}%</b>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="stg-p-t">Budget par horizon</div>
            <div className="stg-p-l">
              {Object.keys(budgetsByYear)
                .sort()
                .map((y) => (
                  <div key={y}>
                    <span>{y}</span>
                    <b>{formatEurCents(budgetsByYear[y])}</b>
                  </div>
                ))}
            </div>
            <div className="stg-p-t" style={{ marginTop: 9 }}>
              Indicateurs
            </div>
            <div className="stg-p-l">
              {kpis.map((k, i) => (
                <div key={i}>
                  <span>{displayLabel(k.label, 'KPI')}</span>
                  <b>{displayLabel(k.value, '—')}</b>
                </div>
              ))}
            </div>
            <div className="stg-p-t" style={{ marginTop: 9 }}>
              Risques
            </div>
            <div className="stg-p-l">
              {risks.map((r, i) => (
                <div key={i}>
                  <span>{displayLabel(r.name, 'Risque')}</span>
                  <b>
                    {displayLabel(
                      r.level === 'danger'
                        ? 'Critique'
                        : r.level === 'warning'
                          ? 'Attention'
                          : 'Info',
                      '—',
                    )}
                  </b>
                </div>
              ))}
            </div>
            <div className="stg-p-t" style={{ marginTop: 9 }}>
              Axes propres
            </div>
            <div className="stg-p-l">
              {ownAxes.map((a) => (
                <div key={a.id}>
                  <span>
                    <StrategicAxisNameLabel name={a.name} />
                  </span>
                  <b>{displayLabel(a.tone, '—')}</b>
                </div>
              ))}
            </div>
            <div className="stg-p-t" style={{ marginTop: 9 }}>
              Contributions axes groupe
            </div>
            <div className="stg-p-l">
              {(linksQ.data?.axes ?? []).map((a) => (
                <div key={a.id}>
                  <span>
                    <StrategicAxisNameLabel name={a.name} />
                  </span>
                  <b>{contributions[a.id] ?? 0}%</b>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <StariumModal
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Modifier le schéma"
        description={`${code} — ${name}`}
        icon={Pencil}
        size="lg"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => setEditOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              className="min-h-11"
              disabled={updateMutation.isPending}
              onClick={() => void saveEdit()}
            >
              Enregistrer
            </Button>
          </>
        }
      >
        <div className="starium-form space-y-4">
          <div className="starium-form-field">
            <label className="starium-form-label" htmlFor="stg-edit-ambition">
              Ambition stratégique
            </label>
            <Textarea
              id="stg-edit-ambition"
              className="min-h-24"
              value={ambitionDraft}
              onChange={(e) => setAmbitionDraft(e.target.value)}
            />
          </div>
          <div className="starium-form-field">
            <label className="starium-form-label" htmlFor="stg-edit-context">
              Périmètre &amp; contexte
            </label>
            <Textarea
              id="stg-edit-context"
              className="min-h-20"
              value={contextDraft}
              onChange={(e) => setContextDraft(e.target.value)}
            />
          </div>
          <div className="starium-form-field">
            <label className="starium-form-label" htmlFor="stg-edit-horizon">
              Horizon
            </label>
            <Input
              id="stg-edit-horizon"
              className="min-h-11"
              value={horizonDraft}
              onChange={(e) => setHorizonDraft(e.target.value)}
              placeholder="2026 → 2028"
            />
          </div>
          <div className="starium-form-field">
            <label className="starium-form-label" htmlFor="stg-edit-owner">
              Sponsor / directeur·rice
            </label>
            <Input
              id="stg-edit-owner"
              className="min-h-11"
              value={ownerDraft}
              onChange={(e) => setOwnerDraft(e.target.value)}
              placeholder="Nom affiché"
            />
          </div>
        </div>
      </StariumModal>

      <StariumModal
        open={initiativeOpen}
        onOpenChange={setInitiativeOpen}
        title={editingInitiativeId ? 'Modifier le chantier' : 'Nouveau chantier'}
        description="Fenêtre, axes du groupe, jalons et avancement"
        icon={Target}
        size="lg"
        footer={
          <>
            {editingInitiativeId && canUpdate ? (
              <Button
                type="button"
                variant="outline"
                className="min-h-11 text-destructive border-destructive/40"
                disabled={updateMutation.isPending}
                onClick={() => void deleteInitiative()}
              >
                <Trash2 className="mr-2 size-4" aria-hidden />
                Supprimer
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => setInitiativeOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              className="min-h-11"
              disabled={updateMutation.isPending}
              onClick={() => void saveInitiative()}
            >
              Enregistrer
            </Button>
          </>
        }
      >
        <div className="starium-form space-y-4">
          <div className="starium-form-field">
            <label className="starium-form-label" htmlFor="stg-init-title">
              Intitulé <span className="text-destructive">*</span>
            </label>
            <Input
              id="stg-init-title"
              className="min-h-11"
              value={initiativeDraft.title}
              onChange={(e) =>
                setInitiativeDraft((d) => ({ ...d, title: e.target.value }))
              }
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="starium-form-field">
              <label className="starium-form-label" htmlFor="stg-init-owner">
                Pilote
              </label>
              <Input
                id="stg-init-owner"
                className="min-h-11"
                value={initiativeDraft.ownerLabel}
                onChange={(e) =>
                  setInitiativeDraft((d) => ({ ...d, ownerLabel: e.target.value }))
                }
              />
            </div>
            <div className="starium-form-field">
              <label className="starium-form-label" htmlFor="stg-init-bud">
                Budget (k€)
              </label>
              <Input
                id="stg-init-bud"
                type="number"
                min={0}
                className="min-h-11"
                value={Math.round(initiativeDraft.budgetCents / 100_000) || ''}
                onChange={(e) =>
                  setInitiativeDraft((d) => ({
                    ...d,
                    budgetCents: (parseInt(e.target.value, 10) || 0) * 100_000,
                  }))
                }
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="starium-form-field">
              <label className="starium-form-label" htmlFor="stg-init-lane">
                Axe propre (lane)
              </label>
              <Select
                value={String(initiativeDraft.lane)}
                onValueChange={(v) =>
                  setInitiativeDraft((d) => ({ ...d, lane: parseInt(v ?? '0', 10) || 0 }))
                }
              >
                <SelectTrigger id="stg-init-lane" className="min-h-11 w-full">
                  <SelectValue placeholder="Choisir un axe">
                    <StrategicAxisNameLabel
                      name={
                        (ownAxes.length > 0
                          ? ownAxes
                          : [{ id: '0', name: 'Chantiers', tone: 'info' as const }]
                        )[initiativeDraft.lane]?.name
                      }
                      fallback="Chantiers"
                    />
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(ownAxes.length > 0 ? ownAxes : [{ id: '0', name: 'Chantiers', tone: 'info' }]).map(
                    (a, i) => (
                      <SelectItem key={a.id} value={String(i)}>
                        <StrategicAxisNameLabel name={a.name} />
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="starium-form-field">
              <label className="starium-form-label" htmlFor="stg-init-s">
                Début
              </label>
              <Select
                value={String(snapToQuarter(initiativeDraft.startMonthOffset))}
                onValueChange={(v) =>
                  setInitiativeDraft((d) => ({
                    ...d,
                    startMonthOffset: parseInt(v ?? '0', 10) || 0,
                  }))
                }
              >
                <SelectTrigger id="stg-init-s" className="min-h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {qOpts.map((o) => (
                    <SelectItem key={`s-${o.value}`} value={String(o.value)}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="starium-form-field">
              <label className="starium-form-label" htmlFor="stg-init-e">
                Fin
              </label>
              <Select
                value={String(snapToQuarter(initiativeDraft.endMonthOffset))}
                onValueChange={(v) =>
                  setInitiativeDraft((d) => ({
                    ...d,
                    endMonthOffset: parseInt(v ?? '0', 10) || 0,
                  }))
                }
              >
                <SelectTrigger id="stg-init-e" className="min-h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {qOpts.map((o) => (
                    <SelectItem key={`e-${o.value}`} value={String(o.value)}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <fieldset className="starium-form-field">
            <legend className="starium-form-label">Axes du groupe</legend>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Axes du groupe">
              {visionGroupAxes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucun axe dans la vision alignée. Créez des axes dans Vision stratégique.
                </p>
              ) : (
                visionGroupAxes.map((a) => {
                  const selected = initiativeDraft.strategicAxisIds.includes(a.id);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      className={cn(
                        'min-h-11 rounded-full border px-3 text-sm font-semibold',
                        selected
                          ? 'border-[color:var(--brand-gold)] bg-[color:var(--brand-gold-050)] text-[color:var(--brand-gold-700)]'
                          : 'border-border bg-card text-foreground',
                      )}
                      aria-pressed={selected}
                      aria-label={axisDisplayTitle(a.name, 'Axe')}
                      onClick={() =>
                        setInitiativeDraft((d) => ({
                          ...d,
                          strategicAxisIds: selected
                            ? d.strategicAxisIds.filter((id) => id !== a.id)
                            : [...d.strategicAxisIds, a.id],
                        }))
                      }
                    >
                      <StrategicAxisNameLabel name={a.name} />
                    </button>
                  );
                })
              )}
            </div>
          </fieldset>

          <div className="starium-form-field space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="starium-form-label mb-0">Jalons</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-11 sm:min-h-9"
                onClick={() =>
                  setInitiativeDraft((d) => ({
                    ...d,
                    milestones: [
                      ...d.milestones,
                      { monthOffset: d.startMonthOffset, label: '' },
                    ],
                  }))
                }
              >
                <Plus className="mr-1 size-4" aria-hidden />
                Ajouter un jalon
              </Button>
            </div>
            {(initiativeDraft.milestones ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun jalon.</p>
            ) : (
              initiativeDraft.milestones.map((m, idx) => (
                <div key={`ms-${idx}`} className="grid gap-2 sm:grid-cols-[140px_1fr_auto]">
                  <Select
                    value={String(snapToQuarter(m.monthOffset))}
                    onValueChange={(v) =>
                      setInitiativeDraft((d) => {
                        const milestones = [...d.milestones];
                        milestones[idx] = {
                          ...milestones[idx],
                          monthOffset: parseInt(v ?? '0', 10) || 0,
                        };
                        return { ...d, milestones };
                      })
                    }
                  >
                    <SelectTrigger
                      className="min-h-11 w-full"
                      aria-label={`Trimestre jalon ${idx + 1}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {qOpts.map((o) => (
                        <SelectItem key={`ms-${idx}-${o.value}`} value={String(o.value)}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    className="min-h-11"
                    value={m.label}
                    placeholder="Libellé du jalon"
                    aria-label={`Libellé jalon ${idx + 1}`}
                    onChange={(e) =>
                      setInitiativeDraft((d) => {
                        const milestones = [...d.milestones];
                        milestones[idx] = { ...milestones[idx], label: e.target.value };
                        return { ...d, milestones };
                      })
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="min-h-11 min-w-11"
                    aria-label={`Retirer le jalon ${idx + 1}`}
                    onClick={() =>
                      setInitiativeDraft((d) => ({
                        ...d,
                        milestones: d.milestones.filter((_, i) => i !== idx),
                      }))
                    }
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </div>
              ))
            )}
          </div>

          <div className="starium-form-field">
            <label className="starium-form-label" htmlFor="stg-init-pct">
              Avancement — {initiativeDraft.progressPct}%
            </label>
            <Input
              id="stg-init-pct"
              type="range"
              min={0}
              max={100}
              step={5}
              value={initiativeDraft.progressPct}
              onChange={(e) =>
                setInitiativeDraft((d) => ({
                  ...d,
                  progressPct: parseInt(e.target.value, 10) || 0,
                }))
              }
            />
          </div>
        </div>
      </StariumModal>

      <StariumModal
        open={okrOpen}
        onOpenChange={setOkrOpen}
        title={editingOkrIndex != null ? 'Modifier l’objectif' : 'Nouvel objectif mesurable'}
        description="Résultat attendu et indicateur de suivi"
        icon={CheckCircle2}
        size="xl"
        contentClassName="sm:max-w-2xl"
        footer={
          <>
            {editingOkrIndex != null && canUpdate ? (
              <Button
                type="button"
                variant="outline"
                className="min-h-11 text-destructive border-destructive/40"
                disabled={updateMutation.isPending}
                onClick={() => void deleteOkr()}
              >
                <Trash2 className="mr-2 size-4" aria-hidden />
                Supprimer
              </Button>
            ) : null}
            {canUpdate &&
            strategy?.status !== 'ARCHIVED' &&
            strategy?.status !== 'SUBMITTED' &&
            okrDraft.title.trim() ? (
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                disabled={updateMutation.isPending}
                onClick={() => void promoteOutcomeToKpi(okrDraft)}
              >
                <SquareKanban className="mr-2 size-4" aria-hidden />
                {isOutcomeOnKpiBand(okrDraft)
                  ? 'Lié à la bande KPI'
                  : 'Afficher en bande KPI'}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => setOkrOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              className="min-h-11"
              disabled={updateMutation.isPending}
              onClick={() => void saveOkr()}
            >
              Enregistrer
            </Button>
          </>
        }
      >
        <div className="starium-form space-y-4">
          <div className="starium-form-field">
            <label className="starium-form-label" htmlFor="stg-okr-t">
              Objectif <span className="text-destructive">*</span>
            </label>
            <Input
              id="stg-okr-t"
              className="min-h-11"
              value={okrDraft.title}
              onChange={(e) => setOkrDraft((d) => ({ ...d, title: e.target.value }))}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="starium-form-field">
              <HumanResourceCombobox
                id="stg-okr-who"
                label="Responsable"
                dialogOpen={okrOpen}
                value={okrOwnerResourceId}
                fallbackLabel={okrDraft.ownerLabel || null}
                onChange={(id) => {
                  setOkrOwnerResourceId(id);
                  if (!id.trim()) {
                    setOkrDraft((d) => ({ ...d, ownerLabel: '' }));
                  }
                }}
                onPickResource={(resource) => {
                  setOkrDraft((d) => ({
                    ...d,
                    ownerLabel: humanResourceLeadLabel(resource),
                  }));
                }}
              />
            </div>
            <div className="starium-form-field">
              <label className="starium-form-label" htmlFor="stg-okr-tgt">
                Indicateur cible
              </label>
              <Input
                id="stg-okr-tgt"
                className="min-h-11"
                inputMode="decimal"
                value={okrDraft.target}
                onChange={(e) => {
                  const target = e.target.value;
                  setOkrDraft((d) => {
                    const next = { ...d, target };
                    const auto = computeOkrProgressPct(next.current, target);
                    return auto == null ? next : { ...next, progressPct: auto };
                  });
                }}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="starium-form-field">
              <label className="starium-form-label" htmlFor="stg-okr-cur">
                Valeur actuelle
              </label>
              <Input
                id="stg-okr-cur"
                className="min-h-11"
                inputMode="decimal"
                value={okrDraft.current}
                onChange={(e) => {
                  const current = e.target.value;
                  setOkrDraft((d) => {
                    const next = { ...d, current };
                    const auto = computeOkrProgressPct(current, next.target);
                    return auto == null ? next : { ...next, progressPct: auto };
                  });
                }}
              />
            </div>
            <div className="starium-form-field">
              <label className="starium-form-label" htmlFor="stg-okr-unit">
                Unité
              </label>
              <Input
                id="stg-okr-unit"
                className="min-h-11"
                placeholder="%, jours, k€…"
                value={okrDraft.unit}
                onChange={(e) => setOkrDraft((d) => ({ ...d, unit: e.target.value }))}
                maxLength={32}
              />
            </div>
          </div>
          <div className="starium-form-field">
            {(() => {
              const autoPct = computeOkrProgressPct(okrDraft.current, okrDraft.target);
              return (
                <>
                  <label className="starium-form-label" htmlFor="stg-okr-pct">
                    Avancement — {okrDraft.progressPct}%
                    {autoPct != null ? (
                      <span className="ml-2 font-normal text-muted-foreground normal-case tracking-normal">
                        (calculé automatiquement)
                      </span>
                    ) : null}
                  </label>
                  {autoPct != null ? (
                    <div
                      className="prog mt-1"
                      aria-label={`Avancement calculé ${okrDraft.progressPct} %`}
                    >
                      <div className="prog-track">
                        <div
                          className="prog-fill"
                          style={{
                            width: `${Math.min(100, Math.max(0, okrDraft.progressPct))}%`,
                            background: progressFillColor(okrDraft.progressPct),
                          }}
                        />
                      </div>
                      <span className="prog-pct">{okrDraft.progressPct}%</span>
                    </div>
                  ) : (
                    <>
                      <p className="mb-2 text-xs text-muted-foreground">
                        Saisissez des chiffres pour cible et actuel afin de calculer
                        automatiquement, ou réglez manuellement.
                      </p>
                      <Input
                        id="stg-okr-pct"
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={okrDraft.progressPct}
                        onChange={(e) =>
                          setOkrDraft((d) => ({
                            ...d,
                            progressPct: parseInt(e.target.value, 10) || 0,
                          }))
                        }
                      />
                    </>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      </StariumModal>

      <StariumModal
        open={blockOpen}
        onOpenChange={setBlockOpen}
        title={editingBlockIndex != null ? 'Modifier le bloc' : 'Nouveau bloc'}
        description="Note ou pièce du schéma directeur"
        icon={FileText}
        size="lg"
        footer={
          <>
            {editingBlockIndex != null && canUpdate ? (
              <Button
                type="button"
                variant="outline"
                className="min-h-11 text-destructive border-destructive/40"
                disabled={updateMutation.isPending}
                onClick={() => void deleteBlock()}
              >
                <Trash2 className="mr-2 size-4" aria-hidden />
                Supprimer
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => setBlockOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              className="min-h-11"
              disabled={updateMutation.isPending}
              onClick={() => void saveBlock()}
            >
              Enregistrer
            </Button>
          </>
        }
      >
        <div className="starium-form space-y-4">
          <div className="starium-form-field">
            <label className="starium-form-label" htmlFor="stg-block-kind">
              Type
            </label>
            <Select
              value={blockDraft.kind}
              onValueChange={(v) =>
                setBlockDraft((d) => ({
                  ...d,
                  kind: v === 'image' ? 'image' : v === 'document' ? 'document' : 'text',
                  documentId:
                    v === 'text' ? null : d.documentId,
                }))
              }
            >
              <SelectTrigger id="stg-block-kind" className="min-h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Texte</SelectItem>
                <SelectItem value="image">Image / schéma</SelectItem>
                <SelectItem value="document">Document (PDF, image…)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="starium-form-field">
            <label className="starium-form-label" htmlFor="stg-block-title">
              Titre <span className="text-destructive">*</span>
            </label>
            <Input
              id="stg-block-title"
              className="min-h-11"
              value={blockDraft.title}
              onChange={(e) => setBlockDraft((d) => ({ ...d, title: e.target.value }))}
            />
          </div>
          <div className="starium-form-field">
            <label className="starium-form-label" htmlFor="stg-block-body">
              {blockDraft.kind === 'image'
                ? 'Légende / consigne'
                : blockDraft.kind === 'document'
                  ? 'Description (optionnelle)'
                  : 'Contenu'}
            </label>
            <Textarea
              id="stg-block-body"
              className="min-h-24"
              value={blockDraft.body}
              onChange={(e) => setBlockDraft((d) => ({ ...d, body: e.target.value }))}
              placeholder={
                blockDraft.kind === 'image'
                  ? 'Légende affichée sous le schéma.'
                  : blockDraft.kind === 'document'
                    ? 'Contexte ou consigne d’usage du document.'
                    : undefined
              }
            />
          </div>
          {blockDraft.kind === 'image' || blockDraft.kind === 'document' ? (
            <StrategyDocumentPicker
              strategyId={strategyId}
              value={blockDraft.documentId}
              onLinkDocument={(documentId, document) =>
                setBlockDraft((d) => ({
                  ...d,
                  documentId,
                  title:
                    d.title.trim() ||
                    displayLabel(document?.name, '').trim() ||
                    d.title,
                }))
              }
              label={
                blockDraft.kind === 'image' ? 'Image / schéma' : 'Document joint'
              }
            />
          ) : null}
        </div>
      </StariumModal>

      <StariumModal
        open={riskOpen}
        onOpenChange={setRiskOpen}
        title={editingRiskIndex != null ? 'Modifier le risque' : 'Nouveau risque stratégique'}
        description="Probabilité, impact et propriétaire"
        icon={AlertTriangle}
        size="lg"
        footer={
          <>
            {editingRiskIndex != null && canUpdate ? (
              <Button
                type="button"
                variant="outline"
                className="min-h-11 text-destructive border-destructive/40"
                disabled={updateMutation.isPending}
                onClick={() => void deleteRisk()}
              >
                <Trash2 className="mr-2 size-4" aria-hidden />
                Supprimer
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => setRiskOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              className="min-h-11"
              disabled={updateMutation.isPending}
              onClick={() => void saveRisk()}
            >
              Enregistrer
            </Button>
          </>
        }
      >
        <div className="starium-form space-y-4">
          <div className="starium-form-field">
            <label className="starium-form-label" htmlFor="stg-risk-name">
              Risque <span className="text-destructive">*</span>
            </label>
            <Input
              id="stg-risk-name"
              className="min-h-11"
              value={riskDraft.name}
              onChange={(e) => setRiskDraft((d) => ({ ...d, name: e.target.value }))}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="starium-form-field">
              <label className="starium-form-label" htmlFor="stg-risk-lvl">
                Niveau
              </label>
              <Select
                value={riskDraft.level}
                onValueChange={(v) =>
                  setRiskDraft((d) => ({
                    ...d,
                    level: v === 'danger' || v === 'info' ? v : 'warning',
                  }))
                }
              >
                <SelectTrigger id="stg-risk-lvl" className="min-h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="danger">Critique</SelectItem>
                  <SelectItem value="warning">Attention</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="starium-form-field">
              <label className="starium-form-label" htmlFor="stg-risk-p">
                Probabilité
              </label>
              <Input
                id="stg-risk-p"
                className="min-h-11"
                value={riskDraft.probability}
                onChange={(e) => setRiskDraft((d) => ({ ...d, probability: e.target.value }))}
              />
            </div>
            <div className="starium-form-field">
              <label className="starium-form-label" htmlFor="stg-risk-i">
                Impact
              </label>
              <Input
                id="stg-risk-i"
                className="min-h-11"
                value={riskDraft.impact}
                onChange={(e) => setRiskDraft((d) => ({ ...d, impact: e.target.value }))}
              />
            </div>
          </div>
          <div className="starium-form-field">
            <label className="starium-form-label" htmlFor="stg-risk-own">
              Propriétaire
            </label>
            <Input
              id="stg-risk-own"
              className="min-h-11"
              value={riskDraft.ownerLabel}
              onChange={(e) => setRiskDraft((d) => ({ ...d, ownerLabel: e.target.value }))}
            />
          </div>
          <div className="starium-form-field">
            <label className="starium-form-label" htmlFor="stg-risk-mit">
              Mitigation
            </label>
            <Textarea
              id="stg-risk-mit"
              className="min-h-20"
              value={riskDraft.mitigation}
              onChange={(e) => setRiskDraft((d) => ({ ...d, mitigation: e.target.value }))}
            />
          </div>
        </div>
      </StariumModal>

      <StariumModal
        open={axisOpen}
        onOpenChange={setAxisOpen}
        title={editingAxisIndex != null ? 'Modifier l’axe propre' : 'Nouvel axe propre'}
        description="Lane de la timeline des chantiers"
        icon={Target}
        size="md"
        footer={
          <>
            {editingAxisIndex != null && canUpdate ? (
              <Button
                type="button"
                variant="outline"
                className="min-h-11 text-destructive border-destructive/40"
                disabled={updateMutation.isPending}
                onClick={() => void deleteAxis()}
              >
                <Trash2 className="mr-2 size-4" aria-hidden />
                Supprimer
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => setAxisOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              className="min-h-11"
              disabled={updateMutation.isPending}
              onClick={() => void saveAxis()}
            >
              Enregistrer
            </Button>
          </>
        }
      >
        <div className="starium-form space-y-4">
          <div className="starium-form-field">
            <label className="starium-form-label" htmlFor="stg-axis-name">
              Nom <span className="text-destructive">*</span>
            </label>
            <Input
              id="stg-axis-name"
              className="min-h-11"
              value={axisDraft.name}
              onChange={(e) => setAxisDraft((d) => ({ ...d, name: e.target.value }))}
            />
          </div>
          <fieldset className="starium-form-field">
            <legend className="starium-form-label">Teinte</legend>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Teinte de l’axe">
              {AXIS_TONES.map((t) => {
                const selected = axisDraft.tone === t.value;
                const tone = stgTone(t.value);
                return (
                  <button
                    key={t.value}
                    type="button"
                    className={cn(
                      'min-h-11 rounded-full border px-3 text-sm font-semibold',
                      selected ? 'border-[color:var(--brand-gold)]' : 'border-border',
                    )}
                    style={{ background: tone.bg, color: tone.c }}
                    aria-pressed={selected}
                    onClick={() => setAxisDraft((d) => ({ ...d, tone: t.value }))}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>
      </StariumModal>

      <StariumModal
        open={kpiOpen}
        onOpenChange={setKpiOpen}
        title={editingKpiIndex != null ? 'Modifier l’indicateur' : 'Nouvel indicateur'}
        description="KPI affiché en tête du schéma directeur"
        icon={CheckCircle2}
        size="md"
        footer={
          <>
            {editingKpiIndex != null && canUpdate ? (
              <Button
                type="button"
                variant="outline"
                className="min-h-11 text-destructive border-destructive/40"
                disabled={updateMutation.isPending}
                onClick={() => void deleteKpi()}
              >
                <Trash2 className="mr-2 size-4" aria-hidden />
                Supprimer
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => setKpiOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              className="min-h-11"
              disabled={updateMutation.isPending}
              onClick={() => void saveKpi()}
            >
              Enregistrer
            </Button>
          </>
        }
      >
        <div className="starium-form space-y-4">
          <div className="starium-form-field">
            <label className="starium-form-label" htmlFor="stg-kpi-l">
              Libellé <span className="text-destructive">*</span>
            </label>
            <Input
              id="stg-kpi-l"
              className="min-h-11"
              value={kpiDraft.label}
              onChange={(e) => setKpiDraft((d) => ({ ...d, label: e.target.value }))}
            />
          </div>
          <div className="starium-form-field">
            <label className="starium-form-label" htmlFor="stg-kpi-v">
              Valeur
            </label>
            <Input
              id="stg-kpi-v"
              className="min-h-11"
              value={kpiDraft.value}
              onChange={(e) => setKpiDraft((d) => ({ ...d, value: e.target.value }))}
            />
          </div>
          <div className="starium-form-field">
            <label className="starium-form-label" htmlFor="stg-kpi-d">
              Détail / cible
            </label>
            <Input
              id="stg-kpi-d"
              className="min-h-11"
              value={kpiDraft.detail}
              onChange={(e) => setKpiDraft((d) => ({ ...d, detail: e.target.value }))}
            />
          </div>
        </div>
      </StariumModal>

      <StariumModal
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        title="Nouvelle revue stratégique"
        description="Soumettre ou valider le schéma directeur"
        icon={ClipboardCheck}
        size="lg"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => setReviewOpen(false)}
            >
              Annuler
            </Button>
            {(strategy.status === 'DRAFT' || strategy.status === 'REJECTED') && canSubmit ? (
              <Button
                type="button"
                className="min-h-11"
                disabled={submitMutation.isPending}
                onClick={() => void handleSubmitReview()}
              >
                {STRATEGIC_DIRECTION_STRATEGY_SUBMIT_LABEL}
              </Button>
            ) : null}
            {strategy.status === 'SUBMITTED' && canDecide ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  disabled={reviewMutation.isPending}
                  onClick={() => void handleReject()}
                >
                  {STRATEGIC_DIRECTION_STRATEGY_REJECT_LABEL}
                </Button>
                <Button
                  type="button"
                  className="min-h-11"
                  disabled={reviewMutation.isPending}
                  onClick={() => void handleApprove()}
                >
                  {STRATEGIC_DIRECTION_STRATEGY_APPROVE_LABEL}
                </Button>
              </>
            ) : null}
          </>
        }
      >
        <div className="starium-form space-y-4">
          {(strategy.status === 'DRAFT' || strategy.status === 'REJECTED') && allowPickValidator ? (
            <div className="starium-form-field">
              <label className="starium-form-label" htmlFor="stg-rev-validator">
                Validateur
              </label>
              <Select
                value={submitValidatorUserId || undefined}
                onValueChange={(v) => setSubmitValidatorUserId(v ?? '')}
              >
                <SelectTrigger id="stg-rev-validator" className="min-h-11 w-full">
                  <SelectValue placeholder="Choisir un validateur" />
                </SelectTrigger>
                <SelectContent>
                  {(validatorsQ.data ?? []).map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {firstDisplayLabel([u.displayName, u.email], 'Validateur')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          {(strategy.status === 'DRAFT' ||
            strategy.status === 'REJECTED' ||
            strategy.status === 'SUBMITTED') && (
            <>
              <div className="starium-form-field">
                <label className="starium-form-label" htmlFor="stg-rev-instance">
                  Instance
                </label>
                <Input
                  id="stg-rev-instance"
                  className="min-h-11"
                  value={reviewInstanceLabel}
                  onChange={(e) => setReviewInstanceLabel(e.target.value)}
                  placeholder="CODIR"
                />
              </div>
              <div className="starium-form-field">
                <label className="starium-form-label" htmlFor="stg-rev-note">
                  Note de décisions
                </label>
                <Textarea
                  id="stg-rev-note"
                  className="min-h-20"
                  value={decisionNote}
                  onChange={(e) => setDecisionNote(e.target.value)}
                  placeholder="Synthèse de la revue"
                />
              </div>
            </>
          )}
          {strategy.status === 'SUBMITTED' && canDecide ? (
            <div className="starium-form-field">
              <label className="starium-form-label" htmlFor="stg-rev-reject">
                Motif de refus (si refus)
              </label>
              <Textarea
                id="stg-rev-reject"
                className="min-h-20"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
          ) : null}
          {strategy.status === 'APPROVED' ? (
            <p className="text-sm text-muted-foreground">
              Ce schéma est déjà validé. Utilisez le bouton « Nouvelle version » dans l’en-tête pour
              ouvrir un brouillon éditable, ou « Archiver » pour le désactiver.
            </p>
          ) : null}
        </div>
      </StariumModal>

      <StariumModal
        open={adaptOpen}
        onOpenChange={setAdaptOpen}
        title="Nouvelle version du schéma"
        description="Archive un snapshot de la version validée et rouvre un brouillon éditable."
        icon={GitBranch}
        size="md"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => setAdaptOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              className="min-h-11"
              disabled={updateMutation.isPending || !adaptReason.trim()}
              onClick={() => void handleAdaptVersion()}
            >
              Créer la version
            </Button>
          </>
        }
      >
        <div className="starium-form space-y-4">
          <div className="starium-form-field">
            <label className="starium-form-label" htmlFor="stg-adapt-reason">
              Motif de la nouvelle version
            </label>
            <Textarea
              id="stg-adapt-reason"
              className="min-h-20"
              value={adaptReason}
              onChange={(e) => setAdaptReason(e.target.value)}
              aria-invalid={!adaptReason.trim() ? true : undefined}
              placeholder="Ex. : révision suite CODIR mars 2026"
            />
          </div>
        </div>
      </StariumModal>

      <StariumModal
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="Archiver le schéma"
        description="Le schéma passera en lecture seule. Un nouveau schéma pourra être créé pour la même direction et vision."
        icon={Archive}
        size="md"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => setArchiveOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              className="min-h-11"
              disabled={archiveMutation.isPending || !archiveReasonDraft.trim()}
              onClick={() => void handleArchiveStrategy()}
            >
              Archiver
            </Button>
          </>
        }
      >
        <div className="starium-form space-y-4">
          <p className="text-sm text-muted-foreground">
            Différent de « Nouvelle version » : l’archivage désactive ce schéma sans ouvrir de
            brouillon.
          </p>
          <div className="starium-form-field">
            <label className="starium-form-label" htmlFor="stg-archive-reason">
              Motif d’archivage
            </label>
            <Textarea
              id="stg-archive-reason"
              className="min-h-20"
              value={archiveReasonDraft}
              onChange={(e) => setArchiveReasonDraft(e.target.value)}
              aria-invalid={!archiveReasonDraft.trim() ? true : undefined}
              placeholder="Ex. : fin de cycle stratégique"
            />
          </div>
        </div>
      </StariumModal>

      <StrategicDirectionCreateEditDialog
        mode="edit"
        open={directionEditOpen}
        onOpenChange={setDirectionEditOpen}
        direction={directionForEdit}
        onSuccess={() => {
          void detailQ.refetch();
          void directionsQ.refetch();
        }}
      />
      </div>
    </PageContainer>
  );
}
