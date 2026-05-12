import { IsEnum, IsOptional, IsDateString, IsString, MaxLength } from 'class-validator';
import { OrgUnitMemberType } from '@prisma/client';

export class AddOrgUnitMemberDto {
  @IsString()
  resourceId!: string;

  @IsOptional()
  @IsEnum(OrgUnitMemberType)
  memberType?: OrgUnitMemberType;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  roleTitle?: string | null;

  @IsOptional()
  @IsDateString()
  startsAt?: string | null;

  @IsOptional()
  @IsDateString()
  endsAt?: string | null;
}
