import type { CodirPdfDocument } from './codir-minimal-pdf';
import { PROJECT_STATUS_LABEL, PROJECT_TYPE_LABEL } from '../../constants/project-enum-labels';
import {
  formatProjectBudget,
  formatProjectDateLong,
  projectBudgetConsumptionPercent,
  projectListProgressPercent,
  projectPortfolioCategoryLabel,
} from '../../lib/projects-list-display';
import {
  computeTimelineBounds,
  msToTimelinePercent,
  type GanttTaskLike,
} from '../../lib/gantt-timeline-layout';
import {
  groupPortfolioGanttByCategory,
  groupPortfolioGanttByTag,
  type PortfolioGanttSection,
} from '../../lib/portfolio-gantt-group';
import type { PortfolioGanttRow, ProjectListItem } from '../../types/project.types';
import type { CodirDeckKpis, CodirStatusBreakdown } from './codir-deck-metrics';
import {
  codirPresentationGanttUsesTagGrouping,
  filterPortfolioGanttForPresentation,
} from './codir-presentation-filters';
import { codirReportStatusPresentation } from './codir-report-status';
import type { CodirPageSettings } from '../hooks/use-codir-page-settings';

export const PDF_SLIDE_W = 297;
export const PDF_SLIDE_H = 210;
export const PDF_MARGIN = 14;

export type PdfRgb = [number, number, number];

export type PdfTheme = {
  bg: PdfRgb;
  fg: PdfRgb;
  fgMuted: PdfRgb;
  accent: PdfRgb;
  success: PdfRgb;
  danger: PdfRgb;
  info: PdfRgb;
  neutral: PdfRgb;
  border: PdfRgb;
  panel: PdfRgb;
};

export const PDF_THEME_DARK: PdfTheme = {
  bg: [15, 20, 28],
  fg: [248, 250, 252],
  fgMuted: [148, 163, 184],
  accent: [201, 162, 39],
  success: [34, 197, 94],
  danger: [239, 68, 68],
  info: [59, 130, 246],
  neutral: [100, 116, 139],
  border: [51, 65, 85],
  panel: [30, 41, 59],
};

export const PDF_THEME_LIGHT: PdfTheme = {
  bg: [255, 255, 255],
  fg: [15, 23, 42],
  fgMuted: [100, 116, 139],
  accent: [161, 98, 7],
  success: [22, 163, 74],
  danger: [220, 38, 38],
  info: [37, 99, 235],
  neutral: [148, 163, 184],
  border: [226, 232, 240],
  panel: [248, 250, 252],
};

export function pdfThemeForSettings(settings: CodirPageSettings): PdfTheme {
  return settings.presentationTheme === 'light' ? PDF_THEME_LIGHT : PDF_THEME_DARK;
}

function setFill(doc: CodirPdfDocument, color: PdfRgb) {
  doc.setFillColor(color[0], color[1], color[2]);
}

function setText(doc: CodirPdfDocument, color: PdfRgb) {
  doc.setTextColor(color[0], color[1], color[2]);
}

function setDraw(doc: CodirPdfDocument, color: PdfRgb) {
  doc.setDrawColor(color[0], color[1], color[2]);
}

export function paintSlideBackground(doc: CodirPdfDocument, theme: PdfTheme) {
  setFill(doc, theme.bg);
  doc.rect(0, 0, PDF_SLIDE_W, PDF_SLIDE_H, 'F');
}

export function drawSlideFooter(
  doc: CodirPdfDocument,
  slideIndex: number,
  slideTotal: number,
  theme: PdfTheme,
) {
  const y = PDF_SLIDE_H - 8;
  setDraw(doc, theme.border);
  doc.setLineWidth(0.2);
  doc.line(PDF_MARGIN, y - 3, PDF_SLIDE_W - PDF_MARGIN, y - 3);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  setText(doc, theme.fgMuted);
  doc.text('Starium · Présentation portefeuille', PDF_MARGIN, y);
  doc.text(`${slideIndex + 1} / ${slideTotal}`, PDF_SLIDE_W - PDF_MARGIN, y, {
    align: 'right',
  });
}

function drawEyebrow(doc: CodirPdfDocument, label: string, y: number, theme: PdfTheme) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  setText(doc, theme.accent);
  doc.text(label.toUpperCase(), PDF_MARGIN, y);
}

function drawTitle(doc: CodirPdfDocument, lines: string[], y: number, theme: PdfTheme, size = 22) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(size);
  setText(doc, theme.fg);
  lines.forEach((line, index) => {
    doc.text(line, PDF_MARGIN, y + index * (size * 0.45));
  });
}

function drawSubtitle(doc: CodirPdfDocument, text: string, y: number, theme: PdfTheme) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  setText(doc, theme.fgMuted);
  const wrapped = doc.splitTextToSize(text, PDF_SLIDE_W - PDF_MARGIN * 2);
  doc.text(wrapped, PDF_MARGIN, y);
}

function drawKpiHero(
  doc: CodirPdfDocument,
  items: Array<{ label: string; value: string; color?: PdfRgb }>,
  y: number,
  theme: PdfTheme,
) {
  const colW = (PDF_SLIDE_W - PDF_MARGIN * 2) / items.length;
  items.forEach((item, index) => {
    const x = PDF_MARGIN + index * colW;
    setFill(doc, theme.panel);
    setDraw(doc, theme.border);
    doc.setLineWidth(0.2);
    doc.roundedRect(x + 2, y, colW - 4, 28, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    setText(doc, theme.fgMuted);
    doc.text(item.label.toUpperCase(), x + 6, y + 8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    setText(doc, item.color ?? theme.fg);
    doc.text(item.value, x + 6, y + 22);
  });
}

function drawSynthGrid(
  doc: CodirPdfDocument,
  kpis: CodirDeckKpis,
  scoped: boolean,
  projectCount: number,
  y: number,
  theme: PdfTheme,
) {
  const cells = [
    {
      label: scoped ? 'Projets sélectionnés' : 'Projets',
      value: String(kpis.activeProjects),
      foot: scoped ? `${projectCount} dans le périmètre` : (kpis.activeProjectsDeltaLabel ?? ''),
    },
    {
      label: 'Avancement',
      value: kpis.averageProgress != null ? `${kpis.averageProgress} %` : '—',
      foot: '',
    },
    {
      label: 'Budget',
      value: kpis.budgetConsumedPercent != null ? `${kpis.budgetConsumedPercent} %` : '—',
      foot: kpis.budgetConsumedLabel ?? kpis.targetBudgetLabel ?? '',
    },
    {
      label: 'Risques crit.',
      value: String(kpis.criticalRisks),
      foot: kpis.criticalRisksLabel ?? '',
    },
    {
      label: 'Jalons tenus',
      value: kpis.milestonesOnTimePercent != null ? `${kpis.milestonesOnTimePercent} %` : '—',
      foot: kpis.milestonesOnTimeLabel ?? '',
    },
  ];

  const colW = (PDF_SLIDE_W - PDF_MARGIN * 2) / cells.length;
  cells.forEach((cell, index) => {
    const x = PDF_MARGIN + index * colW;
    setFill(doc, theme.panel);
    setDraw(doc, theme.border);
    doc.setLineWidth(0.2);
    doc.roundedRect(x + 2, y, colW - 4, 32, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    setText(doc, theme.fgMuted);
    doc.text(cell.label.toUpperCase(), x + 5, y + 8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    setText(doc, theme.fg);
    doc.text(cell.value, x + 5, y + 20);
    if (cell.foot) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      setText(doc, theme.fgMuted);
      const foot = doc.splitTextToSize(cell.foot, colW - 10);
      doc.text(foot.slice(0, 2), x + 5, y + 27);
    }
  });
}

const STATUS_LABELS: Record<keyof CodirStatusBreakdown, string> = {
  inProgress: 'En cours',
  late: 'En retard',
  planned: 'Planifiés',
  completed: 'Terminés',
};

const STATUS_COLORS: Record<keyof CodirStatusBreakdown, PdfRgb> = {
  inProgress: [34, 197, 94],
  late: [239, 68, 68],
  planned: [59, 130, 246],
  completed: [148, 163, 184],
};

function drawStatusBar(
  doc: CodirPdfDocument,
  breakdown: CodirStatusBreakdown,
  y: number,
  theme: PdfTheme,
) {
  const total = Object.values(breakdown).reduce((a, b) => a + b, 0) || 1;
  const barW = PDF_SLIDE_W - PDF_MARGIN * 2;
  const barH = 10;
  let x = PDF_MARGIN;

  (Object.keys(breakdown) as Array<keyof CodirStatusBreakdown>).forEach((key) => {
    const count = breakdown[key];
    if (count === 0) return;
    const w = Math.max(12, (count / total) * barW);
    setFill(doc, STATUS_COLORS[key]);
    doc.roundedRect(x, y, w, barH, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    setText(doc, [255, 255, 255]);
    doc.text(String(count), x + w / 2, y + 7, { align: 'center' });
    x += w;
  });

  let legendY = y + 16;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  (Object.keys(breakdown) as Array<keyof CodirStatusBreakdown>).forEach((key) => {
    setFill(doc, STATUS_COLORS[key]);
    doc.circle(PDF_MARGIN + 2, legendY - 1.5, 1.5, 'F');
    setText(doc, theme.fgMuted);
    doc.text(
      `${STATUS_LABELS[key]} ${breakdown[key]}`,
      PDF_MARGIN + 6,
      legendY,
    );
    legendY += 5;
  });
}

function ganttRowToTask(row: PortfolioGanttRow): GanttTaskLike | null {
  const end = row.targetEndDate;
  const start = row.startDate;
  if (!end && !start) return null;
  if (start && end) return { plannedStartDate: start, plannedEndDate: end };
  if (end && !start) return { plannedStartDate: end, plannedEndDate: end };
  if (start && !end) return { plannedStartDate: start, plannedEndDate: start };
  return null;
}

export function resolveGanttSectionForPdf(
  sectionKey: string,
  sectionLabel: string,
  items: PortfolioGanttRow[],
  settings: CodirPageSettings,
): PortfolioGanttSection | null {
  const filtered = filterPortfolioGanttForPresentation(items, settings);
  const groupByTag = codirPresentationGanttUsesTagGrouping(settings);

  if (sectionKey === 'gantt:all') {
    return { key: 'gantt:all', label: sectionLabel, rows: filtered };
  }

  const sections = groupByTag
    ? groupPortfolioGanttByTag(filtered, {
        visibleTagIds: settings.presentationIncludedTagIds,
      })
    : groupPortfolioGanttByCategory(filtered);

  const found = sections.find((s) => s.key === sectionKey);
  if (found) return found;
  if (sectionKey.startsWith('tag:')) {
    return { key: sectionKey, label: sectionLabel, rows: [] };
  }
  return null;
}

function drawGanttChart(
  doc: CodirPdfDocument,
  section: PortfolioGanttSection,
  y: number,
  theme: PdfTheme,
) {
  const labelW = 62;
  const chartX = PDF_MARGIN + labelW;
  const chartW = PDF_SLIDE_W - PDF_MARGIN - chartX;
  const rows = section.rows.slice(0, 10);
  const tasks = rows.map(ganttRowToTask).filter((t): t is GanttTaskLike => t != null);
  const bounds = computeTimelineBounds(tasks, []);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  setText(doc, theme.fgMuted);
  doc.text('PROJET', PDF_MARGIN, y);
  doc.text('PLANNING', chartX, y);

  const headY = y + 4;
  setDraw(doc, theme.border);
  doc.setLineWidth(0.2);
  doc.line(PDF_MARGIN, headY, PDF_SLIDE_W - PDF_MARGIN, headY);

  if (!bounds) {
    drawSubtitle(doc, 'Aucune date planifiée sur cette section.', headY + 12, theme);
    return;
  }

  const nowPct = msToTimelinePercent(Date.now(), bounds);
  let rowY = headY + 8;

  rows.forEach((row) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    setText(doc, theme.fg);
    const name = doc.splitTextToSize(row.name, labelW - 4);
    doc.text(name.slice(0, 2), PDF_MARGIN, rowY + 4);
    doc.setFontSize(7);
    setText(doc, theme.fgMuted);
    doc.text(
      PROJECT_STATUS_LABEL[row.status] ?? row.status,
      PDF_MARGIN,
      rowY + 10,
    );

    setDraw(doc, theme.border);
    doc.setLineWidth(0.15);
    doc.rect(chartX, rowY, chartW, 8, 'S');

    const like = ganttRowToTask(row);
    if (like?.plannedStartDate && like.plannedEndDate) {
      const startMs = new Date(like.plannedStartDate).getTime();
      const endMs = new Date(like.plannedEndDate).getTime();
      const left = msToTimelinePercent(Math.max(startMs, bounds.min), bounds);
      const right = msToTimelinePercent(Math.min(endMs, bounds.max), bounds);
      const width = Math.max(1.5, right - left);
      setFill(doc, row.isLate ? theme.danger : theme.info);
      doc.roundedRect(
        chartX + (left / 100) * chartW,
        rowY + 1.5,
        (width / 100) * chartW,
        5,
        1,
        1,
        'F',
      );
    }

    rowY += 14;
  });

  if (nowPct >= 0 && nowPct <= 100) {
    const todayX = chartX + (nowPct / 100) * chartW;
    setDraw(doc, theme.accent);
    doc.setLineWidth(0.4);
    doc.line(todayX, headY, todayX, rowY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    setText(doc, theme.accent);
    doc.text('Auj.', todayX + 1, headY - 1);
  }

  if (section.rows.length > rows.length) {
    drawSubtitle(
      doc,
      `… et ${section.rows.length - rows.length} autre(s) projet(s)`,
      rowY + 2,
      theme,
    );
  }
}

export function renderCoverSlide(
  doc: CodirPdfDocument,
  theme: PdfTheme,
  params: {
    clientName: string;
    projectCount: number;
    kpis: CodirDeckKpis;
  },
) {
  const sessionDate = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const monthYear = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  drawEyebrow(doc, 'Comité de direction', PDF_MARGIN + 24, theme);
  drawTitle(
    doc,
    ['Revue de portefeuille', `DSI — ${monthYear}`],
    PDF_MARGIN + 38,
    theme,
    24,
  );

  const budgetPart =
    params.kpis.targetBudgetLabel && params.kpis.targetBudgetLabel !== '—'
      ? ` · ${params.kpis.targetBudgetLabel} engagés`
      : '';

  drawSubtitle(
    doc,
    `${params.clientName} · ${params.projectCount} projet${params.projectCount > 1 ? 's' : ''} dans le périmètre${budgetPart} · Séance du ${sessionDate}`,
    PDF_MARGIN + 72,
    theme,
  );

  drawKpiHero(
    doc,
    [
      {
        label: 'Avancement moyen',
        value: params.kpis.averageProgress != null ? `${params.kpis.averageProgress} %` : '—',
      },
      {
        label: 'Jalons tenus',
        value:
          params.kpis.milestonesOnTimePercent != null
            ? `${params.kpis.milestonesOnTimePercent} %`
            : '—',
        color: theme.accent,
      },
      {
        label: 'Risques critiques',
        value: String(params.kpis.criticalRisks),
        color: theme.danger,
      },
    ],
    PDF_MARGIN + 92,
    theme,
  );
}

export function renderPortfolioSlide(
  doc: CodirPdfDocument,
  theme: PdfTheme,
  params: {
    kpis: CodirDeckKpis;
    statusBreakdown: CodirStatusBreakdown;
    scoped: boolean;
    projectCount: number;
  },
) {
  drawEyebrow(doc, 'Synthèse du portefeuille', PDF_MARGIN + 18, theme);
  drawTitle(
    doc,
    [params.scoped ? 'Vue consolidée du périmètre' : 'Vue consolidée'],
    PDF_MARGIN + 32,
    theme,
    20,
  );
  drawSynthGrid(doc, params.kpis, params.scoped, params.projectCount, PDF_MARGIN + 48, theme);
  drawStatusBar(doc, params.statusBreakdown, PDF_MARGIN + 88, theme);
}

export function renderGanttSlide(
  doc: CodirPdfDocument,
  theme: PdfTheme,
  params: {
    sectionLabel: string;
    sectionIndex: number;
    sectionTotal: number;
    section: PortfolioGanttSection;
  },
) {
  const counter =
    params.sectionTotal > 1 ? ` · ${params.sectionIndex + 1}/${params.sectionTotal}` : '';
  drawEyebrow(doc, `Frise portefeuille${counter}`, PDF_MARGIN + 18, theme);
  drawTitle(doc, [params.sectionLabel], PDF_MARGIN + 32, theme, 20);

  if (params.section.rows.length === 0) {
    drawSubtitle(doc, 'Aucun projet planifié pour cette étiquette.', PDF_MARGIN + 48, theme);
    return;
  }

  drawGanttChart(doc, params.section, PDF_MARGIN + 48, theme);
}

export function renderProjectSlide(
  doc: CodirPdfDocument,
  theme: PdfTheme,
  params: {
    project: ProjectListItem;
    projectIndex: number;
    projectTotal: number;
  },
) {
  const { project } = params;
  const status = codirReportStatusPresentation(project);
  const progress = projectListProgressPercent(project);
  const budgetPct = projectBudgetConsumptionPercent(
    project.targetBudgetAmount,
    project.consumedBudgetAmount,
  );
  const categoryLabel =
    projectPortfolioCategoryLabel(project) ?? PROJECT_TYPE_LABEL[project.type] ?? project.type;
  const deadlineOnTrack = !project.signals.isLate && project.computedHealth !== 'RED';

  drawEyebrow(
    doc,
    `Reporting projet · ${params.projectIndex + 1}/${params.projectTotal}`,
    PDF_MARGIN + 16,
    theme,
  );
  drawTitle(doc, [project.name], PDF_MARGIN + 28, theme, 18);
  drawSubtitle(
    doc,
    `${categoryLabel} · ${project.code ?? ''} · ${status.label} · ${status.healthLabel}`,
    PDF_MARGIN + 38,
    theme,
  );

  const sidebarW = 92;
  const mainX = PDF_MARGIN + sidebarW + 8;
  const cardY = PDF_MARGIN + 46;

  setFill(doc, theme.panel);
  setDraw(doc, theme.border);
  doc.setLineWidth(0.2);
  doc.roundedRect(PDF_MARGIN, cardY, sidebarW, 118, 3, 3, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  setText(doc, theme.fgMuted);
  doc.text('Responsable', PDF_MARGIN + 6, cardY + 10);
  setText(doc, theme.fg);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(project.ownerDisplayName?.trim() || 'Non renseigné', PDF_MARGIN + 6, cardY + 18, {
    maxWidth: sidebarW - 12,
  });

  const miniKpis = [
    {
      label: 'Avancement',
      value: `${progress} %`,
      sub: project.openTasksCount > 0 ? `${project.openTasksCount} tâche(s) ouverte(s)` : undefined,
    },
    {
      label: 'Budget',
      value: budgetPct != null ? `${Math.round(budgetPct)} %` : '—',
      sub:
        project.targetBudgetAmount != null
          ? `${formatProjectBudget(project.consumedBudgetAmount) ?? '—'} / ${formatProjectBudget(project.targetBudgetAmount)}`
          : undefined,
    },
    {
      label: 'Risques',
      value: String(project.openRisksCount),
      sub: project.computedHealth === 'RED' ? '1+ critique' : '0 critique',
    },
    {
      label: 'Échéance',
      value: formatProjectDateLong(project.targetEndDate).split(' ').slice(0, 2).join(' '),
      sub: deadlineOnTrack ? 'Dans les temps' : 'À surveiller',
    },
  ];

  miniKpis.forEach((kpi, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = PDF_MARGIN + 6 + col * 42;
    const y = cardY + 28 + row * 24;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    setText(doc, theme.fgMuted);
    doc.text(kpi.label.toUpperCase(), x, y);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    setText(doc, theme.fg);
    doc.text(kpi.value, x, y + 7);
    if (kpi.sub) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      setText(doc, theme.fgMuted);
      doc.text(kpi.sub, x, y + 12, { maxWidth: 38 });
    }
  });

  setFill(doc, theme.panel);
  doc.roundedRect(mainX, cardY, PDF_SLIDE_W - mainX - PDF_MARGIN, 118, 3, 3, 'F');
  setDraw(doc, theme.border);
  doc.roundedRect(mainX, cardY, PDF_SLIDE_W - mainX - PDF_MARGIN, 118, 3, 3, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  setText(doc, theme.fg);
  doc.text('Feuille de route & pilotage', mainX + 6, cardY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  setText(doc, theme.fgMuted);
  const tagLabels =
    project.tags.length > 0
      ? project.tags.map((t) => t.name).join(' · ')
      : 'Aucune étiquette';
  doc.text(`Étiquettes : ${tagLabels}`, mainX + 6, cardY + 22, {
    maxWidth: PDF_SLIDE_W - mainX - PDF_MARGIN - 12,
  });

  const warnings =
    project.warnings.length > 0
      ? project.warnings.slice(0, 3).map((w) => `• ${w}`).join('\n')
      : '• Aucun signal prioritaire';
  doc.text('Signaux :', mainX + 6, cardY + 36);
  const wrappedWarnings = doc.splitTextToSize(
    warnings,
    PDF_SLIDE_W - mainX - PDF_MARGIN - 12,
  );
  doc.text(wrappedWarnings.slice(0, 6), mainX + 6, cardY + 44);
}
