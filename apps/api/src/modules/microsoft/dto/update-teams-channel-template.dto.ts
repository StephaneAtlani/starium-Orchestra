import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength, Validate } from 'class-validator';

const TEAMS_CHANNEL_DISPLAYNAME_FORBIDDEN = /[~#%&*{}+\/\\:<>?|'"]/;

class TeamsChannelDisplayNameValidator {
  validate(value: unknown): boolean {
    return (
      typeof value === 'string' &&
      value.trim().length > 0 &&
      value.trim().length <= 50 &&
      !TEAMS_CHANNEL_DISPLAYNAME_FORBIDDEN.test(value.trim())
    );
  }

  defaultMessage(): string {
    return 'Le nom du canal contient des caractères interdits par Microsoft Teams.';
  }
}

export class UpdateTeamsChannelTemplateDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @Validate(TeamsChannelDisplayNameValidator)
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
