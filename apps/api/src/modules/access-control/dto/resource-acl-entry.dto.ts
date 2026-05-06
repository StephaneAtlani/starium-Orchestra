import { ResourceAclPermission, ResourceAclSubjectType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  RESOURCE_ACL_CUID_REGEX,
  RESOURCE_ACL_RESOURCE_ID_MAX_LENGTH,
} from '../resource-acl.constants';

/**
 * Payloads corps uniquement (`entries` ou champs entrée).
 * **`clientId` interdit** : toujours issu du contexte client actif (header / garde).
 */
export class ResourceAclEntryInputDto {
  @IsEnum(ResourceAclSubjectType)
  subjectType!: ResourceAclSubjectType;

  @IsString()
  @MinLength(25)
  @MaxLength(RESOURCE_ACL_RESOURCE_ID_MAX_LENGTH)
  @Matches(RESOURCE_ACL_CUID_REGEX, {
    message: 'subjectId doit être un identifiant CUID valide',
  })
  subjectId!: string;

  @IsEnum(ResourceAclPermission)
  permission!: ResourceAclPermission;
}

/** PUT replace — tableau vide interdit en V1 (BadRequest validation pipe). `clientId` interdit dans le corps. */
export class ReplaceResourceAclEntriesDto {
  @IsArray()
  @ArrayMinSize(1, {
    message:
      'Le tableau entries ne peut pas être vide : utilisez une route de reset prévue hors RFC-ACL-005 pour lever la restriction.',
  })
  @ValidateNested({ each: true })
  @Type(() => ResourceAclEntryInputDto)
  entries!: ResourceAclEntryInputDto[];
}

/** POST unitaire — même règle : pas de `clientId` dans le corps. */
export class CreateResourceAclEntryDto extends ResourceAclEntryInputDto {}
