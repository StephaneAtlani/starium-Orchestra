import { CollaboratorStatus, ExternalDirectoryType } from '@prisma/client';
import { IsEnum, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCollaboratorDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  firstName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  lastName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(190)
  email?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(190)
  username?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  jobTitle?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  department?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(190)
  managerId?: string | null;

  @IsOptional()
  @IsEnum(CollaboratorStatus)
  status?: CollaboratorStatus;

  @IsOptional()
  @IsEnum(ExternalDirectoryType)
  externalDirectoryType?: ExternalDirectoryType | null;

  @IsOptional()
  @IsObject()
  skills?: Record<string, unknown> | null;

  @IsOptional()
  @IsString()
  internalNotes?: string | null;

  @IsOptional()
  @IsObject()
  internalTags?: Record<string, unknown> | null;

  @IsOptional()
  @IsObject()
  assignments?: Record<string, unknown> | null;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown> | null;
}
