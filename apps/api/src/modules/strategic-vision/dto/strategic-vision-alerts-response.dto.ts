export type StrategicVisionAlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type StrategicVisionAlertType =
  | 'OBJECTIVE_OVERDUE'
  | 'OBJECTIVE_OFF_TRACK'
  | 'PROJECT_UNALIGNED';

export type StrategicVisionAlertTargetType = 'OBJECTIVE' | 'PROJECT';

export type StrategicVisionAlertItemDto = {
  id: string;
  type: StrategicVisionAlertType;
  severity: StrategicVisionAlertSeverity;
  targetType: StrategicVisionAlertTargetType;
  targetLabel: string;
  message: string;
  createdAt: string;
};

export type StrategicVisionAlertsResponseDto = {
  items: StrategicVisionAlertItemDto[];
  total: number;
};
