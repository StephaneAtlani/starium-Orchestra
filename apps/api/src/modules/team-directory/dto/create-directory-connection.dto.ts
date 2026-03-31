import { DirectoryProviderType } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateDirectoryConnectionDto {
  @IsString()
  @MaxLength(120)
  name!: string;

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
  metadata?: Record<string, unknown>;
}
