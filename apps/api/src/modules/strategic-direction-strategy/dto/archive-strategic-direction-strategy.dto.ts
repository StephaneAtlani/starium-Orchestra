import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ArchiveStrategicDirectionStrategyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  reason!: string;
}
