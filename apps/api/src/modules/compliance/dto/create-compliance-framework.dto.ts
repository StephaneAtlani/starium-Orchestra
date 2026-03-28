import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateComplianceFrameworkDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  version!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
