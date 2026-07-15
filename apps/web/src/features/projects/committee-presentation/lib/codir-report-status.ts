import type { ProjectListItem } from '../../types/project.types';
import { PROJECT_STATUS_LABEL } from '../../constants/project-enum-labels';

export type CodirReportAccentTone = 'ok' | 'warn' | 'danger' | 'info' | 'muted';

export type CodirReportStatusPresentation = {
  label: string;
  accentTone: CodirReportAccentTone;
  barTone: CodirReportAccentTone;
  emphasisClass: string;
  healthLabel: string;
};

export function codirReportStatusPresentation(
  project: ProjectListItem,
): CodirReportStatusPresentation {
  const statusLabel = PROJECT_STATUS_LABEL[project.status] ?? project.status;

  if (project.signals.isLate) {
    return {
      label: 'En retard',
      accentTone: 'danger',
      barTone: 'danger',
      emphasisClass: 'text-[color:var(--state-danger)]',
      healthLabel: 'Santé critique',
    };
  }

  if (project.status === 'COMPLETED') {
    return {
      label: statusLabel,
      accentTone: 'ok',
      barTone: 'ok',
      emphasisClass: 'text-[color:var(--state-success)]',
      healthLabel: 'Terminé',
    };
  }

  if (project.computedHealth === 'GREEN' && project.status === 'IN_PROGRESS') {
    return {
      label: statusLabel,
      accentTone: 'ok',
      barTone: 'ok',
      emphasisClass: 'text-[color:var(--state-success)]',
      healthLabel: 'Santé excellente',
    };
  }

  if (project.computedHealth === 'ORANGE') {
    return {
      label: statusLabel,
      accentTone: 'warn',
      barTone: 'warn',
      emphasisClass: 'text-[color:var(--state-warning)]',
      healthLabel: 'À surveiller',
    };
  }

  if (project.computedHealth === 'RED') {
    return {
      label: statusLabel,
      accentTone: 'danger',
      barTone: 'danger',
      emphasisClass: 'text-[color:var(--state-danger)]',
      healthLabel: 'Santé critique',
    };
  }

  if (project.status === 'DRAFT' || project.status === 'PLANNED') {
    return {
      label: statusLabel,
      accentTone: 'info',
      barTone: 'info',
      emphasisClass: 'text-[color:var(--state-info)]',
      healthLabel: 'Santé bonne',
    };
  }

  return {
    label: statusLabel,
    accentTone: 'warn',
    barTone: 'warn',
    emphasisClass: 'text-[color:var(--state-warning)]',
    healthLabel: 'Santé bonne',
  };
}
