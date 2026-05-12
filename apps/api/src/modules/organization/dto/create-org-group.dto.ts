import { IsEnum, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { OrgGroupType } from '@prisma/client';

export class CreateOrgGroupDto {
  @IsString()
  @MaxLength(500)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  code?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string | null;

  @IsEnum(OrgGroupType)
  type!: OrgGroupType;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown> | null;
}
