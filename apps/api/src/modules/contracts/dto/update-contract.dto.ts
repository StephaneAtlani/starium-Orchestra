import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import {
  SupplierContractRenewalMode,
  SupplierContractStatus,
} from '@prisma/client';

const CONTRACT_KIND_CODE_RE = /^[A-Z][A-Z0-9_]{0,63}$/;

export class UpdateContractDto {
  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  reference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(CONTRACT_KIND_CODE_RE, {
    message:
      'kind : code en MAJUSCULES (lettre initiale, puis lettres, chiffres ou underscore)',
  })
  kind?: string;

  @IsOptional()
  @IsEnum(SupplierContractStatus)
  status?: SupplierContractStatus;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  signedAt?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  effectiveStart?: Date;

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

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

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
