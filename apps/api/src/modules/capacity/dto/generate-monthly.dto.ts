import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class GenerateMonthlyDto {
  @IsInt()
  @Min(2000)
  @Max(2100)
  @Transform(({ value }) => Number(value))
  year!: number;

  /** Si true, écrase aussi les mois `CLIENT_PARAM`. */
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  force?: boolean;
}
