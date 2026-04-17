'use client';

import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { ProjectScenarioApi, UpdateProjectScenarioPayload } from '../types/project.types';
import {
  buildScenarioPatchPayload,
  isScenarioDraftDirty,
  scenarioToDraft,
  type ScenarioOverviewDraft,
} from './scenario-patch-payload';
import { isScenarioWorkspaceReadOnly } from './scenario-workspace-readonly';

const textareaClass = cn(
  'min-h-[100px] w-full resize-y rounded-lg border border-input bg-background px-2.5 py-2 text-sm transition-colors outline-none',
  'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
  'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
);

type Props = {
  scenario: ProjectScenarioApi;
  canMutate: boolean;
  readOnlyNotice?: string | null;
  isUpdatePending: boolean;
  onSave: (payload: UpdateProjectScenarioPayload) => void;
};

const DEFAULT_READ_ONLY_NOTICE =
  'Permission requise : projects.update pour modifier ce scénario.';

export function ScenarioOverviewPanel({
  scenario,
  canMutate,
  readOnlyNotice,
  isUpdatePending,
  onSave,
}: Props) {
  const readOnly = isScenarioWorkspaceReadOnly(scenario) || !canMutate;
  const [draft, setDraft] = useState<ScenarioOverviewDraft>(() => scenarioToDraft(scenario));

  useEffect(() => {
    setDraft(scenarioToDraft(scenario));
  }, [scenario.id, scenario.updatedAt]);

  const dirty = isScenarioDraftDirty(scenario, draft);
  const payload = buildScenarioPatchPayload(scenario, draft);
  const disableFields = readOnly || isUpdatePending;
  const nameValid = draft.name.trim().length >= 1;
  const disableSave = readOnly || !dirty || !payload || isUpdatePending || !nameValid;

  return (
    <div className="space-y-4">
      {readOnly && isScenarioWorkspaceReadOnly(scenario) ? (
        <Alert>
          <AlertTitle>Scénario archivé</AlertTitle>
          <AlertDescription>
            Ce scénario est archivé : l’édition est désactivée. Les synthèses restent consultables dans les
            autres onglets.
          </AlertDescription>
        </Alert>
      ) : null}
      {!canMutate && !isScenarioWorkspaceReadOnly(scenario) ? (
        <Alert>
          <AlertTitle>Action limitée</AlertTitle>
          <AlertDescription>
            {readOnlyNotice ?? DEFAULT_READ_ONLY_NOTICE}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="scenario-name">Nom</Label>
          <Input
            id="scenario-name"
            value={draft.name}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setDraft((d: ScenarioOverviewDraft) => ({ ...d, name: e.target.value }))
            }
            disabled={disableFields}
            autoComplete="off"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="scenario-code">Code</Label>
          <Input
            id="scenario-code"
            value={draft.code}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setDraft((d: ScenarioOverviewDraft) => ({ ...d, code: e.target.value }))
            }
            disabled={disableFields}
            autoComplete="off"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="scenario-description">Description</Label>
          <textarea
            id="scenario-description"
            className={textareaClass}
            value={draft.description}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
              setDraft((d: ScenarioOverviewDraft) => ({ ...d, description: e.target.value }))
            }
            disabled={disableFields}
            rows={4}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="scenario-assumptions">Synthèse des hypothèses</Label>
          <textarea
            id="scenario-assumptions"
            className={textareaClass}
            value={draft.assumptionSummary}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
              setDraft((d: ScenarioOverviewDraft) => ({ ...d, assumptionSummary: e.target.value }))
            }
            disabled={disableFields}
            rows={4}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={disableSave}
          onClick={() => {
            const p = buildScenarioPatchPayload(scenario, draft);
            if (p) onSave(p);
          }}
        >
          Enregistrer
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={readOnly || isUpdatePending || !dirty}
          onClick={() => setDraft(scenarioToDraft(scenario))}
        >
          Annuler
        </Button>
      </div>
    </div>
  );
}
