import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ProjectReviewAgendaItemType } from '@prisma/client';

export class UpdateProjectReviewAgendaItemDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  description?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  plannedDurationMinutes?: number | null;

  @IsOptional()
  @IsString()
  ownerUserId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  notes?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  decisionSummary?: string | null;

  @IsOptional()
  @IsEnum(ProjectReviewAgendaItemType)
  itemType?: ProjectReviewAgendaItemType;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  objective?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  expectedDecision?: string | null;
}
