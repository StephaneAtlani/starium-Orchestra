import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRevisionDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
