'use client';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ProjectScenarioApi } from '../types/project.types';
import { sortScenariosForCockpit } from './sort-scenarios-cockpit';
import { scenarioDisplayLabel } from './scenario-scenario-label';

type ScenarioComparisonSelectorProps = {
  scenarios: ProjectScenarioApi[];
  baselineId: string;
  comparedId: string | null;
  onBaselineChange: (id: string) => void;
  onComparedChange: (id: string) => void;
  disabled?: boolean;
};

export function ScenarioComparisonSelector({
  scenarios,
  baselineId,
  comparedId,
  onBaselineChange,
  onComparedChange,
  disabled,
}: ScenarioComparisonSelectorProps) {
  const pool = sortScenariosForCockpit(scenarios);
  const baselineOptions = pool;
  const comparedOptions = pool.filter((s) => s.id !== baselineId);

  const baselineLabel =
    baselineOptions.find((s) => s.id === baselineId) !== undefined
      ? scenarioDisplayLabel(baselineOptions.find((s) => s.id === baselineId)!)
      : '';

  const comparedLabel =
    comparedId !== null
      ? (comparedOptions.find((s) => s.id === comparedId) !== undefined
          ? scenarioDisplayLabel(comparedOptions.find((s) => s.id === comparedId)!)
          : '')
      : '';

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="grid gap-1.5">
        <Label htmlFor="cockpit-baseline">Baseline</Label>
        <Select
          value={baselineId}
          onValueChange={(v) => {
            if (v === null || v === '') return;
            onBaselineChange(v);
          }}
          disabled={disabled || baselineOptions.length === 0}
        >
          <SelectTrigger id="cockpit-baseline" size="sm" className="w-full">
            <SelectValue placeholder="Choisir la baseline">{baselineLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {baselineOptions.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {scenarioDisplayLabel(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="cockpit-compared">Comparer à</Label>
        <Select
          value={comparedId ?? '__none__'}
          onValueChange={(v) => {
            if (v === null || v === '' || v === '__none__') return;
            onComparedChange(v);
          }}
          disabled={disabled || comparedOptions.length === 0}
        >
          <SelectTrigger id="cockpit-compared" size="sm" className="w-full">
            <SelectValue placeholder="Choisir un scénario">
              {comparedId ? comparedLabel : '—'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {comparedOptions.length === 0 ? (
              <SelectItem value="__none__" disabled>
                Aucun autre scénario
              </SelectItem>
            ) : (
              comparedOptions.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {scenarioDisplayLabel(s)}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
