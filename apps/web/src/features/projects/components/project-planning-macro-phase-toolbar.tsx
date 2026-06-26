'use client';

import { CalendarRange, Flag, Layers3, ListTodo } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MacroPlanningPhaseRow } from '../lib/build-macro-planning-gantt';
import { formatMacroPlanningRangeMs } from '../lib/build-macro-planning-gantt';

export type MacroPhaseToolbarInfo =
  | {
      mode: 'single';
      row: MacroPlanningPhaseRow;
    }
  | {
      mode: 'all';
      phaseCount: number;
      taskCount: number;
      milestoneCount: number;
      windowStartMs: number;
      windowEndMs: number;
    };

export function buildMacroPhaseToolbarInfo(
  phaseFilter: string,
  visiblePhaseRows: MacroPlanningPhaseRow[],
  milestoneCount: number,
  windowStartMs: number,
  windowEndMs: number,
): MacroPhaseToolbarInfo | null {
  if (visiblePhaseRows.length === 0) return null;

  if (phaseFilter !== '__all__') {
    const row = visiblePhaseRows[0];
    if (!row) return null;
    return { mode: 'single', row };
  }

  const taskCount = visiblePhaseRows.reduce((sum, row) => sum + row.taskCount, 0);
  return {
    mode: 'all',
    phaseCount: visiblePhaseRows.length,
    taskCount,
    milestoneCount,
    windowStartMs,
    windowEndMs,
  };
}

function MacroPhaseStat({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: typeof ListTodo;
  label: string;
  value: string | number;
  className?: string;
}) {
  return (
    <span className={cn('starium-mpg-phase-toolbar__stat', className)}>
      <Icon className="starium-mpg-phase-toolbar__stat-ico" strokeWidth={2} aria-hidden />
      <span className="sr-only">{label} : </span>
      <span aria-hidden>{value}</span>
    </span>
  );
}

export function ProjectPlanningMacroPhaseToolbar({
  info,
}: {
  info: MacroPhaseToolbarInfo;
}) {
  if (info.mode === 'single') {
    const { row } = info;
    const rangeLabel = formatMacroPlanningRangeMs(row.startMs, row.endMs);

    return (
      <header
        className="starium-mpg-phase-toolbar starium-toolbar-header"
        aria-label={`Phase ${row.name}`}
      >
        <div className="starium-mpg-phase-toolbar__main">
          <span
            className="starium-gantt-phase-dot"
            style={{ background: row.color }}
            aria-hidden
          />
          <div className="min-w-0">
            <p className="starium-mpg-phase-toolbar__title">{row.name}</p>
            {row.subLabel ? (
              <p className="starium-mpg-phase-toolbar__sub" title={row.subLabel}>
                {row.subLabel}
              </p>
            ) : null}
          </div>
        </div>

        <div className="starium-mpg-phase-toolbar__meta">
          <MacroPhaseStat
            icon={CalendarRange}
            label="Période planifiée"
            value={rangeLabel}
          />
          <MacroPhaseStat
            icon={ListTodo}
            label="Tâches"
            value={`${row.taskCount} tâche${row.taskCount > 1 ? 's' : ''}`}
          />
          {row.milestoneCount > 0 ? (
            <MacroPhaseStat
              icon={Flag}
              label="Jalons"
              value={`${row.milestoneCount} jalon${row.milestoneCount > 1 ? 's' : ''}`}
            />
          ) : null}
        </div>
      </header>
    );
  }

  const rangeLabel = formatMacroPlanningRangeMs(info.windowStartMs, info.windowEndMs);

  return (
    <header
      className="starium-mpg-phase-toolbar starium-toolbar-header"
      aria-label="Synthèse des phases visibles"
    >
      <div className="starium-mpg-phase-toolbar__main">
        <Layers3 className="starium-mpg-phase-toolbar__main-ico" strokeWidth={2} aria-hidden />
        <div className="min-w-0">
          <p className="starium-mpg-phase-toolbar__title">Toutes les phases</p>
          <p className="starium-mpg-phase-toolbar__sub">
            {info.phaseCount} phase{info.phaseCount > 1 ? 's' : ''} affichée
            {info.phaseCount > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="starium-mpg-phase-toolbar__meta">
        <MacroPhaseStat icon={CalendarRange} label="Fenêtre affichée" value={rangeLabel} />
        <MacroPhaseStat
          icon={ListTodo}
          label="Tâches"
          value={`${info.taskCount} tâche${info.taskCount > 1 ? 's' : ''}`}
        />
        {info.milestoneCount > 0 ? (
          <MacroPhaseStat
            icon={Flag}
            label="Jalons"
            value={`${info.milestoneCount} jalon${info.milestoneCount > 1 ? 's' : ''}`}
          />
        ) : null}
      </div>
    </header>
  );
}
