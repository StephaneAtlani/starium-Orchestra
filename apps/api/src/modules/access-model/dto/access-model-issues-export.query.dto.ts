import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import type { AccessModelIssueCategory } from '../access-model.types';

const CATEGORIES = [
  'missing_owner',
  'missing_human',
  'atypical_acl',
  'policy_review',
] as const;

export class AccessModelIssuesExportQueryDto {
  @IsEnum(CATEGORIES)
  category!: AccessModelIssueCategory;

  @IsOptional()
  @IsString()
  module?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn([',', ';'])
  delimiter?: ',' | ';';

  @IsOptional()
  @IsIn(['csv'])
  format?: 'csv';
}
