'use client';

import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { WorkTeamLeadCombobox } from '@/features/teams/work-teams/components/work-team-lead-combobox';
import type { WorkTeamDto } from '@/features/teams/work-teams/types/work-team.types';

export type ResourceHumanTeamsFieldsProps = {
  formIdPrefix: string;
  /** Ressource Humaine = manager hiérarchique = même notion que `WorkTeam.leadResourceId`. */
  managerResourceId: string;
  onManagerResourceIdChange: (resourceId: string) => void;
  /** Libellé affiché quand `managerResourceId` est connu (recherche autocomplete). */
  managerResourceFallbackLabel?: string | null;
  /** Exclure la ressource en cours de la liste (pas manager de soi-même). */
  excludeResourceId?: string;
  selectedWorkTeamIds: string[];
  onToggleWorkTeam: (teamId: string, selected: boolean) => void;
  teamsLoading: boolean;
  teamsError: boolean;
  teamItems: WorkTeamDto[];
};

/**
 * Manager et responsable d'équipe : **une seule entité** — fiche **Ressource Humaine**.
 * Les équipes proposées sont celles dont cette ressource est `leadResourceId` (Structure équipes).
 */
export function ResourceHumanTeamsFields({
  formIdPrefix,
  managerResourceId,
  onManagerResourceIdChange,
  managerResourceFallbackLabel,
  excludeResourceId,
  selectedWorkTeamIds,
  onToggleWorkTeam,
  teamsLoading,
  teamsError,
  teamItems,
}: ResourceHumanTeamsFieldsProps) {
  const pid = (s: string) => `${formIdPrefix}-${s}`;
  const selected = new Set(selectedWorkTeamIds);
  const hasManager = Boolean(managerResourceId);

  return (
    <div className="space-y-3 border-t border-border/60 pt-4">
      <div>
        <p className="text-sm font-medium text-foreground">Équipes (référentiel)</p>
        <p className="text-xs text-muted-foreground">
          Choisissez d’abord une <strong className="text-foreground">ressource Humaine</strong> : elle
          sert de <strong className="text-foreground">manager</strong> et correspond au{' '}
          <strong className="text-foreground">responsable d’équipe</strong> défini sur les fiches
          équipes (même identifiant catalogue).
        </p>
      </div>

      <WorkTeamLeadCombobox
        id={pid('manager-resource')}
        value={managerResourceId}
        onChange={onManagerResourceIdChange}
        fallbackLabel={managerResourceFallbackLabel ?? null}
        allowEmpty
        dialogOpen
        excludeResourceId={excludeResourceId}
        fieldLabel="Manager / responsable d’équipe (ressource Humaine)"
        fieldDescription={
          <>
            Une seule fiche catalogue : la même que sur <strong>Structure équipes</strong> pour le
            lead. Au moins 2 caractères pour lancer la recherche.
          </>
        }
      />

      <div className="space-y-2">
        <Label htmlFor={pid('workTeams')}>Équipes dont cette ressource est le responsable</Label>
        <div
          id={pid('workTeams')}
          role="group"
          aria-label="Équipes à rattacher"
          className={cn(
            'max-h-48 overflow-y-auto rounded-lg border border-input bg-transparent px-2 py-2 text-sm',
            teamsLoading && 'opacity-60',
            !hasManager && 'bg-muted/20',
          )}
        >
          {!hasManager ? (
            <p className="text-xs text-muted-foreground px-1">
              Sélectionnez d’abord une ressource Humaine : la liste affiche les équipes dont elle est{' '}
              <strong className="font-medium text-foreground">responsable</strong> (lead).
            </p>
          ) : teamsLoading ? (
            <p className="text-xs text-muted-foreground px-1">Chargement des équipes…</p>
          ) : teamsError ? (
            <p className="text-xs text-destructive px-1">Impossible de charger les équipes.</p>
          ) : teamItems.length === 0 ? (
            <p className="text-xs text-muted-foreground px-1">
              Aucune équipe active où cette ressource est responsable. Définissez le lead sur la fiche
              équipe (Structure équipes).
            </p>
          ) : (
            <ul className="space-y-2">
              {teamItems.map((t) => (
                <li key={t.id}>
                  <label
                    className={cn(
                      'flex items-start gap-2 rounded-md px-1 py-0.5',
                      hasManager ? 'cursor-pointer hover:bg-muted/40' : 'cursor-not-allowed opacity-60',
                    )}
                  >
                    <input
                      type="checkbox"
                      className="mt-2.5 size-4 shrink-0 rounded border-input"
                      disabled={!hasManager}
                      checked={selected.has(t.id)}
                      onChange={(e) => onToggleWorkTeam(t.id, e.target.checked)}
                    />
                    <span className="min-w-0 leading-snug">
                      {t.pathLabel || t.name}
                      {t.code ? (
                        <span className="ml-1.5 text-xs text-muted-foreground">({t.code})</span>
                      ) : null}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Cochez les équipes auxquelles rattacher la personne éditée (membre d’équipe).
        </p>
      </div>
    </div>
  );
}
