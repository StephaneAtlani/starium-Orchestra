import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export enum ComplianceRemediationPlanMode {
  CREATE = 'CREATE',
  LINK = 'LINK',
}

export class ComplianceRemediationPlanDto {
  @IsEnum(ComplianceRemediationPlanMode)
  mode!: ComplianceRemediationPlanMode;

  @ValidateIf((o: ComplianceRemediationPlanDto) => o.mode === ComplianceRemediationPlanMode.LINK)
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  actionPlanId?: string;

  @ValidateIf((o: ComplianceRemediationPlanDto) => o.mode === ComplianceRemediationPlanMode.CREATE)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  code?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  targetDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  ownerUserId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  taskTitle?: string;
}
