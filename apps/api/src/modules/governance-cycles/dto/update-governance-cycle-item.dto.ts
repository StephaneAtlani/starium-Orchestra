import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Squelette B5 — non exposé en B4. */
export class UpdateGovernanceCycleItemDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  description?: string | null;
}
