import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ProjectDocumentCategory } from '@prisma/client';

export class UploadProjectDocumentFieldsDto {
  @IsOptional()
  @IsString()
  @MaxLength(512)
  name?: string;

  @IsOptional()
  @IsEnum(ProjectDocumentCategory)
  category?: ProjectDocumentCategory;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;
}
