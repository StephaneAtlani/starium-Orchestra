import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BudgetEnvelopeType, BudgetEnvelopeStatus } from '@prisma/client';

export class UpdateBudgetEnvelopeDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(BudgetEnvelopeType)
  type?: BudgetEnvelopeType;

  @IsOptional()
  @IsEnum(BudgetEnvelopeStatus)
  status?: BudgetEnvelopeStatus;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
