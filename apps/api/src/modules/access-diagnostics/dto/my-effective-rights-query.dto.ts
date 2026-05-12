import { Transform } from 'class-transformer';
import { IsIn, IsString, Matches } from 'class-validator';
import type { ResourceAccessIntent } from '../resource-access-diagnostic.registry';

const CUID_REGEX = /^c[a-z0-9]{24}$/;

export const MY_EFFECTIVE_RIGHTS_INTENTS = ['READ', 'WRITE', 'ADMIN'] as const;

export class MyEffectiveRightsQueryDto {
  @Transform(({ value }) => String(value ?? '').trim().toUpperCase())
  @IsIn(MY_EFFECTIVE_RIGHTS_INTENTS, {
    message: `intent invalide (attendu: ${MY_EFFECTIVE_RIGHTS_INTENTS.join(', ')})`,
  })
  intent!: ResourceAccessIntent;

  @Transform(({ value }) => String(value ?? '').trim().toUpperCase())
  @IsString()
  resourceType!: string;

  @IsString()
  @Matches(CUID_REGEX, { message: 'resourceId doit être un CUID valide' })
  resourceId!: string;
}
