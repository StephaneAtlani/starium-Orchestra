import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateResourceRoleDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  code?: string | null;
}
