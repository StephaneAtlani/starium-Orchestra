import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateRiskTypeDto {
  @IsString()
  @MinLength(1)
  code!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
