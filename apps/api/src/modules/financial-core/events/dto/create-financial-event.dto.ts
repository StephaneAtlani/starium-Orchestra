import {
  IsDate,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsNumberString,
  IsString,
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

  /**
   * Saisie fiscale HT/TTC (strict RFC FC-006).
   * Combinaisons autorisées côté backend :
   * - amountHt + taxRate
   * - amountTtc + taxRate
   * - amountHt + taxAmount + amountTtc
   *
   * Note: validation stricte des combinaisons effectuée dans le service.
   */
  @IsOptional()
  @IsNumberString()
  amountHt?: string;

  @IsOptional()
  @IsNumberString()
  amountTtc?: string;

  @IsOptional()
  @IsNumberString()
  taxRate?: string;

  @IsOptional()
  @IsNumberString()
  taxAmount?: string;

  /**
   * Permet d'utiliser explicitement le `Client.defaultTaxRate` si `taxRate` n'est pas fourni.
   * Le backend doit le rendre traçable.
   */
  @IsOptional()
  @IsBoolean()
  useDefaultTaxRate?: boolean;

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
