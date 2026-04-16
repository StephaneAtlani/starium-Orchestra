import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateProjectScenarioDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  assumptionSummary?: string;
}
