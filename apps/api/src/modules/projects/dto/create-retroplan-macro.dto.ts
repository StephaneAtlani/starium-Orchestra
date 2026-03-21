import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class RetroplanMacroStepDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  name!: string;

  /** Nombre de jours calendaires avant la date de fin (0 = jour J). */
  @IsInt()
  @Min(0)
  @Max(3650)
  daysBeforeEnd!: number;
}

export class CreateRetroplanMacroDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'anchorEndDate must be a date in YYYY-MM-DD format',
  })
  anchorEndDate!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => RetroplanMacroStepDto)
  steps!: RetroplanMacroStepDto[];
}
