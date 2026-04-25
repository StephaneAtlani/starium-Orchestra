import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { StrategicObjectiveStatus } from '@prisma/client';

export class CreateStrategicObjectiveDto {
  @IsString()
  @IsNotEmpty()
  axisId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

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
