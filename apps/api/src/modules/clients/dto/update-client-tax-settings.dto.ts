import { IsEnum, IsNumberString, IsOptional } from 'class-validator';
import { TaxDisplayMode, TaxInputMode } from '@prisma/client';

export class UpdateClientTaxSettingsDto {
  @IsOptional()
  @IsEnum(TaxDisplayMode)
  taxDisplayMode?: TaxDisplayMode;

  @IsOptional()
  @IsEnum(TaxInputMode)
  taxInputMode?: TaxInputMode;

  /**
   * Valeur en % (ex: 20 pour 20%).
   * Optionnel : si non fourni, ne modifie pas le taxRate par défaut.
   */
  @IsOptional()
  @IsNumberString()
  defaultTaxRate?: string;
}

