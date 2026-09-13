import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import type {
  ProjectReviewMeetingMode,
  ProjectReviewSeriesFrequency,
  ProjectReviewSeriesOccurrenceTitleFormat,
  ProjectReviewType,
} from '@prisma/client';
import { PROJECT_REVIEW_TYPE_VALUES } from './project-review-type-values';
import { PROJECT_REVIEW_MEETING_MODE_VALUES } from '../project-review-meeting.validation';

export const PROJECT_REVIEW_SERIES_FREQUENCY_VALUES = [
  'WEEKLY',
  'BIWEEKLY',
  'MONTHLY',
  'QUARTERLY',
] as const satisfies readonly ProjectReviewSeriesFrequency[];

export const PROJECT_REVIEW_SERIES_OCCURRENCE_TITLE_FORMAT_VALUES = [
  'WEEK',
  'SHORT_DATE',
  'LONG_DATE',
  'CUSTOM',
] as const satisfies readonly ProjectReviewSeriesOccurrenceTitleFormat[];

export class CreateProjectReviewSeriesDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  title!: string;

  @IsIn([...PROJECT_REVIEW_TYPE_VALUES])
  reviewType!: ProjectReviewType;

  @IsIn([...PROJECT_REVIEW_SERIES_FREQUENCY_VALUES])
  frequency!: ProjectReviewSeriesFrequency;

  @IsInt()
  @Min(15)
  @Max(480)
  durationMinutes!: number;

  @IsOptional()
  @IsIn([...PROJECT_REVIEW_MEETING_MODE_VALUES])
  meetingMode?: ProjectReviewMeetingMode | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  location?: string | null;

  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  meetingUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  defaultObjective?: string | null;

  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  permanentParticipantUserIds!: string[];

  @IsDateString()
  anchorDate!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  horizonCount?: number;

  @IsOptional()
  @IsIn([...PROJECT_REVIEW_SERIES_OCCURRENCE_TITLE_FORMAT_VALUES])
  occurrenceTitleFormat?: ProjectReviewSeriesOccurrenceTitleFormat;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  occurrenceTitleCustom?: string | null;
}

export class UpdateProjectReviewSeriesDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  title?: string;

  @IsOptional()
  @IsIn([...PROJECT_REVIEW_TYPE_VALUES])
  reviewType?: ProjectReviewType;

  @IsOptional()
  @IsIn([...PROJECT_REVIEW_SERIES_FREQUENCY_VALUES])
  frequency?: ProjectReviewSeriesFrequency;

  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(480)
  durationMinutes?: number;

  @IsOptional()
  @IsIn([...PROJECT_REVIEW_MEETING_MODE_VALUES])
  meetingMode?: ProjectReviewMeetingMode | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  location?: string | null;

  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  meetingUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  defaultObjective?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  permanentParticipantUserIds?: string[];

  @IsOptional()
  @IsDateString()
  anchorDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  horizonCount?: number;

  @IsOptional()
  @IsIn([...PROJECT_REVIEW_SERIES_OCCURRENCE_TITLE_FORMAT_VALUES])
  occurrenceTitleFormat?: ProjectReviewSeriesOccurrenceTitleFormat;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  occurrenceTitleCustom?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class GenerateProjectReviewSeriesDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  count?: number;
}
