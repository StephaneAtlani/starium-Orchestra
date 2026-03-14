import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { BudgetLineStatus } from '@prisma/client';

export class UpdateBudgetLineDto {
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
  @IsEnum(BudgetLineStatus)
  status?: BudgetLineStatus;

  @IsOptional()
  @IsNumber()
  @Min(0)
  revisedAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;
}
