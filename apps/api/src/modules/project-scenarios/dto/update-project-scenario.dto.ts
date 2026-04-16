import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateProjectScenarioDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  code?: string | null;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsString()
  assumptionSummary?: string | null;
}
