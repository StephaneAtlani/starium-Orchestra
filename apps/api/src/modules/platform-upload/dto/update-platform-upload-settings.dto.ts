import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';
import { PLATFORM_UPLOAD_MIN_BYTES } from '../platform-upload.constants';

export class UpdatePlatformUploadSettingsDto {
  @Type(() => Number)
  @IsInt()
  @Min(PLATFORM_UPLOAD_MIN_BYTES)
  maxUploadBytes!: number;
}
