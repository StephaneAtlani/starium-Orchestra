import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RequestComplianceNaDto {
  @IsString()
  @MinLength(3)
  @MaxLength(4000)
  justification!: string;
}

export class ReviewComplianceNaDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reviewNote?: string;
}
