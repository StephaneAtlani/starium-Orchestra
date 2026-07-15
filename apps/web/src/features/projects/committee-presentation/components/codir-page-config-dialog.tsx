'use client';

import { useEffect, useState } from 'react';
import { Moon, Settings2, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import type { ProjectListItem } from '../../types/project.types';
import {
  DEFAULT_CODIR_PAGE_SETTINGS,
  type CodirPageSettings,
  type CodirPresentationTheme,
} from '../hooks/use-codir-page-settings';
import { useCommitteeWidgetLayout } from '../hooks/use-committee-widget-layout';
import {
  loadHiddenWidgetIds,
  loadPortfolioWidgetLayout,
  persistWidgetLayout,
  persistWidgetLayoutForAllProjects,
} from '../lib/committee-widget-layout-storage';
import { COMMITTEE_WIDGETS_V1, type WidgetId } from '../widgets/committee-widget-registry';
import { CommitteeWidgetConfigPanel } from '../widgets/committee-widget-config-panel';

type WidgetConfigScope = 'all' | 'project';

type CodirPageConfigDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: ProjectListItem[];
  settings: CodirPageSettings;
  onSaveSettings: (settings: CodirPageSettings) => void;
  initialProjectId?: string | null;
};

export function CodirPageConfigDialog({
  open,
  onOpenChange,
  projects,
  settings,
  onSaveSettings,
  initialProjectId = null,
}: CodirPageConfigDialogProps) {
  const [draft, setDraft] = useState<CodirPageSettings>(settings);
  const [widgetScope, setWidgetScope] = useState<WidgetConfigScope>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [allProjectsHidden, setAllProjectsHidden] = useState<WidgetId[]>([]);

  const layoutProjectId =
    widgetScope === 'project' ? selectedProjectId || projects[0]?.id || '' : '';
  const layout = useCommitteeWidgetLayout(layoutProjectId);

  useEffect(() => {
    if (!open) return;
    setDraft(settings);
    setAllProjectsHidden(loadPortfolioWidgetLayout());
    const preferred =
      initialProjectId && projects.some((p) => p.id === initialProjectId)
        ? initialProjectId
        : projects[0]?.id ?? '';
    setSelectedProjectId(preferred);
    setWidgetScope(initialProjectId ? 'project' : 'all');
  }, [open, settings, projects, initialProjectId]);

  const toggle = (key: keyof Pick<
    CodirPageSettings,
    | 'showSynthesisSection'
    | 'showReportingSection'
    | 'includeCoverSlide'
    | 'includePortfolioSlide'
    | 'includeGanttSlide'
  >) => {
    setDraft((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const setPresentationTheme = (theme: CodirPresentationTheme) => {
    setDraft((prev) => ({ ...prev, presentationTheme: theme }));
  };

  const handleSave = () => {
    onSaveSettings(draft);
    if (projects.length === 0) {
      onOpenChange(false);
      return;
    }

    if (widgetScope === 'all') {
      persistWidgetLayoutForAllProjects(
        projects.map((p) => p.id),
        allProjectsHidden,
      );
    } else if (layoutProjectId) {
      persistWidgetLayout(layoutProjectId, layout.hiddenWidgets);
    }

    onOpenChange(false);
  };

  const handleReset = () => {
    setDraft(DEFAULT_CODIR_PAGE_SETTINGS);
  };

  const toggleAllProjectsWidget = (id: WidgetId) => {
    setAllProjectsHidden((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const applyCurrentProjectToAll = () => {
    if (!layoutProjectId) return;
    const hidden = loadHiddenWidgetIds(layoutProjectId);
    setAllProjectsHidden(hidden);
    setWidgetScope('all');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90dvh,760px)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Configuration CODIR</DialogTitle>
          <DialogDescription>
            Personnalisez la page de préparation et le diaporama plein écran.
          </DialogDescription>
        </DialogHeader>

        <section className="space-y-3">
          <h3 className="starium-overline">Page de préparation</h3>
          <div className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-3">
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={draft.showSynthesisSection}
                onChange={() => toggle('showSynthesisSection')}
              />
              <span>
                <span className="font-medium">Synthèse du portefeuille</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  KPI, répartition par statut et points d&apos;attention.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={draft.showReportingSection}
                onChange={() => toggle('showReportingSection')}
              />
              <span>
                <span className="font-medium">Cartes reporting projet</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Grille des indicateurs par projet.
                </span>
              </span>
            </label>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="starium-overline">Mode présentation</h3>
          <div className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-3">
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={draft.includeCoverSlide}
                onChange={() => toggle('includeCoverSlide')}
              />
              <span>
                <span className="font-medium">Diapositive de couverture</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Titre de séance et KPI d&apos;ouverture.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={draft.includePortfolioSlide}
                onChange={() => toggle('includePortfolioSlide')}
              />
              <span>
                <span className="font-medium">Diapositive synthèse consolidée</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Vue portefeuille en plein écran.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={draft.includeGanttSlide}
                onChange={() => toggle('includeGanttSlide')}
              />
              <span>
                <span className="font-medium">Diapositive frise Gantt</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Planning simplifié — une diapositive par étiquette sélectionnée (filtres au
                  lancement).
                </span>
              </span>
            </label>
          </div>

          <div className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-3">
            <Label id="codir-presentation-theme-label">Thème de présentation</Label>
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-labelledby="codir-presentation-theme-label"
            >
              <button
                type="button"
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  draft.presentationTheme === 'dark'
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border/70 bg-background text-muted-foreground hover:bg-muted/50'
                }`}
                aria-pressed={draft.presentationTheme === 'dark'}
                onClick={() => setPresentationTheme('dark')}
              >
                <Moon className="size-3.5" aria-hidden />
                Foncé
              </button>
              <button
                type="button"
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  draft.presentationTheme === 'light'
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border/70 bg-background text-muted-foreground hover:bg-muted/50'
                }`}
                aria-pressed={draft.presentationTheme === 'light'}
                onClick={() => setPresentationTheme('light')}
              >
                <Sun className="size-3.5" aria-hidden />
                Clair
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Le thème s&apos;applique au diaporama plein écran (couverture, synthèse et slides
              projet).
            </p>
          </div>

          {projects.length > 0 ? (
            <div className="space-y-3 rounded-lg border border-border/70 p-3">
              <div className="space-y-2">
                <Label>Widgets par projet</Label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      widgetScope === 'all'
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border/70 bg-background text-muted-foreground hover:bg-muted/50'
                    }`}
                    onClick={() => setWidgetScope('all')}
                  >
                    Tous les projets ({projects.length})
                  </button>
                  <button
                    type="button"
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      widgetScope === 'project'
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border/70 bg-background text-muted-foreground hover:bg-muted/50'
                    }`}
                    onClick={() => setWidgetScope('project')}
                  >
                    Un projet
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Jusqu&apos;à 6 widgets visibles par diapositive projet.
                </p>
              </div>

              {widgetScope === 'all' ? (
                <>
                  <p className="text-xs text-muted-foreground">
                    La sélection s&apos;applique à l&apos;ensemble du portefeuille à
                    l&apos;enregistrement.
                  </p>
                  <CommitteeWidgetConfigPanel
                    widgets={COMMITTEE_WIDGETS_V1}
                    hiddenWidgets={allProjectsHidden}
                    onToggle={toggleAllProjectsWidget}
                  />
                </>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="codir-config-project">Projet</Label>
                    <select
                      id="codir-config-project"
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={layoutProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                    >
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <CommitteeWidgetConfigPanel
                    widgets={layout.widgets}
                    hiddenWidgets={layout.hiddenWidgets}
                    onToggle={layout.toggleWidget}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={applyCurrentProjectToAll}
                  >
                    Appliquer ce projet à tout le portefeuille
                  </Button>
                </>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun projet à configurer.</p>
          )}
        </section>

        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={handleReset}>
            Réinitialiser
          </Button>
          <Button type="button" onClick={handleSave}>
            Enregistrer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CodirConfigureButton({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" variant="outline" size="xs" className="gap-1" onClick={onClick}>
      <Settings2 className="size-3" aria-hidden />
      Configurer
    </Button>
  );
}
