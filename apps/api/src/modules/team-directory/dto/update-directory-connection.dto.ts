import {
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { DirectoryProviderType } from '@prisma/client';
import { CreateDirectoryConnectionDto } from './create-directory-connection.dto';

@ValidatorConstraint({ name: 'metadataWithoutAutoProvision', async: false })
class MetadataWithoutAutoProvisionConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (value === undefined || value === null) return true;
    if (typeof value !== 'object' || Array.isArray(value)) return false;
    return !('autoProvisionUsers' in (value as Record<string, unknown>));
  }

  defaultMessage(): string {
    return 'Utilisez le champ autoProvisionUsers, pas metadata.autoProvisionUsers';
  }
}

export class UpdateDirectoryConnectionDto implements Partial<CreateDirectoryConnectionDto> {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsEnum(DirectoryProviderType)
  providerType?: DirectoryProviderType;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isSyncEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  lockSyncedCollaborators?: boolean;

  @IsOptional()
  @IsObject()
  usersScope?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  @Validate(MetadataWithoutAutoProvisionConstraint)
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  autoProvisionUsers?: boolean;
}
