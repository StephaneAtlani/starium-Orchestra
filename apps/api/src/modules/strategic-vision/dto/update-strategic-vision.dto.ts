import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { StrategicVisionStatus } from '@prisma/client';

export class UpdateStrategicVisionDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  statement?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  horizonLabel?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsEnum(StrategicVisionStatus)
  status?: StrategicVisionStatus;
}
