import { IsHexColor, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateProjectTagDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsHexColor()
  color?: string;
}
