/**
 * RFC-STRAT-011 — normalise les JSON stratégie (forme mock) + rétrocompat legacy.
 */

export type NormalizedOwnAxis = { id: string; name: string; tone: string };
export type NormalizedMilestone = { monthOffset: number; label: string };
export type NormalizedInitiative = {
  id: string;
  title: string;
  description: string;
  ownerLabel: string;
  budgetCents: number;
  progressPct: number;
  lane: number;
  startMonthOffset: number;
  endMonthOffset: number;
  strategicAxisIds: string[];
  milestones: NormalizedMilestone[];
  linkedProjectNames: string[];
};
export type NormalizedOutcome = {
  title: string;
  ownerLabel: string;
  target: string;
  current: string;
  progressPct: number;
};
export type NormalizedKpi = { label: string; value: string; detail: string };
export type NormalizedRisk = {
  name: string;
  probability: string;
  impact: string;
  ownerLabel: string;
  level: 'danger' | 'warning' | 'info';
  mitigation: string;
};
export type NormalizedContentBlock = {
  kind: 'text' | 'image';
  title: string;
  body: string;
  documentId: string | null;
};
export type NormalizedPriority = { title: string; description: string };

export type NormalizedStrategySchema = {
  ownAxes: NormalizedOwnAxis[];
  majorInitiatives: NormalizedInitiative[];
  expectedOutcomes: NormalizedOutcome[];
  kpis: NormalizedKpi[];
  risks: NormalizedRisk[];
  contentBlocks: NormalizedContentBlock[];
  strategicPriorities: NormalizedPriority[];
  budgetsByYear: Record<string, number>;
  axisContributions: Record<string, number>;
  horizonStartYear: number;
  horizonYearCount: number;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function str(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return fallback;
}

function int(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) return Math.round(n);
  }
  return fallback;
}

function clampPct(value: unknown): number {
  return Math.max(0, Math.min(100, int(value, 0)));
}

function parseHorizonLabel(label: string | null | undefined): { start: number; count: number } {
  const m = (label ?? '').match(/(20\d{2})\s*[→\-~–]+\s*(20\d{2})/);
  if (m) {
    const start = Number(m[1]);
    const end = Number(m[2]);
    return { start, count: Math.max(1, end - start + 1) };
  }
  const y = (label ?? '').match(/(20\d{2})/);
  if (y) return { start: Number(y[1]), count: 3 };
  return { start: new Date().getFullYear(), count: 3 };
}

function defaultOwnAxes(): NormalizedOwnAxis[] {
  return [
    { id: 'own-1', name: 'Axe 1 — à nommer', tone: 'info' },
    { id: 'own-2', name: 'Axe 2 — à nommer', tone: 'gold' },
    { id: 'own-3', name: 'Axe 3 — à nommer', tone: 'teal' },
  ];
}

function normalizeOwnAxes(raw: unknown): NormalizedOwnAxis[] {
  const items = asArray(raw)
    .map((row, i) => {
      const r = asRecord(row);
      if (!r) return null;
      const name = str(r.name ?? r.n).trim();
      if (!name) return null;
      return {
        id: str(r.id, `own-${i + 1}`),
        name,
        tone: str(r.tone ?? r.t, 'info') || 'info',
      };
    })
    .filter((x): x is NormalizedOwnAxis => x != null);
  return items.length > 0 ? items : defaultOwnAxes();
}

function normalizeInitiatives(raw: unknown): NormalizedInitiative[] {
  return asArray(raw)
    .map((row, i) => {
      const r = asRecord(row);
      if (!r) return null;
      const title = str(r.title ?? r.n).trim();
      if (!title) return null;
      const start = int(r.startMonthOffset ?? r.s, 0);
      let end = int(r.endMonthOffset ?? r.e, start + 3);
      if (end <= start) end = start + 3;
      const axisIds = asArray(r.strategicAxisIds ?? r.ga)
        .map((x) => str(x).trim())
        .filter(Boolean);
      const milestones = asArray(r.milestones ?? r.ms)
        .map((m) => {
          const mr = asRecord(m);
          if (!mr) return null;
          const label = str(mr.label ?? mr.l).trim();
          if (!label) return null;
          return { monthOffset: int(mr.monthOffset ?? mr.m, 0), label };
        })
        .filter((x): x is NormalizedMilestone => x != null);
      return {
        id: str(r.id, `init-${i + 1}`),
        title,
        description: str(r.description),
        ownerLabel: str(r.ownerLabel ?? r.own, '—') || '—',
        budgetCents: int(r.budgetCents ?? r.bud, 0),
        progressPct: clampPct(r.progressPct ?? r.pct),
        lane: int(r.lane, 0),
        startMonthOffset: start,
        endMonthOffset: end,
        strategicAxisIds: axisIds,
        milestones,
        linkedProjectNames: asArray(r.linkedProjectNames ?? r.prj)
          .map((x) => str(x).trim())
          .filter(Boolean),
      };
    })
    .filter((x): x is NormalizedInitiative => x != null);
}

function normalizeOutcomes(raw: unknown): NormalizedOutcome[] {
  return asArray(raw)
    .map((row) => {
      const r = asRecord(row);
      if (!r) return null;
      const title = str(r.title ?? r.t ?? r.label).trim();
      if (!title) return null;
      return {
        title,
        ownerLabel: str(r.ownerLabel ?? r.who, '—') || '—',
        target: str(r.target ?? r.kpi, '—') || '—',
        current: str(r.current ?? r.cur, '—') || '—',
        progressPct: clampPct(r.progressPct ?? r.pct),
      };
    })
    .filter((x): x is NormalizedOutcome => x != null);
}

function normalizeKpis(raw: unknown): NormalizedKpi[] {
  return asArray(raw)
    .map((row) => {
      const r = asRecord(row);
      if (!r) return null;
      const label = str(r.label ?? r.l ?? r.name).trim();
      if (!label) return null;
      return {
        label,
        value: str(r.value ?? r.v ?? r.target, '—') || '—',
        detail: str(r.detail ?? r.d ?? r.unit),
      };
    })
    .filter((x): x is NormalizedKpi => x != null);
}

function normalizeRisks(raw: unknown): NormalizedRisk[] {
  return asArray(raw)
    .map((row) => {
      const r = asRecord(row);
      if (!r) return null;
      const name = str(r.name ?? r.n ?? r.label).trim();
      if (!name) return null;
      const levelRaw = str(r.level ?? r.lvl, 'info');
      const level =
        levelRaw === 'danger' || levelRaw === 'warning' || levelRaw === 'info'
          ? levelRaw
          : 'info';
      return {
        name,
        probability: str(r.probability ?? r.p),
        impact: str(r.impact ?? r.i),
        ownerLabel: str(r.ownerLabel ?? r.own),
        level,
        mitigation: str(r.mitigation),
      };
    })
    .filter((x): x is NormalizedRisk => x != null);
}

function normalizeBlocks(raw: unknown): NormalizedContentBlock[] {
  return asArray(raw)
    .map((row) => {
      const r = asRecord(row);
      if (!r) return null;
      const title = str(r.title ?? r.t).trim();
      if (!title) return null;
      const kind = str(r.kind ?? r.k, 'text') === 'image' ? 'image' : 'text';
      return {
        kind,
        title,
        body: str(r.body ?? r.b),
        documentId: str(r.documentId).trim() || null,
      };
    })
    .filter((x): x is NormalizedContentBlock => x != null);
}

function normalizePriorities(raw: unknown): NormalizedPriority[] {
  return asArray(raw)
    .map((row) => {
      const r = asRecord(row);
      if (!r) return null;
      const title = str(r.title).trim();
      if (!title) return null;
      return { title, description: str(r.description) };
    })
    .filter((x): x is NormalizedPriority => x != null);
}

function normalizeBudgetsByYear(raw: unknown): Record<string, number> {
  const r = asRecord(raw);
  if (!r) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(r)) {
    if (!/^\d{4}$/.test(k)) continue;
    const n = int(v, -1);
    if (n >= 0) out[k] = n;
  }
  return out;
}

function normalizeAxisContributions(raw: unknown): Record<string, number> {
  const r = asRecord(raw);
  if (!r) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(r)) {
    const id = k.trim();
    if (!id) continue;
    out[id] = clampPct(v);
  }
  return out;
}

export type StrategySchemaSource = {
  ownAxes?: unknown;
  majorInitiatives?: unknown;
  expectedOutcomes?: unknown;
  kpis?: unknown;
  risks?: unknown;
  contentBlocks?: unknown;
  strategicPriorities?: unknown;
  budgetsByYear?: unknown;
  axisContributions?: unknown;
  horizonStartYear?: number | null;
  horizonYearCount?: number | null;
  horizonLabel?: string | null;
};

export function normalizeStrategySchemaPayload(
  source: StrategySchemaSource,
): NormalizedStrategySchema {
  const parsed = parseHorizonLabel(source.horizonLabel);
  return {
    ownAxes: normalizeOwnAxes(source.ownAxes),
    majorInitiatives: normalizeInitiatives(source.majorInitiatives),
    expectedOutcomes: normalizeOutcomes(source.expectedOutcomes),
    kpis: normalizeKpis(source.kpis),
    risks: normalizeRisks(source.risks),
    contentBlocks: normalizeBlocks(source.contentBlocks),
    strategicPriorities: normalizePriorities(source.strategicPriorities),
    budgetsByYear: normalizeBudgetsByYear(source.budgetsByYear),
    axisContributions: normalizeAxisContributions(source.axisContributions),
    horizonStartYear: source.horizonStartYear ?? parsed.start,
    horizonYearCount: source.horizonYearCount ?? parsed.count,
  };
}
