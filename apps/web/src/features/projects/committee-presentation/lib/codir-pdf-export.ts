'use client';

import {
  buildPresentationSlides,
  type CodirPageSettings,
} from '../hooks/use-codir-page-settings';
import type { PortfolioGanttRow, ProjectListItem } from '../../types/project.types';
import {
  computePresentationDeckKpis,
  computeStatusBreakdown,
} from './codir-deck-metrics';
import { resolvePresentationGanttSections } from './codir-presentation-filters';
import { createCodirPdfDocument } from './codir-minimal-pdf';
import {
  drawSlideFooter,
  paintSlideBackground,
  pdfThemeForSettings,
  renderCoverSlide,
  renderGanttSlide,
  renderPortfolioSlide,
  renderProjectSlide,
  resolveGanttSectionForPdf,
} from './codir-pdf-slides';

export type CodirPdfExportPayload = {
  settings: CodirPageSettings;
  clientName: string;
  presentationProjects: ProjectListItem[];
  ganttItems: PortfolioGanttRow[];
};

export function countCodirPdfSlides(payload: CodirPdfExportPayload): number {
  const ganttSections = resolvePresentationGanttSections(
    payload.ganttItems,
    payload.settings,
  );
  return buildPresentationSlides(
    payload.presentationProjects.length,
    payload.settings,
    ganttSections,
  ).length;
}

export function exportCodirPdf(payload: CodirPdfExportPayload): void {
  const slideCount = countCodirPdfSlides(payload);
  if (slideCount === 0) {
    throw new Error(
      'Aucune diapositive à exporter — activez couverture, synthèse, Gantt ou des projets dans le périmètre.',
    );
  }

  const doc = createCodirPdfDocument();
  const theme = pdfThemeForSettings(payload.settings);
  const ganttSections = resolvePresentationGanttSections(
    payload.ganttItems,
    payload.settings,
  );
  const slides = buildPresentationSlides(
    payload.presentationProjects.length,
    payload.settings,
    ganttSections,
  );

  const presentationKpis = computePresentationDeckKpis(payload.presentationProjects);
  const presentationBreakdown = computeStatusBreakdown(payload.presentationProjects);
  const filteredGantt = payload.ganttItems;

  slides.forEach((slide, slideIndex) => {
    if (slideIndex > 0) doc.addPage();
    paintSlideBackground(doc, theme);

    switch (slide.kind) {
      case 'cover':
        renderCoverSlide(doc, theme, {
          clientName: payload.clientName,
          projectCount: payload.presentationProjects.length,
          kpis: presentationKpis,
        });
        break;
      case 'portfolio':
        renderPortfolioSlide(doc, theme, {
          kpis: presentationKpis,
          statusBreakdown: presentationBreakdown,
          scoped: true,
          projectCount: payload.presentationProjects.length,
        });
        break;
      case 'gantt': {
        const section = resolveGanttSectionForPdf(
          slide.sectionKey,
          slide.sectionLabel,
          filteredGantt,
          payload.settings,
        );
        if (section) {
          renderGanttSlide(doc, theme, {
            sectionLabel: slide.sectionLabel,
            sectionIndex: slide.sectionIndex,
            sectionTotal: slide.sectionTotal,
            section,
          });
        }
        break;
      }
      case 'project': {
        const project = payload.presentationProjects[slide.projectIndex];
        if (project) {
          renderProjectSlide(doc, theme, {
            project,
            projectIndex: slide.projectIndex,
            projectTotal: payload.presentationProjects.length,
          });
        }
        break;
      }
      default:
        break;
    }

    drawSlideFooter(doc, slideIndex, slides.length, theme);
  });

  const dateSlug = new Date().toISOString().slice(0, 10);
  doc.save(`presentation-portefeuille-${dateSlug}.pdf`);
}
