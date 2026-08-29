import { IsString, IsNotEmpty } from 'class-validator';

export class ApplyLandingForecastDto {
  @IsString()
  @IsNotEmpty()
  arbitratedSnapshotId!: string;
}

export class ValidateLandingForecastDto {
  @IsString()
  @IsNotEmpty()
  arbitratedSnapshotId!: string;
}
