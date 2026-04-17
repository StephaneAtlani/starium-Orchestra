import { IsBoolean, IsOptional } from 'class-validator';

/**
 * Options d’intégration des dimensions scénario → projet lors de la sélection baseline.
 * Absence = comportement historique (tout considéré comme demandé ; défauts résolus côté service).
 */
export class SelectScenarioSyncOptionsDto {
  @IsOptional()
  @IsBoolean()
  syncBudget?: boolean;

  @IsOptional()
  @IsBoolean()
  syncResources?: boolean;

  @IsOptional()
  @IsBoolean()
  syncPlanning?: boolean;

  @IsOptional()
  @IsBoolean()
  syncCapacity?: boolean;

  @IsOptional()
  @IsBoolean()
  syncRisks?: boolean;
}

export type ResolvedScenarioSyncOptions = {
  syncBudget: boolean;
  syncResources: boolean;
  syncPlanning: boolean;
  syncCapacity: boolean;
  syncRisks: boolean;
};

export function resolveScenarioSyncOptions(
  dto?: SelectScenarioSyncOptionsDto | null,
): ResolvedScenarioSyncOptions {
  return {
    syncBudget: dto?.syncBudget ?? true,
    syncResources: dto?.syncResources ?? true,
    syncPlanning: dto?.syncPlanning ?? true,
    syncCapacity: dto?.syncCapacity ?? true,
    syncRisks: dto?.syncRisks ?? true,
  };
}
