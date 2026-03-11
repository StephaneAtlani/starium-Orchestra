import { IsString, MinLength } from 'class-validator';

export class UpdatePlatformUserPasswordDto {
  @IsString()
  @MinLength(8)
  password!: string;
}

