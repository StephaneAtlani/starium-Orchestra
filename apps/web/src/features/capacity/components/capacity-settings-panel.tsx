'use client';

import { useMemo, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingState } from '@/components/feedback/loading-state';
import { toast } from '@/lib/toast';
import { useCapacityMonthlySettings } from '../hooks/use-capacity-monthly-settings';
import {
  useGenerateCapacityMonthly,
  usePutCapacityMonthlySettings,
} from '../hooks/use-capacity-mutations';
import { toDaysString } from '../lib/allocation-display';

const MONTH_SHORT = [
  'Jan',
  'Fév',
  'Mar',
  'Avr',
  'Mai',
  'Juin',
  'Juil',
  'Aoû',
  'Sep',
  'Oct',
  'Nov',
  'Déc',
];

type Props = {
  canManage: boolean;
};

/**
 * Capacité standard du client = 12 valeurs J/H pour l’année.
 * Un clic initialise depuis le calendrier FR ; édition compacte mois par mois.
 */
export function CapacitySettingsPanel({ canManage }: Props) {
  const year = new Date().getFullYear();
  const { data, isLoading, isError, error } = useCapacityMonthlySettings({
    from: `${year}-01`,
    to: `${year}-12`,
  });
  const generate = useGenerateCapacityMonthly();
  const put = usePutCapacityMonthlySettings();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState(false);

  const rows = useMemo(() => {
    const items = data?.items ?? [];
    return items.map((it) => ({
      ...it,
      edit: draft[it.yearMonth] ?? String(it.days),
      monthIndex: Number(it.yearMonth.slice(5, 7)) - 1,
    }));
  }, [data?.items, draft]);

  const isEmpty = !isLoading && !isError && rows.length === 0;

  return (
    <section className="flex flex-col gap-3" aria-labelledby="capa-std-title">
      <div>
        <h3 id="capa-std-title" className="text-base font-semibold text-foreground">
          1. Capacité standard ({year})
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Combien de J/H un collaborateur « à temps plein » a chaque mois. Sert de base à toutes
          les équipes.
        </p>
      </div>

      {isLoading ? <LoadingState rows={2} /> : null}
      {isError ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" aria-hidden />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{(error as Error)?.message ?? 'Échec'}</AlertDescription>
        </Alert>
      ) : null}

      {isEmpty && canManage ? (
        <div className="rounded-md border border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Pas encore de calendrier pour {year}. Un clic suffit.
          </p>
          <Button
            type="button"
            className="mt-4 min-h-11"
            disabled={generate.isPending}
            onClick={() =>
              generate.mutate(
                { year },
                {
                  onSuccess: () => toast.success(`Capacité ${year} initialisée`),
                  onError: (e: Error) => toast.error(e.message || 'Échec'),
                },
              )
            }
          >
            Initialiser {year} (jours ouvrés FR)
          </Button>
        </div>
      ) : null}

      {isEmpty && !canManage ? (
        <p className="text-sm text-muted-foreground">Calendrier non initialisé.</p>
      ) : null}

      {rows.length > 0 ? (
        <>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {rows.map((r) => (
              <div
                key={r.yearMonth}
                className="flex flex-col gap-1 rounded-md border bg-muted/20 p-2"
              >
                <span className="text-xs font-medium text-muted-foreground">
                  {MONTH_SHORT[r.monthIndex] ?? r.yearMonth}
                </span>
                {canManage && editing ? (
                  <Input
                    className="min-h-11 text-center tabular-nums"
                    inputMode="decimal"
                    aria-label={`J/H ${MONTH_SHORT[r.monthIndex]}`}
                    value={r.edit}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, [r.yearMonth]: e.target.value }))
                    }
                  />
                ) : (
                  <span className="flex min-h-11 items-center justify-center text-sm font-semibold tabular-nums">
                    {r.days}
                  </span>
                )}
              </div>
            ))}
          </div>

          {canManage ? (
            <div className="flex flex-wrap gap-2">
              {!editing ? (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    className="min-h-11"
                    onClick={() => setEditing(true)}
                  >
                    Ajuster les mois
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11"
                    disabled={generate.isPending}
                    onClick={() =>
                      generate.mutate(
                        { year, force: true },
                        {
                          onSuccess: () => {
                            setDraft({});
                            toast.success(`Recalculé depuis le calendrier FR (${year})`);
                          },
                          onError: (e: Error) => toast.error(e.message || 'Échec'),
                        },
                      )
                    }
                  >
                    Recalculer (FR)
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    className="min-h-11"
                    disabled={put.isPending}
                    onClick={() => {
                      const items = rows.map((r) => ({
                        yearMonth: r.yearMonth,
                        days: toDaysString(r.edit),
                      }));
                      if (items.some((i) => !i.days)) {
                        toast.error('Chaque mois doit avoir une valeur');
                        return;
                      }
                      put.mutate(items, {
                        onSuccess: () => {
                          setEditing(false);
                          setDraft({});
                          toast.success('Capacité standard enregistrée');
                        },
                        onError: (e: Error) => toast.error(e.message || 'Échec'),
                      });
                    }}
                  >
                    Enregistrer
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="min-h-11"
                    onClick={() => {
                      setEditing(false);
                      setDraft({});
                    }}
                  >
                    Annuler
                  </Button>
                </>
              )}
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
