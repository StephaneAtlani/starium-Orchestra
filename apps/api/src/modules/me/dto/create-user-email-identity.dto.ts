import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateUserEmailIdentityDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  displayName?: string | null;

  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  replyToEmail?: string | null;
}
