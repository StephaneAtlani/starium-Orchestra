import { IsNotEmpty, IsString } from 'class-validator';

export class SubmitStrategicDirectionStrategyDto {
  @IsString()
  @IsNotEmpty()
  alignedVisionId!: string;
}
