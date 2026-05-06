import { IsArray, IsString } from 'class-validator';

export class ReplaceStrategicDirectionStrategyObjectivesDto {
  @IsArray()
  @IsString({ each: true })
  strategicObjectiveIds!: string[];
}
