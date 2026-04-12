import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { SupplierContractStatus } from '@prisma/client';

export class ListContractsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsEnum(SupplierContractStatus)
  status?: SupplierContractStatus;

  /** ISO date (YYYY-MM-DD) — contrats avec date de fin <= ce jour (inclus). */
  @IsOptional()
  @IsString()
  expiresBefore?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
