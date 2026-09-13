import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import {
  ProjectDocumentCategory,
  ProjectDocumentStatus,
  ProjectDocumentStorageType,
} from '@prisma/client';
import { PROJECT_DOCUMENT_LIST_TAKE } from '../project-documents.constants';

export class ListProjectDocumentsQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(Object.values(ProjectDocumentCategory))
  category?: ProjectDocumentCategory;

  /** Si absent : exclut DELETED. */
  @IsOptional()
  @IsIn(Object.values(ProjectDocumentStatus))
  status?: ProjectDocumentStatus;

  @IsOptional()
  @IsIn(Object.values(ProjectDocumentStorageType))
  storageType?: ProjectDocumentStorageType;

  /** Extension sans point, ex. `pdf`. */
  @IsOptional()
  @IsString()
  extension?: string;

  @IsOptional()
  @IsIn(['updatedAt:desc', 'name:asc'])
  sort?: 'updatedAt:desc' | 'name:asc';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PROJECT_DOCUMENT_LIST_TAKE)
  take?: number;
}
