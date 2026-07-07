'use client';

import type { ComponentType, ReactNode } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ArrowRight, Link2, Target } from 'lucide-react';

type DirectionOption = { id: string; name: string; code: string };
type VisionOption = { id: string; title: string; horizonLabel: string; isActive?: boolean };
type AxisOption = { id: string; name: string; orderIndex?: number | null };
type ObjectiveOption = {
  id: string;
  title: string;
  axisId: string;
  status: string;
};

type AxisPresentation = {
  title: string;
  AxisIcon: ComponentType<{ className?: string }> | null;
  colorClass: string;
};

export function StrategicDirectionStrategyAlignmentSection({
  sectionId = 'strategy-alignment',
  directionLabel,
  alignedVisionId,
  onAlignedVisionChange,
  visions,
  alignedVisionMeta,
  canEditFields,
  isCreating,
  canCreate,
  canUpdate,
  visionAlignedWithServer,
  showAlignmentWorkbench,
  alignmentEditOpen,
  pickAlignmentEnabled,
  alignmentCreateOpen,
  linksLoading,
  linksError,
  axesForVision,
  objectivesEligible,
  selectedAxisIds,
  selectedObjectiveIds,
  onToggleAxis,
  onToggleObjective,
  getAxisPresentation,
  objectiveStatusLabel,
  isPersistedStrategy,
  selectedStrategyId,
  onSaveAxes,
  onSaveObjectives,
  axesSavePending,
  objectivesSavePending,
  readOnlyLinks,
}: {
  sectionId?: string;
  directionLabel: string | null;
  alignedVisionId: string;
  onAlignedVisionChange: (visionId: string) => void;
  visions: VisionOption[];
  alignedVisionMeta: { title: string; horizonLabel: string; isActive: boolean };
  canEditFields: boolean;
  isCreating: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  visionAlignedWithServer: boolean;
  showAlignmentWorkbench: boolean;
  alignmentEditOpen: boolean;
  pickAlignmentEnabled: boolean;
  alignmentCreateOpen: boolean;
  linksLoading: boolean;
  linksError: boolean;
  axesForVision: AxisOption[];
  objectivesEligible: ObjectiveOption[];
  selectedAxisIds: string[];
  selectedObjectiveIds: string[];
  onToggleAxis: (axisId: string) => void;
  onToggleObjective: (objectiveId: string) => void;
  getAxisPresentation: (axisName: string) => AxisPresentation;
  objectiveStatusLabel: (status: string) => string;
  isPersistedStrategy: boolean;
  selectedStrategyId: string | null;
  onSaveAxes: () => void;
  onSaveObjectives: () => void;
  axesSavePending: boolean;
  objectivesSavePending: boolean;
  readOnlyLinks?: {
    axes: Array<{ id: string; name: string }>;
    objectives: Array<{ id: string; title: string; axis: { name: string }; status: string }>;
  } | null;
}) {
  const alignmentReady = Boolean(directionLabel && alignedVisionId);
  const axisCount = selectedAxisIds.length;
  const objectiveCount = selectedObjectiveIds.length;
  const selectedVisionLabel =
    alignedVisionId && alignedVisionMeta.title !== '—'
      ? `${alignedVisionMeta.title} (${alignedVisionMeta.horizonLabel || '—'})`
      : null;

  return (
    <section
      className="starium-form-section border-border/60"
      aria-labelledby={sectionId}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h3 id={sectionId} className="starium-form-section-title mb-0">
            <Link2 aria-hidden />
            Alignement stratégique
          </h3>
          <p className="text-xs text-muted-foreground">
            Ancre la stratégie sur la vision groupe, puis sélectionne les axes et objectifs porteurs.
          </p>
        </div>
        {showAlignmentWorkbench ? (
          <div className="flex flex-wrap gap-2" aria-live="polite">
            <Badge variant="outline" className="h-7 gap-1.5 px-2.5 text-xs font-medium">
              <Target className="size-3.5 opacity-70" aria-hidden />
              {axisCount} axe{axisCount > 1 ? 's' : ''}
            </Badge>
            <Badge variant="outline" className="h-7 gap-1.5 px-2.5 text-xs font-medium">
              <Target className="size-3.5 opacity-70" aria-hidden />
              {objectiveCount} objectif{objectiveCount > 1 ? 's' : ''}
            </Badge>
          </div>
        ) : null}
      </div>

      <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-end">
        <div
          className={cn(
            'starium-form-section--inline-summary rounded-lg border px-3 py-2.5',
            directionLabel ? 'opacity-100' : 'opacity-80',
          )}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Direction</p>
          <p className="mt-0.5 truncate text-sm font-medium text-foreground">
            {directionLabel ?? 'À définir dans la synthèse'}
          </p>
        </div>

        <div className="hidden justify-center text-muted-foreground lg:flex lg:pb-3" aria-hidden>
          <ArrowRight className="size-4" />
        </div>

        <div className="starium-form-field">
          <Label htmlFor={`${sectionId}-vision`} className="starium-form-label">
            Vision alignée
          </Label>
          <Select
            value={alignedVisionId}
            onValueChange={(visionId) => {
              if (visionId != null) onAlignedVisionChange(visionId);
            }}
            disabled={!canEditFields}
          >
            <SelectTrigger
              id={`${sectionId}-vision`}
              className="starium-form-input h-9 w-full min-w-0"
              aria-label="Vision alignée"
            >
              <SelectValue placeholder="Choisir une vision">
                {selectedVisionLabel}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {visions.map((vision) => (
                <SelectItem key={vision.id} value={vision.id}>
                  {vision.title} ({vision.horizonLabel})
                  {vision.isActive ? '' : ' · inactive'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {alignedVisionId ? (
        <div
          className={cn(
            'mb-4 rounded-lg border px-4 py-3',
            alignedVisionMeta.isActive
              ? 'border-[color-mix(in_srgb,var(--brand-gold)_28%,var(--border))] bg-[color-mix(in_srgb,var(--brand-gold)_7%,var(--card))]'
              : 'border-border/70 bg-muted/25',
          )}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{alignedVisionMeta.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Période {alignedVisionMeta.horizonLabel || '—'}
              </p>
            </div>
            <Badge
              variant={alignedVisionMeta.isActive ? 'default' : 'secondary'}
              className={cn(
                'shrink-0',
                alignedVisionMeta.isActive &&
                  'bg-[color-mix(in_srgb,var(--brand-gold)_18%,var(--primary))] text-foreground',
              )}
            >
              {alignedVisionMeta.isActive ? 'Vision active' : 'Vision inactive'}
            </Badge>
          </div>
        </div>
      ) : (
        <p className="mb-4 text-xs text-muted-foreground">
          Choisis une vision pour afficher le fil d’alignement et lier axes / objectifs.
        </p>
      )}

      {isCreating && canCreate ? (
        !alignmentReady ? (
          <Alert>
            <AlertDescription>
              {!directionLabel && !alignedVisionId
                ? 'Renseigne la direction (synthèse) et choisis une vision : les listes axes / objectifs se mettent à jour dynamiquement.'
                : !directionLabel
                  ? 'Renseigne la direction dans la synthèse pour poursuivre l’alignement.'
                  : 'Choisis une vision alignée pour charger les axes et objectifs du référentiel.'}
            </AlertDescription>
          </Alert>
        ) : !canUpdate ? (
          <Alert>
            <AlertDescription>
              Sans la permission{' '}
              <code className="text-xs">strategic_direction_strategy.update</code>, tu peux consulter les listes mais
              les coches ne seront pas persistées à la création du brouillon.
            </AlertDescription>
          </Alert>
        ) : (
          <p className="text-xs text-muted-foreground">
            Les sélections sont enregistrées avec le brouillon via « Créer le brouillon ».
          </p>
        )
      ) : null}

      {!isCreating && !visionAlignedWithServer ? (
        <Alert className="mb-4">
          <AlertDescription>
            La vision sélectionnée diffère de celle enregistrée. Enregistre la fiche pour mettre à jour les liens axes /
            objectifs.
          </AlertDescription>
        </Alert>
      ) : null}

      {showAlignmentWorkbench ? (
        <div className="space-y-4">
          {alignmentEditOpen && linksLoading ? (
            <p className="text-xs text-muted-foreground" aria-live="polite">
              Chargement des liens…
            </p>
          ) : null}
          {alignmentEditOpen && linksError ? (
            <Alert variant="destructive">
              <AlertDescription>Impossible de charger les liens vision / axes / objectifs.</AlertDescription>
            </Alert>
          ) : null}

          {pickAlignmentEnabled || alignmentCreateOpen ? (
            <div className="grid gap-4 xl:grid-cols-2">
              <AlignmentPickColumn
                title="Axes de la vision"
                emptyLabel="Aucun axe pour cette vision dans le référentiel."
                count={axisCount}
                isEmpty={axesForVision.length === 0}
                footer={
                  isPersistedStrategy ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="min-h-9"
                      disabled={axesSavePending || !selectedStrategyId}
                      onClick={onSaveAxes}
                    >
                      {axesSavePending ? 'Enregistrement…' : 'Enregistrer les axes liés'}
                    </Button>
                  ) : axisCount === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Coche au moins un axe stratégique pour cadrer l’alignement.
                    </p>
                  ) : null
                }
              >
                {axesForVision.map((axis) => {
                  const { title, AxisIcon, colorClass } = getAxisPresentation(axis.name);
                  const checked = selectedAxisIds.includes(axis.id);
                  return (
                    <AlignmentPickCard
                      key={axis.id}
                      checked={checked}
                      disabled={!pickAlignmentEnabled}
                      onToggle={() => onToggleAxis(axis.id)}
                      label={title}
                      checkboxId={`${sectionId}-axis-${axis.id}`}
                      meta={
                        axis.orderIndex != null ? (
                          <span className="text-xs text-muted-foreground">Ordre {axis.orderIndex}</span>
                        ) : null
                      }
                      icon={
                        AxisIcon ? (
                          <AxisIcon className={cn('size-4 shrink-0', colorClass)} aria-hidden />
                        ) : null
                      }
                    />
                  );
                })}
              </AlignmentPickColumn>

              <AlignmentPickColumn
                title="Objectifs stratégiques"
                subtitle={
                  selectedAxisIds.length > 0
                    ? 'Objectifs rattachés aux axes cochés uniquement.'
                    : 'Tous les objectifs de la vision sont proposés tant qu’aucun axe n’est lié.'
                }
                emptyLabel="Aucun objectif disponible avec les filtres actuels."
                count={objectiveCount}
                isEmpty={objectivesEligible.length === 0}
                footer={
                  isPersistedStrategy ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="min-h-9"
                      disabled={objectivesSavePending || !selectedStrategyId}
                      onClick={onSaveObjectives}
                    >
                      {objectivesSavePending ? 'Enregistrement…' : 'Enregistrer les objectifs liés'}
                    </Button>
                  ) : objectiveCount === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Coche les objectifs qui concrétisent l’alignement avec la vision.
                    </p>
                  ) : null
                }
              >
                {objectivesEligible.map((obj) => {
                  const axisName =
                    axesForVision.find((axis) => axis.id === obj.axisId)?.name ?? '';
                  const { title: axisTitle, AxisIcon, colorClass } = getAxisPresentation(axisName);
                  const checked = selectedObjectiveIds.includes(obj.id);
                  return (
                    <AlignmentPickCard
                      key={obj.id}
                      checked={checked}
                      disabled={!pickAlignmentEnabled}
                      onToggle={() => onToggleObjective(obj.id)}
                      label={obj.title}
                      checkboxId={`${sectionId}-objective-${obj.id}`}
                      meta={
                        <span className="inline-flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                          {AxisIcon ? (
                            <AxisIcon className={cn('size-3.5', colorClass)} aria-hidden />
                          ) : null}
                          {axisTitle}
                          <span aria-hidden>·</span>
                          {objectiveStatusLabel(obj.status)}
                        </span>
                      }
                    />
                  );
                })}
              </AlignmentPickColumn>
            </div>
          ) : null}

          {alignmentEditOpen && !pickAlignmentEnabled && readOnlyLinks ? (
            <div className="grid gap-4 xl:grid-cols-2">
              <ReadOnlyLinksColumn
                title="Axes liés"
                emptyLabel="Aucun axe lié pour l’instant."
                items={readOnlyLinks.axes.map((axis) => {
                  const { title, AxisIcon, colorClass } = getAxisPresentation(axis.name);
                  return (
                    <li key={axis.id} className="flex items-center gap-1.5 text-sm text-foreground">
                      {AxisIcon ? <AxisIcon className={cn('size-3.5', colorClass)} aria-hidden /> : null}
                      {title}
                    </li>
                  );
                })}
              />
              <ReadOnlyLinksColumn
                title="Objectifs liés"
                emptyLabel="Aucun objectif lié pour l’instant."
                items={readOnlyLinks.objectives.map((obj) => {
                  const { title, AxisIcon, colorClass } = getAxisPresentation(obj.axis.name);
                  return (
                    <li key={obj.id} className="text-sm text-foreground">
                      {obj.title}
                      <span className="ml-1 text-xs text-muted-foreground">
                        ·{' '}
                        {AxisIcon ? <AxisIcon className={cn('mr-1 inline size-3.5', colorClass)} aria-hidden /> : null}
                        {title} · {objectiveStatusLabel(obj.status)}
                      </span>
                    </li>
                  );
                })}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function ReadOnlyLinksColumn({
  title,
  emptyLabel,
  items,
}: {
  title: string;
  emptyLabel: string;
  items: ReactNode[];
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/15 px-3 py-2.5">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="space-y-1">{items}</ul>
      )}
    </div>
  );
}

function AlignmentPickColumn({
  title,
  subtitle,
  emptyLabel,
  count,
  children,
  footer,
  isEmpty = false,
}: {
  title: string;
  subtitle?: string;
  emptyLabel: string;
  count: number;
  children: ReactNode;
  footer?: ReactNode;
  isEmpty?: boolean;
}) {
  return (
    <div className="flex min-h-0 flex-col rounded-lg border border-border/70 bg-background/80">
      <div className="border-b border-border/60 px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
          <Badge variant="outline" className="h-6 px-2 text-[10px] font-semibold">
            {count}
          </Badge>
        </div>
        {subtitle ? <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{subtitle}</p> : null}
      </div>
      <div className="max-h-52 space-y-1.5 overflow-y-auto p-2 sm:max-h-60">
        {isEmpty ? <p className="px-1 py-2 text-xs text-muted-foreground">{emptyLabel}</p> : children}
      </div>
      {footer ? <div className="border-t border-border/60 px-3 py-2.5">{footer}</div> : null}
    </div>
  );
}

function AlignmentPickCard({
  checked,
  disabled,
  onToggle,
  label,
  checkboxId,
  meta,
  icon,
}: {
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
  label: string;
  checkboxId: string;
  meta?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-md border px-2.5 py-2 transition-colors',
        checked
          ? 'border-[color-mix(in_srgb,var(--brand-gold)_35%,var(--border))] bg-[color-mix(in_srgb,var(--brand-gold)_8%,var(--card))]'
          : 'border-transparent bg-muted/20 hover:bg-muted/35',
        disabled && 'opacity-60',
      )}
    >
      <Checkbox
        id={checkboxId}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onToggle}
        aria-label={label}
        className="mt-0.5"
      />
      <label htmlFor={checkboxId} className="min-w-0 flex-1 cursor-pointer space-y-0.5">
        <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          {icon}
          <span className="min-w-0 wrap-break-word">{label}</span>
        </span>
        {meta ? <div>{meta}</div> : null}
      </label>
    </div>
  );
}
