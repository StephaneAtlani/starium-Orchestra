import { IsEnum } from 'class-validator';
import { OrgOwnershipPolicyMode } from '@prisma/client';

export class UpdateOrganizationOwnershipPolicyDto {
  @IsEnum(OrgOwnershipPolicyMode)
  mode!: OrgOwnershipPolicyMode;
}
