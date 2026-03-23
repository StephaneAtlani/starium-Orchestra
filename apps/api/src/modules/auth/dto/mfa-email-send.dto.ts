import { IsNotEmpty, IsString } from 'class-validator';

export class MfaEmailSendDto {
  @IsString()
  @IsNotEmpty()
  challengeId!: string;
}
