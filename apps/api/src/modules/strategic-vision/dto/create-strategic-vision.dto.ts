import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateStrategicVisionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(8000)
  statement!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  horizonLabel!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
