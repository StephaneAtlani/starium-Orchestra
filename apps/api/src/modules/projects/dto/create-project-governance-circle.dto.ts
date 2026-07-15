import { IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateProjectGovernanceCircleDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
