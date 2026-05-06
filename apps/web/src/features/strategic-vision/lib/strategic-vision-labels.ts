'use client';

import type {
  StrategicObjectiveStatus,
  StrategicVisionAlertSeverity,
  StrategicVisionAlertType,
} from '../types/strategic-vision.types';

const OBJECTIVE_STATUS_LABELS: Record<StrategicObjectiveStatus, string> = {
  ON_TRACK: 'Sur la trajectoire',
  AT_RISK: 'À risque',
  OFF_TRACK: 'Hors trajectoire',
  COMPLETED: 'Terminé',
  ARCHIVED: 'Archivé',
};

const ALERT_TYPE_LABELS: Record<StrategicVisionAlertType, string> = {
  OBJECTIVE_OVERDUE: 'Objectif en retard',
  OBJECTIVE_OFF_TRACK: 'Objectif hors trajectoire',
  PROJECT_UNALIGNED: 'Projet non aligné',
};

const ALERT_SEVERITY_LABELS: Record<StrategicVisionAlertSeverity, string> = {
  CRITICAL: 'Critique',
  HIGH: 'Élevée',
  MEDIUM: 'Moyenne',
  LOW: 'Faible',
};

export function getObjectiveStatusLabel(status: StrategicObjectiveStatus): string {
  return OBJECTIVE_STATUS_LABELS[status];
}

export function getAlertTypeLabel(type: StrategicVisionAlertType): string {
  return ALERT_TYPE_LABELS[type];
}

export function getAlertSeverityLabel(severity: StrategicVisionAlertSeverity): string {
  return ALERT_SEVERITY_LABELS[severity];
}

export const STRATEGIC_OBJECTIVE_STATUS_OPTIONS: Array<{
  value: StrategicObjectiveStatus;
  label: string;
}> = [
  { value: 'ON_TRACK', label: OBJECTIVE_STATUS_LABELS.ON_TRACK },
  { value: 'AT_RISK', label: OBJECTIVE_STATUS_LABELS.AT_RISK },
  { value: 'OFF_TRACK', label: OBJECTIVE_STATUS_LABELS.OFF_TRACK },
  { value: 'COMPLETED', label: OBJECTIVE_STATUS_LABELS.COMPLETED },
  { value: 'ARCHIVED', label: OBJECTIVE_STATUS_LABELS.ARCHIVED },
];
