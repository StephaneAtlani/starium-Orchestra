import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ResourceAffiliation, ResourceType } from '@prisma/client';

export class CreateResourceDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  code?: string | null;

  @IsEnum(ResourceType)
  type!: ResourceType;

  /** Réservé au type HUMAN. */
  @IsOptional()
  @IsString()
  firstName?: string | null;

  @IsOptional()
  @IsEmail()
  email?: string | null;

  @IsOptional()
  @IsString()
  roleId?: string | null;

  /** Réservé au type HUMAN — défaut INTERNAL si absent. */
  @IsOptional()
  @IsEnum(ResourceAffiliation)
  affiliation?: ResourceAffiliation;

  /** Réservé au type HUMAN, typiquement si affiliation EXTERNE. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  companyName?: string | null;

  @IsOptional()
  @Type(() => Number)
  dailyRate?: number | null;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown> | null;
}
