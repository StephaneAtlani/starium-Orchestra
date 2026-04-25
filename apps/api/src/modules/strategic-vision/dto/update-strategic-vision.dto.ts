import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateStrategicVisionDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  statement?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  horizonLabel?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
