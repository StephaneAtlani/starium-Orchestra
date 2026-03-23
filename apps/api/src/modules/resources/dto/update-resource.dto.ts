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
import { ResourceAffiliation } from '@prisma/client';

/** Pas de `type` : immuable après création (RFC-RES-001). Une tentative d’envoyer `type` est rejetée par le ValidationPipe (forbidNonWhitelisted). */
export class UpdateResourceDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  code?: string | null;

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

  @IsOptional()
  @IsEnum(ResourceAffiliation)
  affiliation?: ResourceAffiliation | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  companyName?: string | null;

  @IsOptional()
  @Type(() => Number)
  dailyRate?: number | null;

  @IsOptional()
  @IsObject()
  /** Autorisé pour MATERIAL / LICENSE uniquement (contrôle métier dans le service). */
  metadata?: Record<string, unknown> | null;
}
