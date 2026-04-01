import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class MfaRecoveryVerifyDto {
  @IsString()
  @IsNotEmpty()
  challengeId!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9A-Fa-f\s-]+$/)
  recoveryCode!: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  trustDevice?: boolean;
}
