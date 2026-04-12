import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const CODE_RE = /^[A-Z][A-Z0-9_]{0,63}$/;

export class UpdateContractKindTypeDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(CODE_RE, {
    message:
      'code must be uppercase letters, digits or underscore, starting with a letter',
  })
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(999_999)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
