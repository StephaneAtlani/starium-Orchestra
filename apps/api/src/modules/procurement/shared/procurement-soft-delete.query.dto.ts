import { Type } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

export class ProcurementSoftDeleteQueryDto {
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeArchived?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeCancelled?: boolean;
}

