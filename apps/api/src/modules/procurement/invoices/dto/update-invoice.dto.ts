import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateInvoiceDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  invoiceNumber?: string;

  @IsOptional()
  @IsString()
  amountHt?: string;

  @IsOptional()
  @IsString()
  taxRate?: string;

  @IsOptional()
  @IsString()
  taxAmount?: string;

  @IsOptional()
  @IsString()
  amountTtc?: string;

  @IsOptional()
  @IsString()
  budgetLineId?: string;
}

