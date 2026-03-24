import { IsBoolean, IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateUserEmailIdentityDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  displayName?: string | null;

  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  replyToEmail?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
