'use client';

import { useCallback, useMemo, useState } from 'react';
import { toast } from '@/lib/toast';
import { useActiveClient } from '@/hooks/use-active-client';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { usePortfolioSummaryQuery } from '../../hooks/use-portfolio-summary-query';
import { usePortfolioGanttQuery } from '../../hooks/use-portfolio-gantt-query';
import { useCommitteeCodirDeckQuery } from '../hooks/use-committee-codir-deck-query';
import {
  computeAttentionPoints,
  computeDeckKpis,
  computeStatusBreakdown,
  sortDeckProjects,
} from '../lib/codir-deck-metrics';
import {
  codirPortfolioGanttQueryParams,
  countPresentationGanttSlides,
  filterProjectsForPresentation,
} from '../lib/codir-presentation-filters';
import {
  type CodirPageSettings,
  projectPresentationSlideIndex,
} from '../hooks/use-codir-page-settings';
import { CodirPageConfigDialog } from './codir-page-config-dialog';
import { CodirHero } from './codir-hero';
import { CodirPortfolioSynthesis } from './codir-portfolio-synthesis';
import { CodirProjectReportCard } from './codir-project-report-card';
import { CodirSectionHeader } from './codir-section-header';
import { countCodirPdfSlides, exportCodirPdf } from '../lib/codir-pdf-export';

type CodirPrepViewProps = {
  settings: CodirPageSettings;
  onSaveSettings: (settings: CodirPageSettings) => void;
  configOpen: boolean;
  onConfigOpenChange: (open: boolean) => void;
  configProjectId: string | null;
  onOpenConfigure: (projectId?: string | null) => void;
  onOpenPresentationLaunch: () => void;
  onStartPresentation: (slideIndex?: number, launchSettings?: CodirPageSettings) => void;
};

export function CodirPrepView({
  settings,
  onSaveSettings,
  configOpen,
  onConfigOpenChange,
  configProjectId,
  onOpenConfigure,
  onOpenPresentationLaunch,
  onStartPresentation,
}: CodirPrepViewProps) {
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const { activeClient } = useActiveClient();
  const summaryQ = usePortfolioSummaryQuery({ enabled: true });
  const deckQ = useCommitteeCodirDeckQuery({ enabled: true });
  const ganttParams = useMemo(() => codirPortfolioGanttQueryParams(settings), [settings]);
  const ganttQ = usePortfolioGanttQuery(ganttParams, { enabled: true });

  const sortedProjects = useMemo(
    () => sortDeckProjects(deckQ.data ?? []),
    [deckQ.data],
  );

  const presentationProjects = useMemo(
    () => filterProjectsForPresentation(sortedProjects, settings),
    [sortedProjects, settings],
  );

  const ganttSlideCount = useMemo(
    () => countPresentationGanttSlides(settings),
    [settings],
  );

  const kpis = useMemo(
    () => computeDeckKpis(sortedProjects, summaryQ.data),
    [sortedProjects, summaryQ.data],
  );
  const statusBreakdown = useMemo(
    () => computeStatusBreakdown(sortedProjects),
    [sortedProjects],
  );
  const attentionPoints = useMemo(
    () => computeAttentionPoints(sortedProjects),
    [sortedProjects],
  );

  const handleExportPdf = useCallback(() => {
    const exportPayload = {
      settings,
      clientName: activeClient?.name ?? 'Client actif',
      presentationProjects,
      ganttItems: ganttQ.data?.items ?? [],
    };

    if (countCodirPdfSlides(exportPayload) === 0) {
      toast.error(
        'Aucune diapositive à exporter — activez couverture, synthèse, Gantt ou des projets filtrés.',
      );
      return;
    }

    setIsExportingPdf(true);
    try {
      exportCodirPdf(exportPayload);
      toast.success('PDF téléchargé — diapositives de présentation exportées.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Export PDF impossible.');
    } finally {
      setIsExportingPdf(false);
    }
  }, [activeClient?.name, ganttQ.data?.items, presentationProjects, settings]);

  if (deckQ.isLoading || summaryQ.isLoading) {
    return <LoadingState rows={4} />;
  }

  if (deckQ.isError) {
    return (
      <ErrorState message="Impossible de charger le portefeuille. Réessayez ou vérifiez votre accès au module Projets." />
    );
  }

  return (
    <div className="space-y-2">
      <CodirHero
        onOpenPresentationLaunch={onOpenPresentationLaunch}
        onConfigure={() => onOpenConfigure(null)}
        onExportPdf={handleExportPdf}
        isExportingPdf={isExportingPdf}
      />

      <CodirPageConfigDialog
        open={configOpen}
        onOpenChange={onConfigOpenChange}
        projects={sortedProjects}
        settings={settings}
        onSaveSettings={onSaveSettings}
        initialProjectId={configProjectId}
      />

      {settings.showSynthesisSection ? (
        <CodirPortfolioSynthesis
          kpis={kpis}
          statusBreakdown={statusBreakdown}
          attentionPoints={attentionPoints}
          isLoading={false}
        />
      ) : null}

      {settings.showReportingSection ? (
        <>
          <CodirSectionHeader
            number={2}
            title="Reporting projet"
            subtitle="Revue individuelle · indicateurs clés par projet"
          />

          {sortedProjects.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
              Aucun projet dans le périmètre.
            </p>
          ) : (
            <div className="starium-codir-report-grid">
              {sortedProjects.map((project) => (
                <CodirProjectReportCard
                  key={project.id}
                  project={project}
                  onOpenPresentation={() => {
                    const idx = presentationProjects.findIndex((p) => p.id === project.id);
                    if (idx === -1) {
                      onOpenPresentationLaunch();
                      return;
                    }
                    onStartPresentation(
                      projectPresentationSlideIndex(idx, settings, ganttSlideCount),
                      settings,
                    );
                  }}
                  onConfigure={() => onOpenConfigure(project.id)}
                />
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
