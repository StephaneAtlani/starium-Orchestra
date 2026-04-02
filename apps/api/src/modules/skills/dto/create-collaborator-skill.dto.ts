import { CollaboratorSkillSource, SkillReferenceLevel } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateCollaboratorSkillDto {
  @IsString()
  @IsNotEmpty()
  skillId!: string;

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
