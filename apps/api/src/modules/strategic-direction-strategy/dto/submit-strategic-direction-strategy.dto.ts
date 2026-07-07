import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SubmitStrategicDirectionStrategyDto {
  @IsString()
  @IsNotEmpty()
  alignedVisionId!: string;

  @IsOptional()
  @IsString()
  validatorUserId?: string;
}
