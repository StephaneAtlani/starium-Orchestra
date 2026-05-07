import { Transform } from 'class-transformer';
import { IsIn, IsString, Matches } from 'class-validator';

const CUID_REGEX = /^c[a-z0-9]{24}$/;

export const EFFECTIVE_RIGHTS_OPERATIONS = ['read', 'write', 'admin'] as const;
export const EFFECTIVE_RIGHTS_RESOURCE_TYPES = [
  'PROJECT',
  'BUDGET',
  'CONTRACT',
  'SUPPLIER',
  'STRATEGIC_OBJECTIVE',
] as const;

export class EffectiveRightsQueryDto {
  @IsString()
  @Matches(CUID_REGEX, { message: 'userId doit être un CUID valide' })
  userId!: string;

  @Transform(({ value }) => String(value ?? '').trim().toUpperCase())
  @IsIn(EFFECTIVE_RIGHTS_RESOURCE_TYPES, {
    message: `resourceType non supporté (attendu: ${EFFECTIVE_RIGHTS_RESOURCE_TYPES.join(', ')})`,
  })
  resourceType!: (typeof EFFECTIVE_RIGHTS_RESOURCE_TYPES)[number];

  @IsString()
  @Matches(CUID_REGEX, { message: 'resourceId doit être un CUID valide' })
  resourceId!: string;

  @Transform(({ value }) => String(value ?? '').trim().toLowerCase())
  @IsIn(EFFECTIVE_RIGHTS_OPERATIONS, {
    message: `operation invalide (attendu: ${EFFECTIVE_RIGHTS_OPERATIONS.join(', ')})`,
  })
  operation!: (typeof EFFECTIVE_RIGHTS_OPERATIONS)[number];
}
