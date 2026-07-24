import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNumberString,
  Matches,
  ValidateNested,
} from 'class-validator';

const YEAR_MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export class MonthlySettingItemDto {
  @Matches(YEAR_MONTH, { message: 'yearMonth must be YYYY-MM' })
  yearMonth!: string;

  /** J/H > 0, max 2 décimales (Decimal string). */
  @IsNumberString()
  days!: string;
}

export class PutMonthlySettingsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MonthlySettingItemDto)
  items!: MonthlySettingItemDto[];
}
