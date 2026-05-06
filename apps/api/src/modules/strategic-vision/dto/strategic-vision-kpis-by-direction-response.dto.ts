export class StrategicDirectionKpiRowDto {
  directionId!: string | null;
  directionCode!: string;
  directionName!: string;
  projectAlignmentRate!: number;
  unalignedProjectsCount!: number;
  objectivesAtRiskCount!: number;
  objectivesOffTrackCount!: number;
  overdueObjectivesCount!: number;
  alignedActiveProjectsCount!: number;
  totalActiveProjectsRelevantCount!: number;
}

export class StrategicVisionKpisByDirectionResponseDto {
  rows!: StrategicDirectionKpiRowDto[];
  global!: {
    projectAlignmentRate: number;
    unalignedProjectsCount: number;
    objectivesAtRiskCount: number;
    objectivesOffTrackCount: number;
    overdueObjectivesCount: number;
    generatedAt: string;
  };
  generatedAt!: string;
}
