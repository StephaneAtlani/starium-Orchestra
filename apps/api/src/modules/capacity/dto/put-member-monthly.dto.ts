import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNumberString,
  Matches,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

const YEAR_MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export class MemberMonthlyItemDto {
  @Matches(YEAR_MONTH, { message: 'yearMonth must be YYYY-MM' })
  yearMonth!: string;

  /** null = hérite de la capacité client ; sinon J/H > 0. */
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsNumberString()
  days!: string | null;
}

export class PutMemberMonthlyDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MemberMonthlyItemDto)
  items!: MemberMonthlyItemDto[];
}
