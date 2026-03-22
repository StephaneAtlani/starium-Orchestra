import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class QuickCreateSupplierDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;
}

