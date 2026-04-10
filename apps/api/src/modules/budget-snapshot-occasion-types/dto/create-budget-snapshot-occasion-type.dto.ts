import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** Code métier stable (MAJUSCULES, chiffres, underscore). */
const CODE_RE = /^[A-Z][A-Z0-9_]{0,39}$/;

export class CreateBudgetSnapshotOccasionTypeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  @Matches(CODE_RE, {
    message:
      'code must be uppercase letters, digits or underscore, starting with a letter',
  })
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  label!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(999_999)
  sortOrder?: number;
}
