import { IsArray, IsString } from 'class-validator';

export class ReplaceStrategicDirectionStrategyAxesDto {
  @IsArray()
  @IsString({ each: true })
  /** Remplace l’ensemble des axes liés (tableau vide = aucun axe). Sans @ArrayNotEmpty pour autoriser vidage explicite. */
  strategicAxisIds!: string[];
}
