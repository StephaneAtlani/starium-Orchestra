import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class VerifyMfaEnrollDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]{6}$/)
  otp!: string;
}
