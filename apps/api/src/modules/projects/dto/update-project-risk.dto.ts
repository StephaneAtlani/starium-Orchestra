import { IsDateString, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import {
  ProjectRiskImpact,
  ProjectRiskProbability,
  ProjectRiskStatus,
} from '@prisma/client';

export class UpdateProjectRiskDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ProjectRiskProbability)
  probability?: ProjectRiskProbability;

  @IsOptional()
  @IsEnum(ProjectRiskImpact)
  impact?: ProjectRiskImpact;

  @IsOptional()
  @IsString()
  actionPlan?: string;

  @IsOptional()
  @IsString()
  ownerUserId?: string;

  @IsOptional()
  @IsEnum(ProjectRiskStatus)
  status?: ProjectRiskStatus;

  @IsOptional()
  @IsDateString()
  reviewDate?: string;
}
