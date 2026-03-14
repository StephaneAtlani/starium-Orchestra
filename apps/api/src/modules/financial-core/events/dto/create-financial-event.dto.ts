import {
  IsDate,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FinancialEventType, FinancialSourceType } from '@prisma/client';

/**
 * Payload POST /financial-events.
 * clientId ne doit jamais être dans le body.
 * sourceId optionnel pour MANUAL et types techniques (ex. BUDGET_INITIALIZED, ADJUSTMENT).
 */
export class CreateFinancialEventDto {
  @IsString()
  budgetLineId!: string;

  @IsEnum(FinancialSourceType)
  sourceType!: FinancialSourceType;

  @IsOptional()
  @IsString()
  sourceId?: string | null;

  @IsEnum(FinancialEventType)
  eventType!: FinancialEventType;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsString()
  currency!: string;

  @Type(() => Date)
  @IsDate()
  eventDate!: Date;

  @IsString()
  label!: string;

  @IsOptional()
  @IsString()
  description?: string;
}
