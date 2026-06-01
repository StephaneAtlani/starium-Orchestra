import { IsObject } from 'class-validator';

export class UpdateGovernanceCycleConfigDto {
  @IsObject()
  governanceConfig!: Record<string, unknown>;
}
