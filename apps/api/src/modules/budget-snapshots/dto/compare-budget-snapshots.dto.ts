import { IsNotEmpty, IsString } from 'class-validator';

export class CompareBudgetSnapshotsDto {
  @IsString()
  @IsNotEmpty()
  leftSnapshotId!: string;

  @IsString()
  @IsNotEmpty()
  rightSnapshotId!: string;
}
