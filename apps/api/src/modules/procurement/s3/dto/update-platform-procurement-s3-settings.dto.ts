import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

function emptyToUndefined(v: unknown): unknown {
  if (v === '' || v === null) return undefined;
  return v;
}

export class UpdatePlatformProcurementS3SettingsDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  @MaxLength(2048)
  endpoint?: string;

  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  @MaxLength(128)
  region?: string;

  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  @MaxLength(512)
  accessKey?: string;

  /** Secret en clair — écriture uniquement, jamais renvoyé par GET. */
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  secretKey?: string;

  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  @MaxLength(256)
  bucket?: string;

  @IsOptional()
  @IsBoolean()
  useSsl?: boolean;

  @IsOptional()
  @IsBoolean()
  forcePathStyle?: boolean;
}
