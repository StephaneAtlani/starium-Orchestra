import { Type } from 'class-transformer';
import {
  Allow,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

export class UpdateProjectMicrosoftLinkDto {
  @IsBoolean()
  isEnabled!: boolean;

  @ValidateIf((o: UpdateProjectMicrosoftLinkDto) => o.isEnabled === true)
  @IsString()
  @IsNotEmpty()
  teamId!: string;

  @ValidateIf((o: UpdateProjectMicrosoftLinkDto) => o.isEnabled === true)
  @IsString()
  @IsNotEmpty()
  channelId!: string;

  @ValidateIf((o: UpdateProjectMicrosoftLinkDto) => o.isEnabled === true)
  @IsString()
  @IsNotEmpty()
  plannerPlanId!: string;

  // Valeurs booleennes : laissées facultatives pour éviter la purge accidentelle
  // si le frontend ne fournit pas tout le payload.
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  syncTasksEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  syncDocumentsEnabled?: boolean;

  /** `Allow` explicite : whitelist + forbidNonWhitelisted (certains setups Nest/class-validator). */
  @Allow()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  useMicrosoftPlannerBuckets?: boolean;

  // Dénormalisation : ne doit jamais déclencher de validation Graph bloquante.
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  teamName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  channelName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  plannerPlanTitle?: string;

  // Préparation sync documents (RFC-007 -> RFC-009).
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  filesDriveId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  filesFolderId?: string;
}

