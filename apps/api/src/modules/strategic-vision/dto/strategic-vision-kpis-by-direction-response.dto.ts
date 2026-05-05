import { StrategicVisionKpisResponseDto } from './strategic-vision-kpis-response.dto';

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
