import {
  ClientUserLicenseBillingMode,
  ClientUserLicenseType,
} from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class AssignUserLicenseDto {
  @IsEnum(ClientUserLicenseType)
  licenseType!: ClientUserLicenseType;

  @IsEnum(ClientUserLicenseBillingMode)
  licenseBillingMode!: ClientUserLicenseBillingMode;

  @IsOptional()
  @IsString()
  subscriptionId?: string | null;

  @IsOptional()
  @IsDateString()
  licenseStartsAt?: string | null;

  @IsOptional()
  @IsDateString()
  licenseEndsAt?: string | null;

  @IsOptional()
  @IsString()
  licenseAssignmentReason?: string | null;
}
