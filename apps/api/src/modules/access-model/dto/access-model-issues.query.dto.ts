import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import type { AccessModelIssueCategory } from '../access-model.types';
import { ACCESS_MODEL_MAX_LIMIT } from '../access-model.constants';

const CATEGORIES = [
  'missing_owner',
  'missing_human',
  'atypical_acl',
  'policy_review',
] as const;

export class AccessModelIssuesQueryDto {
  @IsEnum(CATEGORIES)
  category!: AccessModelIssueCategory;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(ACCESS_MODEL_MAX_LIMIT)
  limit?: number;

  @IsOptional()
  @IsString()
  module?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
