import {
  MeetingMode,
  MeetingScope,
  MeetingSectionType,
  MeetingStatus,
  MeetingTemplateKind,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

/**
 * RFC-MEET-001 — DTO du module Réunions.
 *
 * Règle d'isolation : **aucun DTO ne porte `clientId`**. Le client actif est
 * dérivé du contexte authentifié (`@ActiveClientId()`), jamais du corps de la
 * requête (RFC-MEET-001 §4.11-1).
 */

// ---------------------------------------------------------------------------
// Réunions
// ---------------------------------------------------------------------------

export class CreateMeetingDto {
  @IsString()
  templateId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  objective?: string | null;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  scheduledAt?: Date | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(1440)
  durationMinutes?: number | null;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  periodStart?: Date | null;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  periodEnd?: Date | null;

  @IsOptional()
  @IsEnum(MeetingMode)
  meetingMode?: MeetingMode | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  location?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  meetingUrl?: string | null;

  @IsOptional()
  @IsString()
  facilitatorUserId?: string | null;

  @IsOptional()
  @IsString()
  governanceCycleInstanceId?: string | null;

  /** Ex. `{ "requiredRatio": 0.6 }` — voir `meeting-quorum.util.ts`. */
  @IsOptional()
  @IsObject()
  quorumRule?: Record<string, unknown> | null;

  /** Projets inscrits dès la création (facultatif). */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  projectIds?: string[];
}

export class UpdateMeetingDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  objective?: string | null;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  scheduledAt?: Date | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(1440)
  durationMinutes?: number | null;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  periodStart?: Date | null;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  periodEnd?: Date | null;

  @IsOptional()
  @IsEnum(MeetingMode)
  meetingMode?: MeetingMode | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  location?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  meetingUrl?: string | null;

  @IsOptional()
  @IsString()
  facilitatorUserId?: string | null;

  @IsOptional()
  @IsString()
  governanceCycleInstanceId?: string | null;

  @IsOptional()
  @IsObject()
  quorumRule?: Record<string, unknown> | null;
}

export class ScheduleMeetingDto {
  /** Requise si la réunion n'a pas déjà une date (§4.4). */
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  scheduledAt?: Date;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(1440)
  durationMinutes?: number;
}

export class CancelMeetingDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  reason!: string;
}

export class ListMeetingsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @IsOptional()
  @IsEnum(MeetingStatus)
  status?: MeetingStatus;

  @IsOptional()
  @IsEnum(MeetingTemplateKind)
  templateKind?: MeetingTemplateKind;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;
}

// ---------------------------------------------------------------------------
// Périmètre projets
// ---------------------------------------------------------------------------

export class AddMeetingProjectsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @IsString({ each: true })
  projectIds!: string[];
}

export class ReorderMeetingProjectsDto {
  /** Identifiants `MeetingProject` dans l'ordre de passage souhaité. */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @IsString({ each: true })
  meetingProjectIds!: string[];
}

export class UpdateMeetingProjectDto {
  @IsOptional()
  @IsString()
  rapporteurUserId?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(480)
  allocatedMinutes?: number | null;
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

export class ReorderMeetingSectionsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(64)
  @IsString({ each: true })
  sectionInstanceIds!: string[];
}

export class UpdateMeetingSectionDto {
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  titleOverride?: string | null;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown> | null;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  notes?: string | null;
}

// ---------------------------------------------------------------------------
// Modèles de réunion
// ---------------------------------------------------------------------------

export class MeetingTemplateSectionInputDto {
  @IsEnum(MeetingSectionType)
  sectionType!: MeetingSectionType;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  titleOverride?: string | null;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown> | null;
}

export class CreateMeetingTemplateDto {
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  code!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @IsEnum(MeetingTemplateKind)
  kind!: MeetingTemplateKind;

  /** Immuable après création — voir RFC-MEET-001 §8-12. */
  @IsEnum(MeetingScope)
  scope!: MeetingScope;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(1440)
  defaultDurationMinutes?: number | null;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(64)
  @ValidateNested({ each: true })
  @Type(() => MeetingTemplateSectionInputDto)
  sections!: MeetingTemplateSectionInputDto[];
}

export class UpdateMeetingTemplateDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(1440)
  defaultDurationMinutes?: number | null;

  /** Masquage d'un modèle (y compris système) sans suppression. */
  @IsOptional()
  @IsBoolean()
  isHidden?: boolean;
}

export class DuplicateMeetingTemplateDto {
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  code!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;
}

export class PutMeetingTemplateSectionsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(64)
  @ValidateNested({ each: true })
  @Type(() => MeetingTemplateSectionInputDto)
  sections!: MeetingTemplateSectionInputDto[];
}

export class ListMeetingTemplatesQueryDto {
  @IsOptional()
  @IsEnum(MeetingScope)
  scope?: MeetingScope;

  @IsOptional()
  @IsEnum(MeetingTemplateKind)
  kind?: MeetingTemplateKind;

  /** Inclure les modèles masqués (défaut : non). */
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeHidden?: boolean;
}
