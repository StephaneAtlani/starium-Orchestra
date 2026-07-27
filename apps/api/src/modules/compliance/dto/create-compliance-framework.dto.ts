import { IsBoolean, IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateComplianceFrameworkDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  version!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  /** Prochaine échéance d'audit / recertification (ISO 8601) ; `null` pour l'effacer. */
  @IsOptional()
  @IsDateString()
  nextAuditAt?: string | null;
}
