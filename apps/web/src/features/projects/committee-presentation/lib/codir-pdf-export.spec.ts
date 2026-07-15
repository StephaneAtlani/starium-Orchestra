import { describe, expect, it, vi, afterEach } from 'vitest';
import { DEFAULT_CODIR_PAGE_SETTINGS } from '../hooks/use-codir-page-settings';
import { countCodirPdfSlides, exportCodirPdf } from './codir-pdf-export';
import type { ProjectListItem } from '../../types/project.types';

const saveMock = vi.fn();
const addPageMock = vi.fn();

vi.mock('./codir-minimal-pdf', () => ({
  createCodirPdfDocument: vi.fn(() => ({
    addPage: addPageMock,
    save: saveMock,
    setFillColor: vi.fn(),
    setTextColor: vi.fn(),
    setDrawColor: vi.fn(),
    setLineWidth: vi.fn(),
    setFont: vi.fn(),
    setFontSize: vi.fn(),
    text: vi.fn(),
    splitTextToSize: vi.fn((value: string) => [value]),
    rect: vi.fn(),
    roundedRect: vi.fn(),
    line: vi.fn(),
    circle: vi.fn(),
  })),
}));

function project(id: string): ProjectListItem {
  return {
    id,
    code: id,
    name: `Projet ${id}`,
    kind: 'PROJECT',
    type: 'APPLICATION',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    criticality: 'MEDIUM',
    progressPercent: 40,
    derivedProgressPercent: null,
    computedHealth: 'GREEN',
    targetEndDate: '2026-12-01',
    ownerUserId: null,
    ownerDisplayName: 'Alice',
    openTasksCount: 2,
    openRisksCount: 0,
    delayedMilestonesCount: 0,
    signals: {
      isLate: false,
      isBlocked: false,
      hasNoOwner: false,
      hasNoTasks: false,
      hasNoRisks: false,
      hasNoMilestones: false,
      hasPlanningDrift: false,
      isCritical: false,
    },
    warnings: [],
    tags: [],
    portfolioCategory: null,
    targetBudgetAmount: null,
    consumedBudgetAmount: null,
  } as ProjectListItem;
}

describe('countCodirPdfSlides', () => {
  it('compte couverture + synthèse + projets', () => {
    const count = countCodirPdfSlides({
      settings: {
        ...DEFAULT_CODIR_PAGE_SETTINGS,
        includeCoverSlide: true,
        includePortfolioSlide: true,
        includeGanttSlide: false,
      },
      clientName: 'Acme',
      presentationProjects: [project('a'), project('b')],
      ganttItems: [],
    });

    expect(count).toBe(4);
  });
});

describe('exportCodirPdf', () => {
  afterEach(() => {
    saveMock.mockClear();
    addPageMock.mockClear();
  });

  it('génère un PDF et déclenche save', () => {
    exportCodirPdf({
      settings: {
        ...DEFAULT_CODIR_PAGE_SETTINGS,
        includeCoverSlide: true,
        includePortfolioSlide: true,
        includeGanttSlide: false,
      },
      clientName: 'Acme',
      presentationProjects: [project('a')],
      ganttItems: [],
    });

    expect(saveMock).toHaveBeenCalledWith(expect.stringMatching(/^presentation-portefeuille-\d{4}-\d{2}-\d{2}\.pdf$/));
  });

  it('refuse un export sans diapositive', () => {
    expect(() =>
      exportCodirPdf({
        settings: {
          ...DEFAULT_CODIR_PAGE_SETTINGS,
          includeCoverSlide: false,
          includePortfolioSlide: false,
          includeGanttSlide: false,
        },
        clientName: 'Acme',
        presentationProjects: [],
        ganttItems: [],
      }),
    ).toThrow(/Aucune diapositive/);
  });
});
