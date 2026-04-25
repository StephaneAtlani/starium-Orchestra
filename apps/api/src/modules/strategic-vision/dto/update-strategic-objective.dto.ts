import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { StrategicObjectiveStatus } from '@prisma/client';

export class UpdateStrategicObjectiveDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  ownerLabel?: string;

  @IsOptional()
  @IsEnum(StrategicObjectiveStatus)
  status?: StrategicObjectiveStatus;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  deadline?: Date;
}
