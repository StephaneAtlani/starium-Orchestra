import { CollaboratorSkillSource, SkillReferenceLevel } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateCollaboratorSkillDto {
  @IsOptional()
  @IsEnum(SkillReferenceLevel)
  level?: SkillReferenceLevel;

  @IsOptional()
  @IsEnum(CollaboratorSkillSource)
  source?: CollaboratorSkillSource;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;

  @IsOptional()
  @IsDateString()
  reviewedAt?: string;
}
