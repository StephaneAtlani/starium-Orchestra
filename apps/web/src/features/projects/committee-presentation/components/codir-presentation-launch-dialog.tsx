'use client';

import { useEffect, useMemo, useState } from 'react';
import { Monitor, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { PROJECT_STATUS_LABEL } from '../../constants/project-enum-labels';
import { ProjectTagsFilter } from '../../components/project-tags-filter';
import {
  CODIR_PRESENTATION_STATUSES,
  filterProjectsForPresentation,
} from '../lib/codir-presentation-filters';
import {
  DEFAULT_CODIR_PAGE_SETTINGS,
  type CodirPageSettings,
} from '../hooks/use-codir-page-settings';
import type { ProjectListItem } from '../../types/project.types';

type CodirPresentationLaunchDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: ProjectListItem[];
  settings: CodirPageSettings;
  onSaveSettings: (settings: CodirPageSettings) => void;
  onLaunch: (slideIndex?: number, launchSettings?: CodirPageSettings) => void;
};

export function CodirPresentationLaunchDialog({
  open,
  onOpenChange,
  projects,
  settings,
  onSaveSettings,
  onLaunch,
}: CodirPresentationLaunchDialogProps) {
  const [draft, setDraft] = useState<CodirPageSettings>(settings);

  useEffect(() => {
    if (!open) return;
    setDraft(settings);
  }, [open, settings]);

  const filteredCount = useMemo(
    () => filterProjectsForPresentation(projects, draft).length,
    [projects, draft],
  );

  const ganttGroupLabel =
    draft.presentationIncludedTagIds.length > 0
      ? 'Regroupement par étiquette sélectionnée'
      : 'Regroupement par catégorie portefeuille';

  const toggleStatus = (status: string) => {
    setDraft((prev) => {
      const set = new Set(prev.presentationIncludedStatuses);
      if (set.has(status)) set.delete(status);
      else set.add(status);
      return { ...prev, presentationIncludedStatuses: [...set] };
    });
  };

  const selectAllStatuses = () => {
    setDraft((prev) => ({
      ...prev,
      presentationIncludedStatuses: [...CODIR_PRESENTATION_STATUSES],
    }));
  };

  const clearStatuses = () => {
    setDraft((prev) => ({ ...prev, presentationIncludedStatuses: [] }));
  };

  const handleLaunch = () => {
    onSaveSettings(draft);
    onLaunch(0, draft);
    onOpenChange(false);
  };

  const handleReset = () => {
    setDraft({
      ...settings,
      presentationIncludedStatuses: DEFAULT_CODIR_PAGE_SETTINGS.presentationIncludedStatuses,
      presentationIncludedTagIds: [],
      includeGanttSlide: DEFAULT_CODIR_PAGE_SETTINGS.includeGanttSlide,
    });
  };

  const canLaunch =
    draft.includeCoverSlide ||
    draft.includePortfolioSlide ||
    draft.includeGanttSlide ||
    filteredCount > 0;

  return (
    <StariumModal
      open={open}
      onOpenChange={onOpenChange}
      title="Lancer le mode présentation"
      description="Filtrez le portefeuille affiché dans le diaporama et choisissez les diapositives."
      icon={Monitor}
      size="lg"
      footer={
        <>
          <Button type="button" variant="outline" onClick={handleReset}>
            Réinitialiser filtres
          </Button>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="button" className="gap-1.5" disabled={!canLaunch} onClick={handleLaunch}>
            <Play className="size-4" aria-hidden />
            Lancer
          </Button>
        </>
      }
    >
      <div className="starium-form space-y-5">
        <section className="starium-form-section space-y-2">
          <h3 className="starium-modal-seg-title">Statuts projet</h3>
          <p className="text-xs text-muted-foreground">
            Seuls les projets dont le statut est coché apparaîtront dans le diaporama (
            {filteredCount} projet{filteredCount > 1 ? 's' : ''} correspondant
            {filteredCount > 1 ? 's' : ''}).
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={selectAllStatuses}>
              Tout sélectionner
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={clearStatuses}>
              Tout effacer
            </Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {CODIR_PRESENTATION_STATUSES.map((status) => {
              const label = PROJECT_STATUS_LABEL[status] ?? status;
              const checked = draft.presentationIncludedStatuses.includes(status);
              return (
                <label
                  key={status}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    className="size-4 shrink-0"
                    checked={checked}
                    onChange={() => toggleStatus(status)}
                  />
                  <span className="font-medium">{label}</span>
                </label>
              );
            })}
          </div>
        </section>

        <section className="starium-form-section space-y-2">
          <h3 className="starium-modal-seg-title">Étiquettes</h3>
          <p className="text-xs text-muted-foreground">
            Laissez vide pour inclure tous les projets (sans filtre étiquette). Si vous en
            sélectionnez, seuls les projets portant au moins une de ces étiquettes sont retenus.
          </p>
          <ProjectTagsFilter
            panelLayout="inline"
            value={draft.presentationIncludedTagIds}
            onChange={(tagIds) =>
              setDraft((prev) => ({ ...prev, presentationIncludedTagIds: tagIds }))
            }
          />
        </section>

        <section className="starium-form-section space-y-2">
          <h3 className="starium-modal-seg-title">Diapositives optionnelles</h3>
          <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-border/70 bg-muted/20 p-3 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 size-4 shrink-0"
              checked={draft.includeGanttSlide}
              onChange={() =>
                setDraft((prev) => ({ ...prev, includeGanttSlide: !prev.includeGanttSlide }))
              }
            />
            <span>
              <span className="font-medium">Frise Gantt portefeuille</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{ganttGroupLabel}</span>
              {draft.includeGanttSlide && draft.presentationIncludedTagIds.length > 0 ? (
                <span className="mt-0.5 block text-xs font-medium text-muted-foreground">
                  {draft.presentationIncludedTagIds.length} diapositive
                  {draft.presentationIncludedTagIds.length > 1 ? 's' : ''} Gantt (une par étiquette).
                </span>
              ) : null}
            </span>
          </label>
          <p className="text-xs text-muted-foreground">
            Les diapositives couverture et synthèse se configurent dans « Configurer ».
          </p>
        </section>

        {filteredCount === 0 &&
        !draft.includeCoverSlide &&
        !draft.includePortfolioSlide &&
        !draft.includeGanttSlide ? (
          <p className="text-sm font-medium text-amber-950 dark:text-amber-400" role="alert">
            Aucune diapositive à afficher : cochez au moins un statut ou une diapositive
            optionnelle.
          </p>
        ) : null}
      </div>
    </StariumModal>
  );
}
