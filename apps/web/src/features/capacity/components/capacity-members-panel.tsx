'use client';

import { useState } from 'react';
import { AlertCircle, ChevronDown } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingState } from '@/components/feedback/loading-state';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { HumanResourceCombobox } from '@/features/teams/work-teams/components/human-resource-combobox';
import { useWorkTeamsList } from '@/features/teams/work-teams/hooks/use-work-teams-list';
import {
  useMemberMonthlyCapacity,
  usePatchPrimaryWorkTeam,
  usePutMemberMonthlyCapacity,
} from '../hooks/use-capacity-mutations';
import { toDaysString } from '../lib/allocation-display';

const NONE = '__none__';

type Props = {
  canManage: boolean;
};

/**
 * Flux simple : choisir une personne → lui rattacher son équipe de capacité.
 * Les exceptions mensuelles sont optionnelles (repliées).
 */
export function CapacityMembersPanel({ canManage }: Props) {
  const [resourceId, setResourceId] = useState('');
  const [resourceLabel, setResourceLabel] = useState<string | null>(null);
  const [primaryId, setPrimaryId] = useState<string>('');
  const [showExceptions, setShowExceptions] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const year = new Date().getFullYear();

  const member = useMemberMonthlyCapacity(
    resourceId || undefined,
    { from: `${year}-01`, to: `${year}-12` },
    { enabled: !!resourceId },
  );
  const put = usePutMemberMonthlyCapacity(resourceId);
  const patchPrimary = usePatchPrimaryWorkTeam(resourceId);
  const teams = useWorkTeamsList(
    { limit: 100, includeArchived: false },
    { enabled: canManage || !!resourceId },
  );

  const selectPrimary =
    primaryId || member.data?.primaryCapacityWorkTeamId || NONE;

  const exceptionRows = (member.data?.items ?? []).map((it) => ({
    ...it,
    edit: draft[it.yearMonth] ?? (it.inherits ? '' : String(it.days ?? '')),
  }));

  return (
    <section className="flex flex-col gap-4" aria-labelledby="capa-team-title">
      <div>
        <h3 id="capa-team-title" className="text-base font-semibold text-foreground">
          2. Qui compte dans quelle équipe ?
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Chaque collaborateur a <strong className="font-medium text-foreground">une</strong>{' '}
          équipe de capacité. C’est elle qui agrège sa disponibilité dans le pilotage.
        </p>
      </div>

      <div className="max-w-xl">
        <HumanResourceCombobox
          id="capa-resource"
          value={resourceId}
          fallbackLabel={resourceLabel ?? member.data?.resourceName}
          dialogOpen
          label="Collaborateur"
          onChange={(id) => {
            setResourceId(id);
            setDraft({});
            setPrimaryId('');
            setShowExceptions(false);
          }}
          onPickResource={(r) => {
            const label = [r.firstName, r.name].filter(Boolean).join(' ') || r.name;
            setResourceLabel(label);
          }}
        />
      </div>

      {!resourceId ? (
        <p className="text-sm text-muted-foreground">
          Sélectionnez un collaborateur pour le rattacher à une équipe.
        </p>
      ) : null}

      {resourceId && member.isLoading ? <LoadingState rows={2} /> : null}
      {member.isError ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" aria-hidden />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>
            {(member.error as Error)?.message ?? 'Ressource introuvable'}
          </AlertDescription>
        </Alert>
      ) : null}

      {member.data ? (
        <div className="flex max-w-xl flex-col gap-3 rounded-md border p-4">
          <p className="text-sm" aria-live="polite">
            <span className="font-medium">{member.data.resourceName}</span>
            {member.data.primaryCapacityWorkTeamName ? (
              <span className="text-muted-foreground">
                {' '}
                → {member.data.primaryCapacityWorkTeamName}
              </span>
            ) : (
              <span className="text-muted-foreground"> — pas encore d’équipe</span>
            )}
          </p>

          {canManage ? (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="capa-primary-team">Équipe de capacité</Label>
                <Select
                  value={selectPrimary}
                  onValueChange={(v) => setPrimaryId(v === NONE ? '' : (v ?? ''))}
                >
                  <SelectTrigger id="capa-primary-team" className="min-h-11 w-full">
                    <SelectValue placeholder="Choisir une équipe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Aucune</SelectItem>
                    {(teams.data?.items ?? []).map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                className="min-h-11 w-fit"
                disabled={patchPrimary.isPending}
                onClick={() =>
                  patchPrimary.mutate(primaryId || null, {
                    onSuccess: () => {
                      toast.success('Équipe enregistrée');
                      void member.refetch();
                    },
                    onError: (e: Error) => toast.error(e.message || 'Échec'),
                  })
                }
              >
                Enregistrer
              </Button>
            </>
          ) : null}

          <div className="border-t pt-3">
            <button
              type="button"
              className="flex min-h-11 w-full items-center justify-between gap-2 text-left text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-expanded={showExceptions}
              onClick={() => setShowExceptions((v) => !v)}
            >
              <span>Cas particulier : capacité différente certains mois (optionnel)</span>
              <ChevronDown
                className={cn('size-4 shrink-0 transition-transform', showExceptions && 'rotate-180')}
                aria-hidden
              />
            </button>
            {showExceptions ? (
              <div className="mt-3 space-y-3">
                <p className="text-xs text-muted-foreground">
                  Laissez vide pour garder la capacité standard du client. Remplissez seulement les
                  mois atypiques (temps partiel, etc.).
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {exceptionRows.map((r) => (
                    <div key={r.yearMonth} className="flex flex-col gap-1">
                      <Label htmlFor={`ex-${r.yearMonth}`} className="text-xs">
                        {r.yearMonth}
                      </Label>
                      {canManage ? (
                        <Input
                          id={`ex-${r.yearMonth}`}
                          className="min-h-11"
                          inputMode="decimal"
                          placeholder="Standard"
                          value={r.edit}
                          onChange={(e) =>
                            setDraft((prev) => ({
                              ...prev,
                              [r.yearMonth]: e.target.value,
                            }))
                          }
                        />
                      ) : (
                        <span className="text-sm">{r.inherits ? 'Standard' : r.days}</span>
                      )}
                    </div>
                  ))}
                </div>
                {canManage ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="min-h-11"
                    disabled={put.isPending}
                    onClick={() =>
                      put.mutate(
                        exceptionRows.map((r) => ({
                          yearMonth: r.yearMonth,
                          days: r.edit.trim() === '' ? null : toDaysString(r.edit),
                        })),
                        {
                          onSuccess: () => toast.success('Exceptions enregistrées'),
                          onError: (e: Error) => toast.error(e.message || 'Échec'),
                        },
                      )
                    }
                  >
                    Enregistrer les exceptions
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
