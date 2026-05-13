import { IsEnum } from 'class-validator';
import { ResourceAccessPolicyMode } from '@prisma/client';

export class UpdateResourceAccessPolicyDto {
  @IsEnum(ResourceAccessPolicyMode)
  mode!: ResourceAccessPolicyMode;
}
