import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { StrategicVisionStatus } from '@prisma/client';

export class ListStrategicVisionQueryDto {
  @IsOptional()
  @IsEnum(StrategicVisionStatus)
  status?: StrategicVisionStatus;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeArchived?: boolean;
}
