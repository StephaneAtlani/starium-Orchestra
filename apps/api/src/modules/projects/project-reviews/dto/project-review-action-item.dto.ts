import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProjectTaskStatus } from '@prisma/client';
import { ProjectReviewActionItemContributorInputDto } from './project-review-action-item-contributor.dto';

export class ProjectReviewActionItemInputDto {
  @IsString()
  @MaxLength(500)
  title!: string;

  @IsEnum(ProjectTaskStatus)
  status!: ProjectTaskStatus;

  @IsOptional()
  @IsDateString()
  dueDate?: string | null;

  @IsOptional()
  @IsString()
  linkedTaskId?: string | null;

  @IsOptional()
  @IsString()
  responsibleUserId?: string | null;

  @IsOptional()
  @IsString()
  agendaItemId?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectReviewActionItemContributorInputDto)
  contributors?: ProjectReviewActionItemContributorInputDto[];
}
