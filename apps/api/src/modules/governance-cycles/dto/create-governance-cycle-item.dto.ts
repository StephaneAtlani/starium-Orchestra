import { GovernanceCycleItemSourceType } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/** Squelette B5 — non exposé en B4. */
export class CreateGovernanceCycleItemDto {
  @IsEnum(GovernanceCycleItemSourceType)
  sourceType!: GovernanceCycleItemSourceType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  description?: string;
}
