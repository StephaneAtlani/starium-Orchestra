import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateProjectRaciActionDto {
  @IsString()
  @MaxLength(500)
  label!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
