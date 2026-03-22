import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ProjectTaskStatus } from '@prisma/client';

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
}
