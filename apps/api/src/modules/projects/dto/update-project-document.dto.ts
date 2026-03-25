import { IsArray, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { ProjectDocumentCategory } from '@prisma/client';

export class UpdateProjectDocumentDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsIn([
    ProjectDocumentCategory.GENERAL,
    ProjectDocumentCategory.CONTRACT,
    ProjectDocumentCategory.SPECIFICATION,
    ProjectDocumentCategory.DELIVERABLE,
    ProjectDocumentCategory.REPORT,
    ProjectDocumentCategory.FINANCIAL,
    ProjectDocumentCategory.COMPLIANCE,
    ProjectDocumentCategory.OTHER,
  ])
  category?: ProjectDocumentCategory;
}

