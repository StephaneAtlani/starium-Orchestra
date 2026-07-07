import type { StrategicDirectionStrategyStatus } from '@prisma/client';

export type StrategyVersionSummary = {
  id: string;
  versionNumber: number;
  versionLabel: string;
  status: StrategicDirectionStrategyStatus;
  title: string | null;
  archivedAt: Date | null;
  archivedReason: string | null;
  approvedAt: Date | null;
  updatedAt: Date;
  isCurrent: boolean;
};

type StrategyRowForVersioning = {
  id: string;
  status: StrategicDirectionStrategyStatus;
  title: string | null;
  archivedAt: Date | null;
  archivedReason: string | null;
  approvedAt: Date | null;
  updatedAt: Date;
  createdAt: Date;
};

export function buildStrategyVersionSummaries(
  rows: StrategyRowForVersioning[],
  currentStrategyId: string,
): StrategyVersionSummary[] {
  const archived = rows
    .filter((row) => row.status === 'ARCHIVED')
    .sort((a, b) => {
      const atA = a.archivedAt?.getTime() ?? a.updatedAt.getTime();
      const atB = b.archivedAt?.getTime() ?? b.updatedAt.getTime();
      if (atA !== atB) return atA - atB;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  const active = rows.filter((row) => row.status !== 'ARCHIVED');
  const ordered = [...archived, ...active];

  return ordered.map((row, index) => {
    const versionNumber = index + 1;
    const isCurrent = row.id === currentStrategyId;
    return {
      id: row.id,
      versionNumber,
      versionLabel: formatStrategyVersionLabel(row, versionNumber, isCurrent),
      status: row.status,
      title: row.title,
      archivedAt: row.archivedAt,
      archivedReason: row.archivedReason,
      approvedAt: row.approvedAt,
      updatedAt: row.updatedAt,
      isCurrent,
    };
  });
}

function formatStrategyVersionLabel(
  row: StrategyRowForVersioning,
  versionNumber: number,
  isCurrent: boolean,
): string {
  const base = `v${versionNumber}`;
  if (row.status === 'ARCHIVED') {
    const date = row.archivedAt
      ? row.archivedAt.toLocaleDateString('fr-FR', { dateStyle: 'short' })
      : null;
    return date ? `${base} · archivée ${date}` : `${base} · archivée`;
  }
  if (isCurrent) return `${base} · version actuelle (${row.status})`;
  return `${base} · ${row.status}`;
}

export type StrategyFieldDiff = {
  field: string;
  label: string;
  left: string;
  right: string;
  changed: boolean;
};

export type StrategyCollectionDiff = {
  label: string;
  added: string[];
  removed: string[];
  unchanged: string[];
};

export type StrategyCompareResult = {
  left: { id: string; versionLabel: string };
  right: { id: string; versionLabel: string };
  fields: StrategyFieldDiff[];
  collections: StrategyCollectionDiff[];
  axes: { added: string[]; removed: string[]; unchanged: string[] };
  objectives: { added: string[]; removed: string[]; unchanged: string[] };
  hasChanges: boolean;
};

type JsonRow = Record<string, unknown>;

function normalizeText(value: string | null | undefined): string {
  return (value ?? '').trim();
}

function formatJsonRows(rows: unknown, mapRow: (row: JsonRow) => string): string {
  if (!Array.isArray(rows) || rows.length === 0) return '—';
  return rows
    .map((item) => mapRow(item as JsonRow))
    .filter((line) => line.trim().length > 0)
    .join('\n');
}

function diffJsonCollection(
  label: string,
  leftRows: unknown,
  rightRows: unknown,
  mapRow: (row: JsonRow) => string,
): StrategyCollectionDiff {
  const leftLines = formatJsonRows(leftRows, mapRow)
    .split('\n')
    .filter((line) => line !== '—' && line.trim().length > 0);
  const rightLines = formatJsonRows(rightRows, mapRow)
    .split('\n')
    .filter((line) => line !== '—' && line.trim().length > 0);
  const leftSet = new Set(leftLines);
  const rightSet = new Set(rightLines);
  const added = rightLines.filter((line) => !leftSet.has(line));
  const removed = leftLines.filter((line) => !rightSet.has(line));
  const unchanged = leftLines.filter((line) => rightSet.has(line));
  return { label, added, removed, unchanged };
}

function diffNamedIds(
  left: Array<{ id: string; label: string }>,
  right: Array<{ id: string; label: string }>,
) {
  const leftMap = new Map(left.map((item) => [item.id, item.label]));
  const rightMap = new Map(right.map((item) => [item.id, item.label]));
  const added: string[] = [];
  const removed: string[] = [];
  const unchanged: string[] = [];

  for (const [id, label] of rightMap) {
    if (!leftMap.has(id)) added.push(label);
    else unchanged.push(label);
  }
  for (const [id, label] of leftMap) {
    if (!rightMap.has(id)) removed.push(label);
  }

  return {
    added: added.sort((a, b) => a.localeCompare(b, 'fr')),
    removed: removed.sort((a, b) => a.localeCompare(b, 'fr')),
    unchanged: unchanged.sort((a, b) => a.localeCompare(b, 'fr')),
  };
}

export function compareStrategicDirectionStrategies(input: {
  left: {
    id: string;
    versionLabel: string;
    title: string | null;
    ambition: string | null;
    context: string | null;
    horizonLabel: string;
    ownerLabel: string | null;
    strategicPriorities: unknown;
    expectedOutcomes: unknown;
    kpis: unknown;
    majorInitiatives: unknown;
    risks: unknown;
    axes: Array<{ id: string; name: string }>;
    objectives: Array<{ id: string; title: string }>;
  };
  right: {
    id: string;
    versionLabel: string;
    title: string | null;
    ambition: string | null;
    context: string | null;
    horizonLabel: string;
    ownerLabel: string | null;
    strategicPriorities: unknown;
    expectedOutcomes: unknown;
    kpis: unknown;
    majorInitiatives: unknown;
    risks: unknown;
    axes: Array<{ id: string; name: string }>;
    objectives: Array<{ id: string; title: string }>;
  };
}): StrategyCompareResult {
  const scalarFields: Array<{ field: string; label: string; left: string; right: string }> = [
    {
      field: 'title',
      label: 'Titre',
      left: normalizeText(input.left.title) || '—',
      right: normalizeText(input.right.title) || '—',
    },
    {
      field: 'ambition',
      label: 'Ambition',
      left: normalizeText(input.left.ambition) || '—',
      right: normalizeText(input.right.ambition) || '—',
    },
    {
      field: 'context',
      label: 'Contexte',
      left: normalizeText(input.left.context) || '—',
      right: normalizeText(input.right.context) || '—',
    },
    {
      field: 'horizonLabel',
      label: 'Horizon',
      left: normalizeText(input.left.horizonLabel) || '—',
      right: normalizeText(input.right.horizonLabel) || '—',
    },
    {
      field: 'ownerLabel',
      label: 'Responsable',
      left: normalizeText(input.left.ownerLabel) || '—',
      right: normalizeText(input.right.ownerLabel) || '—',
    },
  ];

  const fields: StrategyFieldDiff[] = scalarFields.map((row) => ({
    ...row,
    changed: row.left !== row.right,
  }));

  const collections = [
    diffJsonCollection(
      'Priorités stratégiques',
      input.left.strategicPriorities,
      input.right.strategicPriorities,
      (row) => {
        const title = typeof row.title === 'string' ? row.title.trim() : '';
        const description = typeof row.description === 'string' ? row.description.trim() : '';
        if (!title) return '';
        return description ? `${title} — ${description}` : title;
      },
    ),
    diffJsonCollection(
      'Résultats attendus',
      input.left.expectedOutcomes,
      input.right.expectedOutcomes,
      (row) => {
        const label = typeof row.label === 'string' ? row.label.trim() : '';
        const target = typeof row.target === 'string' ? row.target.trim() : '';
        if (!label) return '';
        return target ? `${label} — cible : ${target}` : label;
      },
    ),
    diffJsonCollection('KPI', input.left.kpis, input.right.kpis, (row) => {
      const name = typeof row.name === 'string' ? row.name.trim() : '';
      const target = typeof row.target === 'string' ? row.target.trim() : '';
      const unit = typeof row.unit === 'string' ? row.unit.trim() : '';
      if (!name) return '';
      const parts = [name];
      if (target) parts.push(`cible ${target}`);
      if (unit) parts.push(unit);
      return parts.join(' · ');
    }),
    diffJsonCollection(
      'Initiatives majeures',
      input.left.majorInitiatives,
      input.right.majorInitiatives,
      (row) => {
        const title = typeof row.title === 'string' ? row.title.trim() : '';
        const description = typeof row.description === 'string' ? row.description.trim() : '';
        if (!title) return '';
        return description ? `${title} — ${description}` : title;
      },
    ),
    diffJsonCollection('Risques', input.left.risks, input.right.risks, (row) => {
      const label = typeof row.label === 'string' ? row.label.trim() : '';
      const mitigation = typeof row.mitigation === 'string' ? row.mitigation.trim() : '';
      if (!label) return '';
      return mitigation ? `${label} — mitigation : ${mitigation}` : label;
    }),
  ];

  const axes = diffNamedIds(
    input.left.axes.map((axis) => ({ id: axis.id, label: axis.name })),
    input.right.axes.map((axis) => ({ id: axis.id, label: axis.name })),
  );
  const objectives = diffNamedIds(
    input.left.objectives.map((obj) => ({ id: obj.id, label: obj.title })),
    input.right.objectives.map((obj) => ({ id: obj.id, label: obj.title })),
  );

  const hasChanges =
    fields.some((field) => field.changed) ||
    collections.some(
      (collection) => collection.added.length > 0 || collection.removed.length > 0,
    ) ||
    axes.added.length > 0 ||
    axes.removed.length > 0 ||
    objectives.added.length > 0 ||
    objectives.removed.length > 0;

  return {
    left: { id: input.left.id, versionLabel: input.left.versionLabel },
    right: { id: input.right.id, versionLabel: input.right.versionLabel },
    fields,
    collections,
    axes,
    objectives,
    hasChanges,
  };
}
