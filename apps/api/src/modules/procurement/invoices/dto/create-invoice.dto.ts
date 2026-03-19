import { Type } from 'class-transformer';
import {
  IsDate,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateInvoiceDto {
  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  supplierName?: string;

  @IsOptional()
  @IsString()
  budgetLineId?: string;

  @IsOptional()
  @IsString()
  purchaseOrderId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  invoiceNumber!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  label!: string;

  @IsNumberString()
  amountHt!: string;

  @IsOptional()
  @IsNumberString()
  taxRate?: string;

  @Type(() => Date)
  @IsDate()
  invoiceDate!: Date;
}

