import { SkillReferenceLevel, SkillStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSkillDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty()
  categoryId!: string;

  @IsOptional()
  @IsEnum(SkillReferenceLevel)
  referenceLevel?: SkillReferenceLevel = SkillReferenceLevel.INTERMEDIATE;

  @IsOptional()
  @IsEnum(SkillStatus)
  status?: SkillStatus = SkillStatus.DRAFT;
}
