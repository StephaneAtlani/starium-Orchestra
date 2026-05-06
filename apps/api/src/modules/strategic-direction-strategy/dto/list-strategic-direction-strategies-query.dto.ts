import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { StrategicDirectionStrategyStatus } from '@prisma/client';

export class ListStrategicDirectionStrategiesQueryDto {
  @IsOptional()
  @IsString()
  directionId?: string;

  @IsOptional()
  @IsString()
  alignedVisionId?: string;

  @IsOptional()
  @IsEnum(StrategicDirectionStrategyStatus)
  status?: StrategicDirectionStrategyStatus;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  includeArchived?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}
