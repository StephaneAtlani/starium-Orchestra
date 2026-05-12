import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OrgGroupMemberType } from '@prisma/client';

export class AddOrgGroupMemberDto {
  @IsString()
  resourceId!: string;

  @IsOptional()
  @IsEnum(OrgGroupMemberType)
  memberType?: OrgGroupMemberType;
}
