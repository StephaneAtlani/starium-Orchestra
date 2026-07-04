import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsDateString, IsIn, IsOptional, IsString, IsUrl, MaxLength, ValidateNested } from 'class-validator';
import type { ProjectReviewMeetingMode, ProjectReviewType } from '@prisma/client';
import { ProjectReviewActionItemInputDto } from './project-review-action-item.dto';
import { ProjectReviewDecisionInputDto } from './project-review-decision.dto';
import { ProjectReviewParticipantInputDto } from './project-review-participant.dto';
import { PROJECT_REVIEW_TYPE_VALUES } from './project-review-type-values';
import {
  PROJECT_REVIEW_CREATION_MODE_VALUES,
  PROJECT_REVIEW_MEETING_MODE_VALUES,
} from '../project-review-meeting.validation';

export class CreateProjectReviewDto {
  @IsDateString()
  reviewDate!: string;

  @IsIn([...PROJECT_REVIEW_TYPE_VALUES])
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
  @IsIn([...PROJECT_REVIEW_MEETING_MODE_VALUES])
  meetingMode?: ProjectReviewMeetingMode | null;

  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  meetingUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  location?: string | null;

  @IsOptional()
  @IsIn([...PROJECT_REVIEW_CREATION_MODE_VALUES])
  creationMode?: 'PLANNED' | 'IMMEDIATE';

  @IsOptional()
  @IsBoolean()
  autoInviteOnCreate?: boolean;

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
