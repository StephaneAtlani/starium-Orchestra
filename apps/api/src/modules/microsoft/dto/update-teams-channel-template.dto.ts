import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

const TEAMS_CHANNEL_DISPLAYNAME_ALLOWED = /^[^~#%&*{}+\\/\\:<>?|'"']+$/;

export class UpdateTeamsChannelTemplateDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @Matches(TEAMS_CHANNEL_DISPLAYNAME_ALLOWED, {
    message: 'Le nom du canal contient des caractères interdits par Microsoft Teams.',
  })
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isPrimary?: boolean;
}
