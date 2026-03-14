import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AllocationType, FinancialSourceType } from '@prisma/client';

/**
 * Payload POST /financial-allocations.
 * clientId ne doit jamais être dans le body (dérivé du client actif).
 * sourceId obligatoire sauf si sourceType === MANUAL (règle métier figée).
 */
export class CreateFinancialAllocationDto {
  @IsString()
  @IsNotEmpty()
  budgetLineId!: string;

  @IsEnum(FinancialSourceType)
  sourceType!: FinancialSourceType;

  @ValidateIf((o: CreateFinancialAllocationDto) => o.sourceType !== 'MANUAL')
  @IsString()
  @IsNotEmpty({ message: 'sourceId is required when sourceType is not MANUAL' })
  sourceId!: string;

  @IsEnum(AllocationType)
  allocationType!: AllocationType;

  @IsNumber()
  @Min(0)
  allocatedAmount!: number;

  @IsString()
  @IsNotEmpty()
  currency!: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  effectiveDate?: Date;

  @IsOptional()
  @IsString()
  notes?: string;
}
