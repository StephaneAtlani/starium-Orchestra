import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class QuickCreateSupplierDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  vatNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  externalId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  email?: string;
}

