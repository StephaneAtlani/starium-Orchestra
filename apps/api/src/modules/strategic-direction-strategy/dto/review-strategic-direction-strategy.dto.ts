import { IsEnum, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

export class ReviewStrategicDirectionStrategyDto {
  @IsEnum(['APPROVED', 'REJECTED'])
  decision!: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @ValidateIf((object) => object.decision === 'REJECTED')
  @IsString()
  @MaxLength(4000)
  rejectionReason?: string;
}
