import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  ClientSubscriptionStatus,
  ClientUserLicenseBillingMode,
} from '@prisma/client';

const CUID_REGEX = /^c[a-z0-9]{24}$/;
const YEAR_MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

export class LicenseReportingFiltersDto {
  @IsOptional()
  @IsString()
  @Matches(CUID_REGEX, { message: 'clientId doit être un CUID valide' })
  clientId?: string;

  @IsOptional()
  @Transform(({ value }) => String(value ?? '').trim().toUpperCase())
  @IsEnum(ClientUserLicenseBillingMode, {
    message: 'licenseBillingMode invalide',
  })
  licenseBillingMode?: ClientUserLicenseBillingMode;

  @IsOptional()
  @Transform(({ value }) => String(value ?? '').trim().toUpperCase())
  @IsEnum(ClientSubscriptionStatus, {
    message: 'subscriptionStatus invalide',
  })
  subscriptionStatus?: ClientSubscriptionStatus;
}

export class LicenseReportingMonthlyQueryDto extends LicenseReportingFiltersDto {
  @IsOptional()
  @IsString()
  @MaxLength(7)
  @Matches(YEAR_MONTH_REGEX, { message: 'from doit être au format YYYY-MM' })
  from?: string;

  @IsOptional()
  @IsString()
  @MaxLength(7)
  @Matches(YEAR_MONTH_REGEX, { message: 'to doit être au format YYYY-MM' })
  to?: string;
}
