'use client';

import type { PointerEvent, ReactNode } from 'react';
import { Maximize2, Minimize2, Minus, Plus, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { RegistryBadge } from '@/lib/ui/registry-badge';
import { cn } from '@/lib/utils';
import { PROJECT_STATUS_LABEL } from '../../constants/project-enum-labels';
import type { GanttBarColorMode } from '../../lib/gantt-bar-palette';
import type { GanttTimelineScale } from '../../lib/gantt-timeline-layout';
import { GanttBarColorLegend } from '../../components/gantt-bar-color-legend';

const SCALE_LABELS: Record<GanttTimelineScale, string> = {
  day: 'Jour',
  week: 'Semaine',
  month: 'Mois',
};

const BAR_COLOR_MODE_LABEL: Record<GanttBarColorMode, string> = {
  default: 'Par défaut (thème)',
  priority: 'Priorité',
  status: 'Statut',
  group: 'Arborescence (racine)',
};

export function GanttProjectBanner({
  name,
  status,
  plannedStartDate,
  plannedEndDate,
}: {
  name: string;
  status: string;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
}) {
  const fmt = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : '—';

  const statusLabel = PROJECT_STATUS_LABEL[status] ?? status;

  return (
    <div className="starium-project-gantt-banner">
      <div className="starium-project-gantt-banner__main">
        <span className="starium-project-gantt-banner__title">{name}</span>
        <RegistryBadge className="bg-secondary text-secondary-foreground shrink-0 text-[10px] font-normal uppercase tracking-wide">
          {statusLabel}
        </RegistryBadge>
      </div>
      <div className="starium-project-gantt-banner__dates" aria-label="Période planifiée du projet">
        <time dateTime={plannedStartDate ?? undefined}>{fmt(plannedStartDate)}</time>
        <span className="starium-project-gantt-banner__dates-sep" aria-hidden>
          →
        </span>
        <time dateTime={plannedEndDate ?? undefined}>{fmt(plannedEndDate)}</time>
      </div>
    </div>
  );
}

function GanttToolbarGroup({
  label,
  children,
  className,
  title,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <div className={cn('starium-project-gantt-toolbar__group', className)} title={title}>
      <span className="starium-overline shrink-0">{label}</span>
      {children}
    </div>
  );
}

function GanttScaleToggle({
  value,
  onChange,
}: {
  value: GanttTimelineScale;
  onChange: (scale: GanttTimelineScale) => void;
}) {
  return (
    <div
      className="starium-project-gantt-segmented"
      role="group"
      aria-label="Échelle de la frise"
    >
      {(['day', 'week', 'month'] as const).map((s) => (
        <button
          key={s}
          type="button"
          className={cn(
            'starium-project-gantt-segmented__btn',
            value === s && 'starium-project-gantt-segmented__btn--active',
          )}
          aria-pressed={value === s}
          onClick={() => onChange(s)}
        >
          {SCALE_LABELS[s]}
        </button>
      ))}
    </div>
  );
}

function GanttZoomControl({
  value,
  onZoomIn,
  onZoomOut,
  onReset,
}: {
  value: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}) {
  return (
    <div
      className="starium-project-gantt-zoom"
      title="Ctrl + molette sur la frise pour zoomer"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="starium-project-gantt-zoom__btn"
        onClick={onZoomOut}
        aria-label="Zoom arrière sur la frise"
      >
        <Minus className="size-3.5" aria-hidden />
      </Button>
      <span className="starium-project-gantt-zoom__value" aria-live="polite">
        {Math.round(value * 100)}%
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="starium-project-gantt-zoom__btn starium-project-gantt-zoom__btn--bordered"
        onClick={onZoomIn}
        aria-label="Zoom avant sur la frise"
      >
        <Plus className="size-3.5" aria-hidden />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="starium-project-gantt-zoom__btn"
        onClick={onReset}
        aria-label="Réinitialiser le zoom temps"
        title="100 %"
      >
        <RotateCcw className="size-3.5" aria-hidden />
      </Button>
    </div>
  );
}

function GanttDisplaySwitch({
  id,
  label,
  checked,
  onCheckedChange,
  title,
}: {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  title?: string;
}) {
  return (
    <div className="starium-project-gantt-toggle" title={title}>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={label}
      />
      <Label htmlFor={id} className="starium-project-gantt-toggle__label">
        {label}
      </Label>
    </div>
  );
}

export type ProjectGanttToolbarProps = {
  timelineScale: GanttTimelineScale;
  onTimelineScaleChange: (s: GanttTimelineScale) => void;
  timeZoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  taskStatusFilter: 'all' | string;
  onTaskStatusFilterChange: (v: string) => void;
  taskStatusOptions: Array<{ value: string; label: string }>;
  showMilestones: boolean;
  onShowMilestonesChange: (v: boolean) => void;
  showGanttBarLabels: boolean;
  onShowGanttBarLabelsChange: (v: boolean) => void;
  showGanttFriseTooltips: boolean;
  onShowGanttFriseTooltipsChange: (v: boolean) => void;
  barColorMode: GanttBarColorMode;
  onBarColorModeChange: (m: GanttBarColorMode) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  canEdit: boolean;
  onCreateTask?: () => void;
};

export function ProjectGanttToolbar({
  timelineScale,
  onTimelineScaleChange,
  timeZoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  taskStatusFilter,
  onTaskStatusFilterChange,
  taskStatusOptions,
  showMilestones,
  onShowMilestonesChange,
  showGanttBarLabels,
  onShowGanttBarLabelsChange,
  showGanttFriseTooltips,
  onShowGanttFriseTooltipsChange,
  barColorMode,
  onBarColorModeChange,
  isFullscreen,
  onToggleFullscreen,
  canEdit,
  onCreateTask,
}: ProjectGanttToolbarProps) {
  return (
    <div className="starium-project-gantt-toolbar starium-toolbar-header">
      <div className="starium-project-gantt-toolbar__row starium-project-gantt-toolbar__row--primary">
        <div className="starium-project-gantt-toolbar__controls">
          <GanttToolbarGroup label="Échelle">
            <GanttScaleToggle value={timelineScale} onChange={onTimelineScaleChange} />
          </GanttToolbarGroup>
          <GanttToolbarGroup label="Zoom temps">
            <GanttZoomControl
              value={timeZoom}
              onZoomIn={onZoomIn}
              onZoomOut={onZoomOut}
              onReset={onResetZoom}
            />
          </GanttToolbarGroup>
        </div>
        <div className="starium-project-gantt-toolbar__actions">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="min-h-11 gap-1.5 sm:min-h-0"
            onClick={onToggleFullscreen}
            aria-label={
              isFullscreen ? 'Quitter le plein écran' : 'Afficher le planning en plein écran'
            }
            title={isFullscreen ? 'Quitter le plein écran (Échap)' : 'Plein écran'}
          >
            {isFullscreen ? (
              <Minimize2 className="size-3.5" aria-hidden />
            ) : (
              <Maximize2 className="size-3.5" aria-hidden />
            )}
            <span className="hidden sm:inline">
              {isFullscreen ? 'Quitter' : 'Plein écran'}
            </span>
          </Button>
          {canEdit && onCreateTask ? (
            <Button
              type="button"
              size="sm"
              className="min-h-11 flex-1 sm:min-h-0 sm:flex-initial"
              onClick={onCreateTask}
            >
              Nouvelle tâche
            </Button>
          ) : null}
        </div>
      </div>

      <div className="starium-project-gantt-toolbar__row starium-project-gantt-toolbar__row--secondary">
        <div className="starium-project-gantt-toolbar__filters">
          <GanttToolbarGroup label="État">
            <Select
              value={taskStatusFilter}
              onValueChange={(v) => {
                if (v) onTaskStatusFilterChange(v);
              }}
            >
              <SelectTrigger size="sm" className="min-w-[8.5rem] max-w-[11rem]">
                <SelectValue>
                  {taskStatusFilter === 'all'
                    ? 'Tous'
                    : taskStatusOptions.find((o) => o.value === taskStatusFilter)?.label ??
                      taskStatusFilter}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {taskStatusOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </GanttToolbarGroup>
          <GanttToolbarGroup
            label="Couleur barres"
            title="Couleur des barres sur la frise (lecture seule, ne modifie pas les données)"
          >
            <Select
              value={barColorMode}
              onValueChange={(v) => {
                if (v) onBarColorModeChange(v as GanttBarColorMode);
              }}
            >
              <SelectTrigger
                size="sm"
                className="min-w-[9rem] max-w-[12rem]"
                aria-label="Mode de couleur des barres tâches"
              >
                <SelectValue>{BAR_COLOR_MODE_LABEL[barColorMode]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(BAR_COLOR_MODE_LABEL) as GanttBarColorMode[]).map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    {BAR_COLOR_MODE_LABEL[mode]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </GanttToolbarGroup>
        </div>
        <div
          className="starium-project-gantt-toolbar__toggles"
          role="group"
          aria-label="Options d'affichage de la frise"
        >
          <GanttDisplaySwitch
            id="gantt-show-milestones"
            label="Jalons"
            checked={showMilestones}
            onCheckedChange={onShowMilestonesChange}
          />
          <GanttDisplaySwitch
            id="gantt-show-labels"
            label="Libellés frise"
            checked={showGanttBarLabels}
            onCheckedChange={onShowGanttBarLabelsChange}
          />
          <GanttDisplaySwitch
            id="gantt-show-tooltips"
            label="Infobulles"
            checked={showGanttFriseTooltips}
            onCheckedChange={onShowGanttFriseTooltipsChange}
            title="Décocher pour masquer les infobulles sur les barres et jalons de la frise"
          />
        </div>
      </div>

      <GanttBarColorLegend mode={barColorMode} />
    </div>
  );
}

/** Poignée de redimensionnement sidebar / frise. */
export function ProjectGanttResizeHandle({
  onPointerDown,
}: {
  onPointerDown: (e: PointerEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      aria-label="Redimensionner la colonne planification et la frise"
      title="Glisser pour ajuster la largeur"
      className="starium-project-gantt-split-handle"
      onPointerDown={onPointerDown}
    >
      <span className="starium-project-gantt-split-handle__grip" aria-hidden />
    </button>
  );
}

/** Carte Gantt projet (chrome DS). */
export function ProjectGanttCard({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'starium-panel starium-gantt-card starium-project-gantt-card overflow-hidden rounded-[var(--ds-card-radius)] border border-border bg-card',
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Shell d'orchestration : bannière optionnelle + contenu. */
export function ProjectGanttView({
  banner,
  children,
}: {
  banner?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="starium-project-gantt flex min-w-0 flex-col gap-3">
      {banner}
      {children}
    </div>
  );
}
