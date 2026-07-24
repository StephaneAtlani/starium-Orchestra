'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { LoadingState } from '@/components/feedback/loading-state';
import { EmptyState } from '@/components/feedback/empty-state';
import { cn } from '@/lib/utils';
import { useCapacityDashboard } from '../hooks/use-capacity-mutations';
import { formatCapacityDays } from '../lib/allocation-display';
import type {
  CapacityDashboardRow,
  CapacityPortfolioSummary,
} from '../types/capacity.types';

type View = 'portfolio' | 'work-teams' | 'resources';

function currentYearMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function shiftYearMonth(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function CapacityDashboardPanel() {
  const [view, setView] = useState<View>('portfolio');
  const [yearMonth, setYearMonth] = useState(currentYearMonth);
  const [includeArchived, setIncludeArchived] = useState(false);

  const params = useMemo(
    () => ({ from: yearMonth, to: yearMonth, includeArchivedWorkTeams: includeArchived }),
    [yearMonth, includeArchived],
  );
  const dash = useCapacityDashboard(view, params);

  const rows = (dash.data as { items: Array<CapacityDashboardRow | CapacityPortfolioSummary> } | undefined)
    ?.items;

  const kpi = useMemo(() => {
    if (!rows?.length) return null;
    const capacity = rows.reduce((s, r) => s + Number(r.capacity ?? 0), 0);
    const allocated = rows.reduce((s, r) => s + Number(r.allocated ?? 0), 0);
    const available = rows.reduce((s, r) => s + Number(r.available ?? 0), 0);
    const overload = rows.filter((r) => Number(r.available ?? 0) < 0).length;
    return { capacity, allocated, available, overload };
  }, [rows]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Pilotage</h3>
        <p className="text-xs text-muted-foreground">
          Disponibilité du mois. Vue Équipes = somme des collaborateurs rattachés à chaque WorkTeam.
        </p>
      </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor="capa-ym">Mois</Label>
            <div className="flex gap-1">
              <ButtonNav
                label="Mois précédent"
                onClick={() => setYearMonth((ym) => shiftYearMonth(ym, -1))}
              >
                ‹
              </ButtonNav>
              <Input
                id="capa-ym"
                type="month"
                className="min-h-11 w-[11rem]"
                value={yearMonth}
                onChange={(e) => setYearMonth(e.target.value)}
              />
              <ButtonNav
                label="Mois suivant"
                onClick={() => setYearMonth((ym) => shiftYearMonth(ym, 1))}
              >
                ›
              </ButtonNav>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Vue agrégats">
        {(
          [
            ['portfolio', 'Portefeuille'],
            ['work-teams', 'Équipes'],
            ['resources', 'Ressources'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={view === id}
            className={cn(
              'min-h-11 rounded-md border px-4 text-sm focus-visible:ring-2 focus-visible:ring-ring',
              view === id ? 'bg-primary text-primary-foreground' : 'bg-background',
            )}
            onClick={() => setView(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex min-h-11 items-center gap-3">
        <Switch
          id="capa-include-archived"
          checked={includeArchived}
          onCheckedChange={setIncludeArchived}
        />
        <Label htmlFor="capa-include-archived">Inclure WorkTeams archivées</Label>
      </div>

      {kpi ? (
        <div
          className="grid grid-cols-2 gap-2 sm:grid-cols-4"
          aria-live="polite"
          aria-label="Indicateurs capacité"
        >
          <Kpi label="Capacité" value={kpi.capacity} />
          <Kpi label="Alloué" value={kpi.allocated} />
          <Kpi label="Disponible" value={kpi.available} tone={kpi.available < 0 ? 'warn' : 'ok'} />
          <Kpi
            label="Surcharges"
            value={kpi.overload}
            tone={kpi.overload > 0 ? 'warn' : 'ok'}
            suffix={kpi.overload === 1 ? ' ligne' : ' lignes'}
          />
        </div>
      ) : null}

      {dash.isLoading ? <LoadingState rows={2} /> : null}
      {dash.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{(dash.error as Error)?.message ?? 'Échec'}</AlertDescription>
        </Alert>
      ) : null}
      {!dash.isLoading && (rows?.length ?? 0) === 0 ? (
        <EmptyState
          title="Aucune donnée"
          description="Générez le calendrier (Réglages) puis créez des affectations."
        />
      ) : null}

      {(rows?.length ?? 0) > 0 ? (
        <>
          <div className="hidden overflow-x-auto rounded-md border md:block">
            <table className="w-full min-w-[360px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="p-3 font-medium">Libellé</th>
                  <th className="p-3 font-medium">Capacité</th>
                  <th className="p-3 font-medium">Alloué</th>
                  <th className="p-3 font-medium">Disponible</th>
                </tr>
              </thead>
              <tbody>
                {rows!.map((r, idx) => {
                  const label =
                    'label' in r && r.label
                      ? r.label
                      : view === 'portfolio'
                        ? (r as CapacityPortfolioSummary).yearMonth
                        : (r as CapacityDashboardRow).id;
                  const avail = Number(r.available ?? 0);
                  return (
                    <tr key={`${label}-${idx}`} className="border-b">
                      <td className="p-3">{label}</td>
                      <td className="p-3">{formatCapacityDays(r.capacity)}</td>
                      <td className="p-3">{formatCapacityDays(r.allocated)}</td>
                      <td className="p-3">
                        {formatCapacityDays(r.available)}
                        {avail < 0 ? (
                          <span className="ml-2 text-xs font-medium text-destructive">
                            Surcharge
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <ul className="flex flex-col gap-2 md:hidden" aria-label="Agrégats capacité">
            {rows!.map((r, idx) => {
              const label =
                'label' in r && r.label
                  ? r.label
                  : view === 'portfolio'
                    ? (r as CapacityPortfolioSummary).yearMonth
                    : (r as CapacityDashboardRow).id;
              const avail = Number(r.available ?? 0);
              return (
                <li key={`${label}-m-${idx}`} className="rounded-md border p-3 text-sm">
                  <div className="font-medium">{label}</div>
                  <div className="mt-1 text-muted-foreground">
                    Cap. {formatCapacityDays(r.capacity)} · Alloué{' '}
                    {formatCapacityDays(r.allocated)} · Dispo {formatCapacityDays(r.available)}
                    {avail < 0 ? ' — Surcharge' : ''}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
    </div>
  );
}

function Kpi({
  label,
  value,
  tone = 'ok',
  suffix = ' J/H',
}: {
  label: string;
  value: number;
  tone?: 'ok' | 'warn';
  suffix?: string;
}) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={cn(
          'mt-1 text-lg font-semibold tabular-nums',
          tone === 'warn' && 'text-destructive',
        )}
      >
        {Number.isInteger(value) ? value : value.toFixed(1)}
        <span className="text-xs font-normal text-muted-foreground">{suffix}</span>
      </div>
    </div>
  );
}

function ButtonNav({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="border-input bg-background hover:bg-muted min-h-11 min-w-11 rounded-md border text-lg"
      onClick={onClick}
    >
      {children}
    </button>
  );
}
