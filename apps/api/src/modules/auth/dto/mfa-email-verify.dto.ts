import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class MfaEmailVerifyDto {
  @IsString()
  @IsNotEmpty()
  challengeId!: string;

  @IsString()
  @Length(6, 6)
  @Matches(/^[0-9]+$/)
  code!: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  trustDevice?: boolean;
}
