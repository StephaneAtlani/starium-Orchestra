import { IsString, MinLength } from 'class-validator';

export class ActivateComplianceFrameworkDto {
  @IsString()
  @MinLength(1)
  platformFrameworkId!: string;
}
