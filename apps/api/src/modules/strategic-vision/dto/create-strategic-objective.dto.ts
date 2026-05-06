import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  StrategicObjectiveHealthStatus,
  StrategicObjectiveLifecycleStatus,
  StrategicObjectiveStatus,
} from '@prisma/client';

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
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MinLength(1)
  ownerUserId?: string | null;

  @IsOptional()
  @IsEnum(StrategicObjectiveStatus)
  status?: StrategicObjectiveStatus;

  @IsOptional()
  @IsEnum(StrategicObjectiveLifecycleStatus)
  lifecycleStatus?: StrategicObjectiveLifecycleStatus;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsEnum(StrategicObjectiveHealthStatus)
  healthStatus?: StrategicObjectiveHealthStatus | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  progressPercent?: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  deadline?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  targetDate?: Date;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MinLength(1)
  directionId?: string | null;
}
