import { IsEnum } from 'class-validator';
import { ProjectRiskStatus } from '@prisma/client';

export class UpdateProjectRiskStatusDto {
  @IsEnum(ProjectRiskStatus)
  status!: ProjectRiskStatus;
}
