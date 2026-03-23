import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateResourceRoleDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  code?: string | null;
}
