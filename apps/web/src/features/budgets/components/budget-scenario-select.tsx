'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { BudgetForecastScenario } from '../types/budget-pilotage.types';

/** Seule valeur pilotée côté données en MVP (aucune autre branche API / simulation front). */
const MVP_SCENARIO: BudgetForecastScenario = 'baseline';

/**
 * MVP Forecast : seul Baseline est sélectionnable ; autres scénarios désactivés (RFC-024).
 * Les montants forecast restent ceux renvoyés par GET planning (Baseline API) — pas de recalcul UI.
 */
export function BudgetScenarioSelect() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      <span className="text-muted-foreground">Scénario</span>
      <Select
        value={MVP_SCENARIO}
        onValueChange={() => {
          /* MVP : verrouillé sur Baseline — pas de changement de source de données. */
        }}
      >
        <SelectTrigger
          size="sm"
          className="min-w-[10.5rem]"
          aria-label="Scénario de forecast (MVP : Baseline uniquement)"
        >
          <SelectValue>Baseline</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="baseline">Baseline</SelectItem>
          <SelectItem value="__revised__" disabled>
            Révisé — À venir
          </SelectItem>
          <SelectItem value="__optimiste__" disabled>
            Optimiste — À venir
          </SelectItem>
          <SelectItem value="__pessimiste__" disabled>
            Pessimiste — À venir
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
