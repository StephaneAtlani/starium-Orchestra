import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateProcedureSettingsDto {
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  usePilotageCycle?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  validatorUserIds?: string[];
}
