import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class DisableMfaDto {
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  /** TOTP 6 chiffres ou code de secours */
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9A-Za-z\s-]+$/)
  otp!: string;
}
