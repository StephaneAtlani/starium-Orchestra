import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ProjectReviewAttachmentType } from '@prisma/client';

export class UpdateProjectReviewAttachmentDto {
  @IsOptional()
  @IsEnum(ProjectReviewAttachmentType)
  attachmentType?: ProjectReviewAttachmentType;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  description?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  url?: string | null;

  @IsOptional()
  @IsString()
  documentId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  fileName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  mimeType?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  sizeBytes?: number | null;

  @IsOptional()
  @IsString()
  agendaItemId?: string | null;

  @IsOptional()
  @IsString()
  decisionId?: string | null;

  @IsOptional()
  @IsString()
  actionItemId?: string | null;
}
