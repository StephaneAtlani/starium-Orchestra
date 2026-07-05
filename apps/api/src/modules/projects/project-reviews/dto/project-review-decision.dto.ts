import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  ProjectReviewDecisionStatus,
  ProjectReviewDecisionType,
} from '@prisma/client';

export class ProjectReviewDecisionInputDto {
  @IsString()
  @MaxLength(500)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  description?: string | null;

  @IsOptional()
  @IsString()
  agendaItemId?: string | null;

  @IsOptional()
  @IsEnum(ProjectReviewDecisionType)
  decisionType?: ProjectReviewDecisionType;

  @IsOptional()
  @IsEnum(ProjectReviewDecisionStatus)
  status?: ProjectReviewDecisionStatus;

  @IsOptional()
  @IsString()
  decidedByUserId?: string | null;

  @IsOptional()
  @IsDateString()
  decidedAt?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  impact?: string | null;
}
