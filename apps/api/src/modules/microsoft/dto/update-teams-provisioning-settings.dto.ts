import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateTeamsProvisioningSettingsDto {
  @Type(() => Boolean)
  @IsBoolean()
  isEnabled!: boolean;

  @Type(() => Boolean)
  @IsBoolean()
  offerOnProjectCreate!: boolean;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  teamNameTemplate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  teamDescriptionTemplate?: string;
}
