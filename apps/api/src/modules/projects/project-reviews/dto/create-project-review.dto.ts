import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ProjectReviewType } from '@prisma/client';
import { ProjectReviewActionItemInputDto } from './project-review-action-item.dto';
import { ProjectReviewDecisionInputDto } from './project-review-decision.dto';
import { ProjectReviewParticipantInputDto } from './project-review-participant.dto';

export class CreateProjectReviewDto {
  @IsDateString()
  reviewDate!: string;

  @IsEnum(ProjectReviewType)
  reviewType!: ProjectReviewType;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  executiveSummary?: string | null;

  @IsOptional()
  contentPayload?: Record<string, unknown> | null;

  @IsOptional()
  @IsString()
  facilitatorUserId?: string | null;

  @IsOptional()
  @IsDateString()
  nextReviewDate?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectReviewParticipantInputDto)
  participants?: ProjectReviewParticipantInputDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectReviewDecisionInputDto)
  decisions?: ProjectReviewDecisionInputDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectReviewActionItemInputDto)
  actionItems?: ProjectReviewActionItemInputDto[];
}
