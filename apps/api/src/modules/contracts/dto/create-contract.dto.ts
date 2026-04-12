import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import {
  SupplierContractKind,
  SupplierContractRenewalMode,
  SupplierContractStatus,
} from '@prisma/client';

export class CreateContractDto {
  @IsString()
  @IsNotEmpty()
  supplierId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  reference!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  title!: string;

  @IsEnum(SupplierContractKind)
  kind!: SupplierContractKind;

  @IsOptional()
  @IsEnum(SupplierContractStatus)
  status?: SupplierContractStatus;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  signedAt?: Date;

  @Type(() => Date)
  @IsDate()
  effectiveStart!: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  effectiveEnd?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  terminatedAt?: Date;

  @IsOptional()
  @IsEnum(SupplierContractRenewalMode)
  renewalMode?: SupplierContractRenewalMode;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  noticePeriodDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  renewalTermMonths?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(3)
  currency!: string;

  @IsOptional()
  @IsNumberString()
  annualValue?: string;

  @IsOptional()
  @IsNumberString()
  totalCommittedValue?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  billingFrequency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  internalNotes?: string;
}
