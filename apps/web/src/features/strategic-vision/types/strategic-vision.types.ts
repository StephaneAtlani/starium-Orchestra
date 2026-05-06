export type StrategicObjectiveStatus =
  | 'ON_TRACK'
  | 'AT_RISK'
  | 'OFF_TRACK'
  | 'COMPLETED'
  | 'ARCHIVED';

export type StrategicLinkType = 'PROJECT' | 'BUDGET' | 'RISK';

export type StrategicLinkDto = {
  id: string;
  clientId: string;
  objectiveId: string;
  linkType: StrategicLinkType;
  targetId: string;
  targetLabelSnapshot: string;
  createdAt: string;
};

export type StrategicDirectionDto = {
  id: string;
  clientId: string;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type StrategicDirectionStrategyStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'ARCHIVED';

export type StrategicObjectiveDto = {
  id: string;
  clientId: string;
  axisId: string;
  title: string;
  description: string | null;
  ownerLabel: string | null;
  directionId: string | null;
  direction: Pick<StrategicDirectionDto, 'id' | 'code' | 'name' | 'isActive'> | null;
  status: StrategicObjectiveStatus;
  deadline: string | null;
  createdAt: string;
  updatedAt: string;
  links: StrategicLinkDto[];
};

export type StrategicAxisWithObjectivesDto = {
  id: string;
  clientId: string;
  visionId: string;
  name: string;
  description: string | null;
  orderIndex: number | null;
  createdAt: string;
  updatedAt: string;
  objectives: StrategicObjectiveDto[];
};

export type StrategicVisionDto = {
  id: string;
  clientId: string;
  title: string;
  statement: string;
  horizonLabel: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  axes: StrategicAxisWithObjectivesDto[];
};

export type StrategicAxisDto = {
  id: string;
  clientId: string;
  visionId: string;
  name: string;
  description: string | null;
  orderIndex: number | null;
  createdAt: string;
  updatedAt: string;
  objectives: StrategicObjectiveDto[];
};

export type StrategicVisionKpisResponseDto = {
  projectAlignmentRate: number;
  unalignedProjectsCount: number;
  objectivesAtRiskCount: number;
  objectivesOffTrackCount: number;
  overdueObjectivesCount: number;
  generatedAt: string;
};

export type StrategicDirectionKpiRowDto = {
  directionId: string | null;
  directionCode: string;
  directionName: string;
  projectAlignmentRate: number;
  unalignedProjectsCount: number;
  objectivesAtRiskCount: number;
  objectivesOffTrackCount: number;
  overdueObjectivesCount: number;
  alignedActiveProjectsCount: number;
  totalActiveProjectsRelevantCount: number;
};

export type StrategicVisionKpisByDirectionResponseDto = {
  rows: StrategicDirectionKpiRowDto[];
  global: StrategicVisionKpisResponseDto;
  generatedAt: string;
};

export type StrategicVisionAlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type StrategicVisionAlertType =
  | 'OBJECTIVE_OVERDUE'
  | 'OBJECTIVE_OFF_TRACK'
  | 'PROJECT_UNALIGNED';

export type StrategicVisionAlertTargetType = 'OBJECTIVE' | 'PROJECT';

export type StrategicVisionAlertDto = {
  id: string;
  type: StrategicVisionAlertType;
  severity: StrategicVisionAlertSeverity;
  targetType: StrategicVisionAlertTargetType;
  directionId: string | null;
  directionName: string;
  targetLabel: string;
  message: string;
  createdAt: string;
};

export type StrategicVisionAlertsResponseDto = {
  items: StrategicVisionAlertDto[];
  total: number;
};
