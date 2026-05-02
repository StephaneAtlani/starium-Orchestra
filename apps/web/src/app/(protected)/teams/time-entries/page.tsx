'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/feedback/loading-state';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PROJECT_STATUS_LABEL } from '@/features/projects/constants/project-enum-labels';
import { listActivityTypes } from '@/features/teams/activity-types/api/activity-types.api';
import {
  createResourceTimeEntry,
  deleteResourceTimeEntry,
  updateResourceTimeEntry,
} from '@/features/teams/resource-time-entries/api/resource-time-entries.api';
import {
  getResourceTimesheetMonth,
  submitResourceTimesheetMonth,
  unlockResourceTimesheetMonth,
} from '@/features/teams/resource-time-entries/api/resource-timesheet-months.api';
import { useResourceTimeEntriesList } from '@/features/teams/resource-time-entries/hooks/use-resource-time-entries-list';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { usePermissions } from '@/hooks/use-permissions';
import { getMyHumanResourceId } from '@/services/me';
import { listProjects } from '@/features/projects/api/projects.api';
import { getClientResourceTimesheetSettings } from '@/features/teams/resource-time-entries/api/client-resource-timesheet-settings.api';
import { toast } from '@/lib/toast';
import type { ResourceTimeEntryDto } from '@/features/teams/resource-time-entries/types/resource-time-entry.types';
import { cn } from '@/lib/utils';

/** Fallback si les paramètres client ne sont pas encore chargés. */
const DEFAULT_DAY_REFERENCE_HOURS = 7.5;

/** Filtre liste des projets (lignes « Projet ») : défaut en cours ; « Tous » pour les autres statuts. */
const TIMESHEET_PROJECT_STATUS_FILTER_OPTIONS: { value: string; label: string }[] = (() => {
  const keys = Object.keys(PROJECT_STATUS_LABEL) as (keyof typeof PROJECT_STATUS_LABEL)[];
  return [
    { value: 'IN_PROGRESS', label: PROJECT_STATUS_LABEL.IN_PROGRESS },
    { value: 'ALL', label: 'Tous les statuts' },
    ...keys
      .filter((k) => k !== 'IN_PROGRESS')
      .map((k) => ({ value: k as string, label: PROJECT_STATUS_LABEL[k] })),
  ];
})();

function monthDateRange(ym: string): { from: string; to: string } {
  const [y, m] = ym.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return {
    from: `${y}-${String(m).padStart(2, '0')}-01`,
    to: `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`,
  };
}

function daysInMonth(ym: string): number {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

function currentYearMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function shiftYearMonth(ym: string, delta: number): string {
  const [ys, ms] = ym.split('-').map(Number);
  const d = new Date(ys, ms - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function frMonthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });
}

function workDateIsoUtcNoon(year: number, month1: number, day: number): string {
  return new Date(Date.UTC(year, month1 - 1, day, 12, 0, 0)).toISOString();
}

/** Clé stable pour une ligne (projet seul, activité seule, ou couple). */
function rowKeyFromParts(projectId: string | null, activityTypeId: string | null): string {
  return `${projectId ?? ''}|${activityTypeId ?? ''}`;
}

function rowKeyFromEntry(e: ResourceTimeEntryDto): string {
  return rowKeyFromParts(e.projectId, e.activityTypeId);
}

export type GridRow = {
  key: string;
  projectId: string | null;
  activityTypeId: string | null;
  label: string;
  kind: 'project' | 'activity' | 'pair';
};

function clampFraction(n: number, max: number): number {
  if (Number.isNaN(n) || n <= 0) return 0;
  return Math.min(max, Math.round(n * 1000) / 1000);
}

/** Clé brouillon : jour + séparateur + rowKey (le rowKey peut contenir `|`). */
function cellDraftKey(rowKey: string, dayIdx: number): string {
  return `${dayIdx}\u0001${rowKey}`;
}

/** Autorise la frappe décimale incomplète (ex. `0.`, `0,25`). */
function isPartialDecimalInput(s: string): boolean {
  if (s === '') return true;
  return /^[0-9]*[.,]?[0-9]*$/.test(s);
}

/** Jours du mois (calendrier local) : week-end = sam. / dim. */
function monthDayMetas(yearMonth: string, dim: number) {
  const [y, m] = yearMonth.split('-').map(Number);
  return Array.from({ length: dim }, (_, i) => {
    const day = i + 1;
    const d = new Date(y, m - 1, day);
    const dow = d.getDay();
    const isWeekend = dow === 0 || dow === 6;
    const weekdayShort = d
      .toLocaleDateString('fr-FR', { weekday: 'short' })
      .replace(/\.$/, '');
    return { day, isWeekend, weekdayShort };
  });
}

const cellFrame =
  'border border-border/70 p-0 align-middle shadow-none transition-colors';

/** Fond de ligne (même logique que la cellule « Projet / activité »). */
function rowLabelBg(row: GridRow, rowIdx: number): string {
  if (row.kind === 'pair') return 'bg-muted/35';
  return rowIdx % 2 === 1 ? 'bg-muted/25' : 'bg-card';
}

/** Cellule jour : même teinte que le libellé ; week-end gris plus foncé. */
function rowDataCellBg(row: GridRow, rowIdx: number, isWeekend: boolean): string {
  if (!isWeekend) return rowLabelBg(row, rowIdx);
  if (row.kind === 'pair') return 'bg-muted/55 dark:bg-muted/48';
  if (rowIdx % 2 === 1) return 'bg-muted/50 dark:bg-muted/42';
  return 'bg-muted/42 dark:bg-muted/36';
}

/** Ligne Σ : week-end plus foncé que les jours ouvrés. */
function totalCellBg(isWeekend: boolean): string {
  return isWeekend ? 'bg-muted/55 dark:bg-muted/48' : 'bg-muted/38 dark:bg-muted/32';
}

/** En-têtes de colonnes : week-end gris plus marqué. */
const weekendHeaderCol = 'bg-muted/85 dark:bg-muted/58';

const DEFAULT_LABEL_COL_PX = 208;
const DEFAULT_DAY_COL_PX = 42;
const MIN_LABEL_COL_PX = 120;
const MAX_LABEL_COL_PX = 520;
const MIN_DAY_COL_PX = 28;
const MAX_DAY_COL_PX = 220;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** Poignée redimensionnement colonne (bord droit), type Excel. */
function ColumnResizeHandle({
  ariaLabel,
  onResizeStart,
}: {
  ariaLabel: string;
  onResizeStart: (e: ReactMouseEvent) => void;
}) {
  return (
    <span
      role="separator"
      aria-orientation="vertical"
      aria-label={ariaLabel}
      tabIndex={-1}
      className="absolute -right-0.5 top-0 z-30 h-full w-1.5 cursor-col-resize select-none touch-none hover:bg-foreground/8 dark:hover:bg-foreground/12"
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onResizeStart(e);
      }}
    />
  );
}

export default function ResourceTimeEntriesPage() {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const searchParams = useSearchParams();
  const paramResourceId = searchParams.get('resourceId');

  const { has, isLoading: permsLoading, isSuccess: permsOk } = usePermissions();
  const canRead = has('resources.read');
  const canWrite = has('resources.update');

  const settingsQuery = useQuery({
    queryKey: ['client-resource-timesheet-settings', clientId],
    queryFn: () => getClientResourceTimesheetSettings(authFetch),
    enabled: permsOk && canRead && !!clientId,
  });
  const dayRefHours = settingsQuery.data?.dayReferenceHours ?? DEFAULT_DAY_REFERENCE_HOURS;
  const allowFractionAboveOne = settingsQuery.data?.allowFractionAboveOne ?? false;
  const maxFrac = allowFractionAboveOne ? 99 : 1;
  const parseDraftToFrac = useMemo(
    () => (raw: string) => {
      const t = raw.trim().replace(',', '.');
      if (t === '' || t === '.') return 0;
      const n = Number(t);
      if (Number.isNaN(n)) return 0;
      return clampFraction(n, maxFrac);
    },
    [maxFrac],
  );
  const ignoreWeekendsDefault = settingsQuery.data?.ignoreWeekendsDefault ?? true;

  const [yearMonth, setYearMonth] = useState(currentYearMonth);
  /** Filtre API `listProjects` : par défaut projets en cours uniquement. */
  const [projectStatusFilter, setProjectStatusFilter] = useState('IN_PROGRESS');
  const projectStatusFilterLabel = useMemo(
    () =>
      TIMESHEET_PROJECT_STATUS_FILTER_OPTIONS.find((o) => o.value === projectStatusFilter)?.label ??
      projectStatusFilter,
    [projectStatusFilter],
  );
  /** Si vrai : pas de saisie ni de recopie sur sam./dim. ; chargement grille sans temps week-end. */
  const [ignoreWeekends, setIgnoreWeekends] = useState(true);
  useEffect(() => {
    setIgnoreWeekends(ignoreWeekendsDefault);
  }, [activeClient?.id, ignoreWeekendsDefault]);

  const { from, to } = useMemo(() => monthDateRange(yearMonth), [yearMonth]);
  const dim = daysInMonth(yearMonth);
  const dayMetas = useMemo(() => monthDayMetas(yearMonth, dim), [yearMonth, dim]);

  const [labelColWidth, setLabelColWidth] = useState(DEFAULT_LABEL_COL_PX);
  const [dayColWidths, setDayColWidths] = useState<number[]>([]);

  useEffect(() => {
    setDayColWidths((prev) =>
      Array.from({ length: dim }, (_, i) => prev[i] ?? DEFAULT_DAY_COL_PX),
    );
  }, [dim]);

  const dayColWidthsSafe = useMemo(
    () => Array.from({ length: dim }, (_, i) => dayColWidths[i] ?? DEFAULT_DAY_COL_PX),
    [dim, dayColWidths],
  );

  const startResizeLabel = useCallback((e: ReactMouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = labelColWidth;
    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      setLabelColWidth(clamp(startW + dx, MIN_LABEL_COL_PX, MAX_LABEL_COL_PX));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.removeProperty('cursor');
      document.body.style.removeProperty('user-select');
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [labelColWidth]);

  const startResizeDay = useCallback(
    (dayIndex: number) => (e: ReactMouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startW = dayColWidthsSafe[dayIndex] ?? DEFAULT_DAY_COL_PX;
      const onMove = (ev: MouseEvent) => {
        const dx = ev.clientX - startX;
        const nextW = clamp(startW + dx, MIN_DAY_COL_PX, MAX_DAY_COL_PX);
        setDayColWidths((prev) => {
          const row = Array.from({ length: dim }, (_, j) => prev[j] ?? DEFAULT_DAY_COL_PX);
          row[dayIndex] = nextW;
          return row;
        });
      };
      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        document.body.style.removeProperty('cursor');
        document.body.style.removeProperty('user-select');
      };
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [dim, dayColWidthsSafe],
  );

  const humanQ = useQuery({
    queryKey: ['me', 'human-resource', clientId],
    queryFn: () => getMyHumanResourceId(authFetch),
    enabled: permsOk && !!clientId,
  });

  const myResourceId = humanQ.data?.resourceId ?? null;
  const effectiveResourceId = paramResourceId?.trim() || myResourceId;

  const monthQ = useQuery({
    queryKey: ['resource-timesheet-month', clientId, effectiveResourceId, yearMonth],
    queryFn: () =>
      getResourceTimesheetMonth(authFetch, effectiveResourceId!, yearMonth),
    enabled: permsOk && !!clientId && !!effectiveResourceId && canRead,
  });

  const listParams = useMemo(
    () => ({
      limit: 500,
      offset: 0,
      resourceId: effectiveResourceId ?? undefined,
      from,
      to,
    }),
    [effectiveResourceId, from, to],
  );

  const listQuery = useResourceTimeEntriesList(listParams, permsOk && canRead && !!effectiveResourceId);

  const projectsQ = useQuery({
    queryKey: ['projects', 'for-time-entry', 'my-scope', clientId, projectStatusFilter],
    queryFn: async () => {
      const limit = 100;
      const items: NonNullable<Awaited<ReturnType<typeof listProjects>>['items']> = [];
      let page = 1;
      for (;;) {
        const res = await listProjects(authFetch, {
          myProjectsOnly: true,
          limit,
          page,
          ...(projectStatusFilter !== 'ALL' ? { status: projectStatusFilter } : {}),
        });
        items.push(...res.items);
        if (res.items.length < limit || page * limit >= res.total) break;
        page += 1;
      }
      return { items };
    },
    enabled: permsOk && !!clientId && canRead,
  });

  /** Axes défaut (RFC-TEAM-006) — pas tout le référentiel activity-types du client. */
  const activityQ = useQuery({
    queryKey: ['activity-types', 'for-time-entry', 'defaults', clientId],
    queryFn: () => listActivityTypes(authFetch, { limit: 100, offset: 0, defaultsOnly: true }),
    enabled: permsOk && !!clientId && canRead,
  });

  const projectItems = useMemo(
    () => projectsQ.data?.items ?? [],
    [projectsQ.data?.items],
  );
  const activityItems = useMemo(
    () => activityQ.data?.items ?? [],
    [activityQ.data?.items],
  );

  /** Lignes : chaque projet + chaque type d’activité + couples présents dans les données. */
  const gridRows: GridRow[] = useMemo(() => {
    const rows: GridRow[] = [];
    const seen = new Set<string>();

    for (const p of projectItems) {
      const key = rowKeyFromParts(p.id, null);
      if (!seen.has(key)) {
        seen.add(key);
        rows.push({
          key,
          projectId: p.id,
          activityTypeId: null,
          label: p.name + (p.code ? ` (${p.code})` : ''),
          kind: 'project',
        });
      }
    }
    for (const a of activityItems) {
      const key = rowKeyFromParts(null, a.id);
      if (!seen.has(key)) {
        seen.add(key);
        rows.push({
          key,
          projectId: null,
          activityTypeId: a.id,
          label: a.name + (a.code ? ` (${a.code})` : ''),
          kind: 'activity',
        });
      }
    }
    for (const e of listQuery.data?.items ?? []) {
      const key = rowKeyFromEntry(e);
      if (!seen.has(key) && (e.projectId || e.activityTypeId)) {
        seen.add(key);
        const pn = e.projectName ?? '—';
        const an = e.activityTypeName ?? '—';
        rows.push({
          key,
          projectId: e.projectId,
          activityTypeId: e.activityTypeId,
          label:
            e.projectId && e.activityTypeId
              ? `${pn} · ${an}`
              : e.projectId
                ? pn
                : an,
          kind: 'pair',
        });
      }
    }
    return rows;
  }, [projectItems, activityItems, listQuery.data?.items]);

  /** grid[rowKey][day-1] = fraction 0–1 */
  const [grid, setGrid] = useState<Record<string, number[]>>({});
  /** Texte en cours de saisie (évite de casser `0.` / `0,5` avec un nombre contrôlé). */
  const [cellDrafts, setCellDrafts] = useState<Record<string, string>>({});
  /** Recopie Excel : plage en cours de sélection (même ligne). */
  const fillDragRef = useRef<{
    rowKey: string;
    startDay: number;
    endDay: number;
    value: number;
  } | null>(null);
  const [fillPreview, setFillPreview] = useState<{
    rowKey: string;
    from: number;
    to: number;
  } | null>(null);

  useEffect(() => {
    const next: Record<string, number[]> = {};
    for (const r of gridRows) {
      next[r.key] = Array.from({ length: dim }, () => 0);
    }
    for (const e of listQuery.data?.items ?? []) {
      const rk = rowKeyFromEntry(e);
      const d = new Date(e.workDate).getUTCDate();
      if (d < 1 || d > dim) continue;
      if (!next[rk]) {
        next[rk] = Array.from({ length: dim }, () => 0);
      }
      const frac = clampFraction(Number(e.durationHours) / dayRefHours, maxFrac);
      next[rk][d - 1] = frac;
    }
    if (ignoreWeekends) {
      for (const key of Object.keys(next)) {
        const arr = next[key];
        for (let i = 0; i < dim; i++) {
          if (dayMetas[i]?.isWeekend) arr[i] = 0;
        }
      }
    }
    setGrid(next);
  }, [listQuery.data?.items, gridRows, dim, yearMonth, ignoreWeekends, dayMetas, dayRefHours, maxFrac]);

  useEffect(() => {
    setCellDrafts({});
  }, [yearMonth]);

  useEffect(() => {
    if (!ignoreWeekends) return;
    setCellDrafts((prev) => {
      const next = { ...prev };
      for (const dk of Object.keys(next)) {
        const sep = dk.indexOf('\u0001');
        if (sep === -1) continue;
        const dayIdx = Number(dk.slice(0, sep));
        if (!Number.isNaN(dayIdx) && dayMetas[dayIdx]?.isWeekend) {
          delete next[dk];
        }
      }
      return next;
    });
  }, [ignoreWeekends, dayMetas]);

  const monthLocked = monthQ.data?.status === 'SUBMITTED';
  const canEditEntries = canWrite && !!effectiveResourceId && !monthLocked;

  const startCellFillDrag = useCallback(
    (rowKey: string, dayIdx: number, e: ReactPointerEvent<HTMLButtonElement>) => {
      if (!canEditEntries) return;
      e.preventDefault();
      e.stopPropagation();
      const fillHandleEl = e.currentTarget;
      try {
        fillHandleEl.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      const rowCells = grid[rowKey] ?? Array.from({ length: dim }, () => 0);
      const dk = cellDraftKey(rowKey, dayIdx);
      const value =
        cellDrafts[dk] !== undefined
          ? parseDraftToFrac(cellDrafts[dk]!)
          : clampFraction(rowCells[dayIdx] ?? 0, maxFrac);
      fillDragRef.current = { rowKey, startDay: dayIdx, endDay: dayIdx, value };
      setFillPreview({ rowKey, from: dayIdx, to: dayIdx });
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';

      const onMove = (ev: PointerEvent) => {
        const drag = fillDragRef.current;
        if (!drag) return;
        const el = document.elementFromPoint(ev.clientX, ev.clientY);
        const td = el?.closest?.('[data-fill-cell]');
        if (!td || !(td instanceof HTMLElement)) return;
        if (td.dataset.rowKey !== drag.rowKey) return;
        const d = Number(td.dataset.dayIdx);
        if (Number.isNaN(d)) return;
        drag.endDay = d;
        setFillPreview({
          rowKey: drag.rowKey,
          from: Math.min(drag.startDay, d),
          to: Math.max(drag.startDay, d),
        });
      };

      const onUp = (ev: PointerEvent) => {
        try {
          fillHandleEl.releasePointerCapture(ev.pointerId);
        } catch {
          /* ignore */
        }
        fillHandleEl.removeEventListener('pointermove', onMove);
        fillHandleEl.removeEventListener('pointerup', onUp);
        document.body.style.removeProperty('cursor');
        document.body.style.removeProperty('user-select');
        const drag = fillDragRef.current;
        fillDragRef.current = null;
        setFillPreview(null);
        if (!drag) return;
        const from = Math.min(drag.startDay, drag.endDay);
        const to = Math.max(drag.startDay, drag.endDay);
        const val = drag.value;
        setGrid((g) => {
          const copy = { ...g };
          const arr = [...(copy[drag.rowKey] ?? Array(dim).fill(0))];
          for (let i = from; i <= to; i++) {
            if (ignoreWeekends && dayMetas[i]?.isWeekend) continue;
            arr[i] = val;
          }
          copy[drag.rowKey] = arr;
          return copy;
        });
        setCellDrafts((prev) => {
          const next = { ...prev };
          for (let i = from; i <= to; i++) {
            delete next[cellDraftKey(drag.rowKey, i)];
          }
          return next;
        });
      };

      fillHandleEl.addEventListener('pointermove', onMove);
      fillHandleEl.addEventListener('pointerup', onUp);
    },
    [canEditEntries, dim, grid, cellDrafts, ignoreWeekends, dayMetas, maxFrac, parseDraftToFrac],
  );

  const invalidateAll = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['resource-time-entries'] });
    void queryClient.invalidateQueries({ queryKey: ['resource-timesheet-month'] });
  }, [queryClient]);

  const unlockMut = useMutation({
    mutationFn: () => unlockResourceTimesheetMonth(authFetch, effectiveResourceId!, yearMonth),
    onSuccess: () => {
      toast.success('Fiche déverrouillée.');
      invalidateAll();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const persistGrid = useCallback(async () => {
    if (!effectiveResourceId) throw new Error('Ressource manquante');
    const [y, m] = yearMonth.split('-').map(Number);
    const existing = listQuery.data?.items ?? [];
    const byCell = new Map<string, ResourceTimeEntryDto>();
    for (const e of existing) {
      const rk = rowKeyFromEntry(e);
      const d = new Date(e.workDate).getUTCDate();
      byCell.set(`${rk}|${d}`, e);
    }

    const ops: Promise<unknown>[] = [];
    const handled = new Set<string>();

    for (const row of gridRows) {
      const rowCells = grid[row.key] ?? Array.from({ length: dim }, () => 0);
      for (let day = 1; day <= dim; day++) {
        const dk = cellDraftKey(row.key, day - 1);
        let frac =
          cellDrafts[dk] !== undefined
            ? parseDraftToFrac(cellDrafts[dk]!)
            : clampFraction(rowCells[day - 1] ?? 0, maxFrac);
        if (ignoreWeekends && dayMetas[day - 1]?.isWeekend) frac = 0;
        const cellKey = `${row.key}|${day}`;
        handled.add(cellKey);
        const prev = byCell.get(cellKey);
        const workDate = workDateIsoUtcNoon(y, m, day);

        if (frac <= 0) {
          if (prev) ops.push(deleteResourceTimeEntry(authFetch, prev.id));
          continue;
        }

        const durationHours = Math.round(frac * dayRefHours * 100) / 100;
        if (prev) {
          ops.push(
            updateResourceTimeEntry(authFetch, prev.id, {
              durationHours,
              workDate,
              projectId: row.projectId,
              activityTypeId: row.activityTypeId,
            }),
          );
        } else {
          ops.push(
            createResourceTimeEntry(authFetch, {
              resourceId: effectiveResourceId,
              workDate,
              durationHours,
              projectId: row.projectId,
              activityTypeId: row.activityTypeId,
            }),
          );
        }
      }
    }

    for (const e of existing) {
      const rk = rowKeyFromEntry(e);
      const d = new Date(e.workDate).getUTCDate();
      const ck = `${rk}|${d}`;
      if (!handled.has(ck)) {
        ops.push(deleteResourceTimeEntry(authFetch, e.id));
      }
    }

    const chunk = 40;
    for (let i = 0; i < ops.length; i += chunk) {
      await Promise.all(ops.slice(i, i + chunk));
    }
  }, [
    authFetch,
    effectiveResourceId,
    yearMonth,
    listQuery.data?.items,
    gridRows,
    grid,
    dim,
    cellDrafts,
    ignoreWeekends,
    dayMetas,
    dayRefHours,
    maxFrac,
    parseDraftToFrac,
  ]);

  const saveGridMut = useMutation({
    mutationFn: persistGrid,
    onSuccess: () => {
      toast.success('Saisies enregistrées.');
      invalidateAll();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const validateMonthMut = useMutation({
    mutationFn: async () => {
      await persistGrid();
      await submitResourceTimesheetMonth(authFetch, effectiveResourceId!, yearMonth);
    },
    onSuccess: () => {
      toast.success('Saisies enregistrées et mois validé.');
      invalidateAll();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const dayTotals = useMemo(() => {
    const totals = Array.from({ length: dim }, () => 0);
    for (const row of gridRows) {
      const arr = grid[row.key];
      for (let i = 0; i < dim; i++) {
        const dk = cellDraftKey(row.key, i);
        let frac =
          cellDrafts[dk] !== undefined
            ? parseDraftToFrac(cellDrafts[dk]!)
            : arr?.[i] ?? 0;
        if (ignoreWeekends && dayMetas[i]?.isWeekend) frac = 0;
        totals[i] += frac;
      }
    }
    return totals;
  }, [grid, gridRows, dim, cellDrafts, ignoreWeekends, dayMetas, parseDraftToFrac]);

  const hasGridFraction = useMemo(() => {
    for (const row of gridRows) {
      const arr = grid[row.key];
      for (let i = 0; i < dim; i++) {
        const dk = cellDraftKey(row.key, i);
        let frac =
          cellDrafts[dk] !== undefined
            ? parseDraftToFrac(cellDrafts[dk]!)
            : arr?.[i] ?? 0;
        if (ignoreWeekends && dayMetas[i]?.isWeekend) frac = 0;
        if (frac > 0) return true;
      }
    }
    return false;
  }, [grid, gridRows, cellDrafts, dim, ignoreWeekends, dayMetas, parseDraftToFrac]);

  const hasPersistedSaisie =
    !!listQuery.data?.items.some((e) => Number(e.durationHours) > 0);

  return (
    <>
      <PageHeader
        title="Temps réalisé"
        description="Pour chaque projet ou type d’activité, saisissez une fraction de journée (0 à 1) par jour. Enregistrer = brouillon ; Valider = fige le mois (déverrouillage par votre manager)."
      />

      {permsLoading && <LoadingState rows={2} />}
      {permsOk && !canRead && (
        <Alert className="border-amber-500/35">
          <AlertTitle>Accès refusé</AlertTitle>
          <AlertDescription>
            Permission requise : <code>resources.read</code>.
          </AlertDescription>
        </Alert>
      )}

      {humanQ.isLoading && canRead && <LoadingState rows={2} />}
      {permsOk && canRead && humanQ.isSuccess && !myResourceId && !paramResourceId && (
        <Alert>
          <AlertTitle>Aucune fiche Humaine liée à votre compte</AlertTitle>
          <AlertDescription>
            Votre utilisateur doit correspondre à une ressource Humaine du catalogue (même e-mail). Pour
            une autre fiche : <code className="text-xs">?resourceId=…</code>
          </AlertDescription>
        </Alert>
      )}

      {permsOk && canRead && effectiveResourceId && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Mois précédent"
                  onClick={() => setYearMonth((ym) => shiftYearMonth(ym, -1))}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="min-w-[10rem] text-center text-sm font-medium capitalize">
                  {frMonthLabel(yearMonth)}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Mois suivant"
                  onClick={() => setYearMonth((ym) => shiftYearMonth(ym, 1))}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
              <div className="flex min-w-[12rem] flex-col gap-1">
                <span className="text-xs text-muted-foreground" id="timesheet-project-status-label">
                  Statut des projets (lignes proposées)
                </span>
                <Select
                  value={projectStatusFilter}
                  onValueChange={(v) => {
                    if (v) setProjectStatusFilter(v);
                  }}
                >
                  <SelectTrigger
                    className="h-9 w-[min(100vw-2rem,16rem)]"
                    aria-labelledby="timesheet-project-status-label"
                  >
                    <SelectValue placeholder="Statut">{projectStatusFilterLabel}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {TIMESHEET_PROJECT_STATUS_FILTER_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex max-w-[19rem] items-start gap-2 pt-1">
                <input
                  id="timesheet-ignore-weekends"
                  type="checkbox"
                  className="mt-0.5 size-4 shrink-0 rounded border border-input accent-primary disabled:opacity-50"
                  checked={ignoreWeekends}
                  disabled={!canEditEntries}
                  onChange={(e) => setIgnoreWeekends(e.target.checked)}
                />
                <label
                  htmlFor="timesheet-ignore-weekends"
                  className="cursor-pointer text-xs leading-snug text-muted-foreground"
                >
                  Sans week-ends : pas de saisie sur sam.–dim., l’étirement ne remplit pas ces jours.
                </label>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {monthQ.data?.status === 'SUBMITTED' ? (
                <span className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-900 dark:text-amber-100">
                  Mois validé (lecture seule)
                </span>
              ) : (
                <span className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">
                  Brouillon
                </span>
              )}
              {canEditEntries && (
                <>
                  <Button
                    type="button"
                    variant="default"
                    disabled={saveGridMut.isPending}
                    onClick={() => saveGridMut.mutate()}
                  >
                    {saveGridMut.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      'Enregistrer'
                    )}
                  </Button>
                  {canWrite && monthQ.data?.canSubmit && !monthLocked && (hasGridFraction || hasPersistedSaisie) && (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={validateMonthMut.isPending}
                      onClick={() => validateMonthMut.mutate()}
                    >
                      {validateMonthMut.isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        'Valider'
                      )}
                    </Button>
                  )}
                </>
              )}
              {monthQ.data?.canUnlock && monthLocked && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={unlockMut.isPending}
                  onClick={() => unlockMut.mutate()}
                >
                  {unlockMut.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    'Déverrouiller (manager)'
                  )}
                </Button>
              )}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Valeur <strong className="text-foreground">1</strong> = une journée complète (
            {dayRefHours} h), <strong className="text-foreground">0,5</strong> = demi-journée.
            {allowFractionAboveOne
              ? ' Saisie sur une cellule : fraction pouvant dépasser 1 si le paramétrage client l’autorise.'
              : ` Par cellule, la fraction est plafonnée à 1 (soit ${dayRefHours} h).`}{' '}
            La somme par jour peut dépasser 1 si vous cumulez plusieurs lignes — vérifiez le total en bas. Les
            lignes « Projet » suivent le filtre de statut (par défaut : en cours) ; choisissez un autre statut
            ou « Tous les statuts » pour ajouter du temps sur d’autres projets. Les lignes déjà saisies sur la
            période restent affichées. Poignée en bas à droite d’une cellule : glisser pour recopier la valeur
            sur les jours suivants ou précédents (même ligne). Option{' '}
            <strong className="text-foreground">Sans week-ends</strong> : les colonnes week-end sont
            désactivées ; enregistrer supprime aussi le temps saisi précédemment sur ces jours. Paramètres par
            défaut : menu Équipes → Options temps (administrateur client).
          </p>

          {(monthQ.isLoading || listQuery.isLoading) && <LoadingState rows={4} />}
          {(monthQ.error || listQuery.error) && (
            <Alert variant="destructive">
              <AlertTitle>{((monthQ.error ?? listQuery.error) as Error).message}</AlertTitle>
            </Alert>
          )}

          {!listQuery.isLoading && gridRows.length > 0 && (
            <div className="overflow-x-auto rounded-md border border-border bg-card shadow-sm">
              <table className="border-collapse text-xs table-fixed">
                <colgroup>
                  <col style={{ width: labelColWidth }} />
                  {dayColWidthsSafe.map((w, i) => (
                    <col key={i} style={{ width: w }} />
                  ))}
                </colgroup>
                <thead>
                  <tr className="bg-muted/50">
                    <th
                      rowSpan={2}
                      scope="col"
                      className="sticky left-0 z-20 relative box-border border border-border bg-muted px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground shadow-[2px_0_0_0_hsl(var(--border))]"
                    >
                      <span className="block truncate pr-1">Projet / activité</span>
                      <ColumnResizeHandle
                        ariaLabel="Redimensionner la colonne libellés"
                        onResizeStart={startResizeLabel}
                      />
                    </th>
                    {dayMetas.map((meta, i) => (
                      <th
                        key={`n-${i}`}
                        scope="col"
                        className={cn(
                          'relative box-border border border-border px-0 py-1 text-center tabular-nums text-[11px] font-semibold text-foreground',
                          meta.isWeekend ? weekendHeaderCol : 'bg-muted/40',
                        )}
                      >
                        <span className="block truncate">{meta.day}</span>
                        <ColumnResizeHandle
                          ariaLabel={`Redimensionner la colonne du ${meta.day}`}
                          onResizeStart={startResizeDay(i)}
                        />
                      </th>
                    ))}
                  </tr>
                  <tr className="bg-muted/40">
                    {dayMetas.map((meta, i) => (
                      <th
                        key={`w-${i}`}
                        scope="col"
                        className={cn(
                          'box-border border border-border px-0 py-0.5 text-center font-normal capitalize',
                          meta.isWeekend
                            ? cn(weekendHeaderCol, 'text-muted-foreground')
                            : 'text-muted-foreground',
                        )}
                      >
                        <span className="inline-block max-w-full truncate px-0.5">{meta.weekdayShort}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {gridRows.map((row, rowIdx) => (
                    <tr key={row.key}>
                      <td
                        className={cn(
                          'sticky left-0 z-10 max-w-[18rem] border border-border px-2 py-0.5 text-left align-middle text-[11px] leading-tight shadow-[2px_0_0_0_hsl(var(--border))]',
                          rowLabelBg(row, rowIdx),
                        )}
                      >
                        <span className="text-muted-foreground">
                          {row.kind === 'project' ? 'Projet · ' : row.kind === 'activity' ? 'Activité · ' : ''}
                        </span>
                        <span className="font-medium text-foreground">{row.label}</span>
                      </td>
                      {dayMetas.map((meta, dayIdx) => {
                        const dk = cellDraftKey(row.key, dayIdx);
                        const draft = cellDrafts[dk];
                        const weekendBlocked = ignoreWeekends && meta.isWeekend;
                        const inFillPreview =
                          fillPreview &&
                          fillPreview.rowKey === row.key &&
                          dayIdx >= fillPreview.from &&
                          dayIdx <= fillPreview.to;
                        return (
                          <td
                            key={dayIdx}
                            data-fill-cell
                            data-row-key={row.key}
                            data-day-idx={dayIdx}
                            className={cn(
                              cellFrame,
                              rowDataCellBg(row, rowIdx, meta.isWeekend),
                              'relative',
                              weekendBlocked && 'cursor-not-allowed',
                              inFillPreview && 'z-[1] bg-primary/18 ring-2 ring-inset ring-primary/45',
                            )}
                          >
                            <input
                              type="text"
                              inputMode="decimal"
                              autoComplete="off"
                              aria-label={`${row.label}, le ${meta.day} ${meta.weekdayShort}${weekendBlocked ? ' (week-end exclu)' : ''}`}
                              disabled={!canEditEntries || weekendBlocked}
                              className={cn(
                                'box-border h-8 w-full min-w-[2.5rem] border-0 bg-transparent px-0.5 py-0 text-center tabular-nums text-[11px] text-foreground',
                                'placeholder:text-transparent',
                                'outline-none focus:z-[1] focus:bg-white/40 focus:ring-2 focus:ring-inset focus:ring-primary/35 dark:focus:bg-white/5',
                                'disabled:cursor-not-allowed disabled:opacity-50',
                              )}
                              value={
                                draft !== undefined
                                  ? draft
                                  : grid[row.key]?.[dayIdx] === undefined ||
                                      grid[row.key]?.[dayIdx] === 0
                                    ? ''
                                    : String(grid[row.key]![dayIdx])
                              }
                              onFocus={() => {
                                if (!canEditEntries || weekendBlocked) return;
                                const v = grid[row.key]?.[dayIdx] ?? 0;
                                setCellDrafts((s) => ({
                                  ...s,
                                  [dk]: v === 0 ? '' : String(v),
                                }));
                              }}
                              onChange={(e) => {
                                const raw = e.target.value;
                                if (!isPartialDecimalInput(raw)) return;
                                setCellDrafts((s) => ({ ...s, [dk]: raw }));
                              }}
                              onBlur={() => {
                                const t = cellDrafts[dk];
                                if (t === undefined) return;
                                const frac = parseDraftToFrac(t);
                                setGrid((g) => {
                                  const copy = { ...g };
                                  const arr = [...(copy[row.key] ?? Array(dim).fill(0))];
                                  arr[dayIdx] = frac;
                                  copy[row.key] = arr;
                                  return copy;
                                });
                                setCellDrafts((prev) => {
                                  if (prev[dk] === undefined) return prev;
                                  const next = { ...prev };
                                  delete next[dk];
                                  return next;
                                });
                              }}
                            />
                            {canEditEntries && !weekendBlocked && (
                              <button
                                type="button"
                                tabIndex={-1}
                                aria-label={`Recopier la valeur de cette cellule sur d’autres jours (même ligne)`}
                                title="Étirer la valeur (comme Excel)"
                                className={cn(
                                  'absolute bottom-px right-px z-[3] size-1 cursor-ew-resize rounded-[1px]',
                                  'bg-border shadow-none ring-0',
                                  'hover:opacity-75',
                                  'pointer-events-auto',
                                )}
                                onPointerDown={(e) => startCellFillDrag(row.key, dayIdx, e)}
                              />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  <tr className="border-t-2 border-border font-medium">
                    <td className="sticky left-0 z-10 border border-border bg-muted/60 px-2 py-1.5 text-[11px] shadow-[2px_0_0_0_hsl(var(--border))]">
                      Σ jour (fractions)
                    </td>
                    {dayTotals.map((t, i) => (
                      <td
                        key={i}
                        className={cn(
                          cellFrame,
                          totalCellBg(dayMetas[i]?.isWeekend ?? false),
                          'py-1 text-center tabular-nums text-[11px]',
                          t > 1 && 'font-semibold text-amber-700 dark:text-amber-400',
                        )}
                      >
                        {t > 0 ? t.toFixed(2) : ''}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {!listQuery.isLoading && gridRows.length === 0 && projectItems.length === 0 && activityItems.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Aucun projet ni type d’activité chargé pour ce client.
            </p>
          )}
        </div>
      )}
    </>
  );
}
