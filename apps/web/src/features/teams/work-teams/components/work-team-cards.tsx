'use client';

import Link from 'next/link';
import { CalendarDays, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/feedback/empty-state';
import { RegistryBadge } from '@/lib/ui/registry-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { buttonVariants } from '@/components/ui/button';
import {
  UserInitialsAvatar,
  UserInitialsAvatarStack,
} from '@/components/ui/user-initials-avatar';
import { cn } from '@/lib/utils';
import { workloadBand, type WorkloadBand } from '@/features/capacity/lib/resource-workload';
import type { WorkTeamLoadRow } from '@/features/capacity/types/capacity.types';
import type { WorkTeamSummaryDto } from '../api/work-teams.api';

const BAND_TEXT_CLASS: Record<WorkloadBand, string> = {
  overload: 'text-destructive',
  warning: 'text-[color:var(--brand-gold-700)]',
  low: 'text-[color:var(--state-success)]',
  none: 'text-muted-foreground',
};

const TEAM_ROLE_LABEL: Record<'LEAD' | 'DEPUTY', string> = {
  LEAD: 'Responsable',
  DEPUTY: 'Adjoint',
};

function Stat({
  value,
  label,
  valueClassName,
}: {
  value: string;
  label: string;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0 text-center">
      <div className={cn('text-lg font-extrabold tabular-nums', valueClassName)}>{value}</div>
      <div className="truncate text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

function WorkTeamCard({
  team,
  load,
  canReadCapacity,
}: {
  team: WorkTeamSummaryDto;
  load: WorkTeamLoadRow | undefined;
  canReadCapacity: boolean;
}) {
  const band = workloadBand(load?.loadPercent ?? null);
  const subtitle = [team.strategicDirectionName ?? team.parentName, `${team.memberCount} membre${team.memberCount > 1 ? 's' : ''}`]
    .filter(Boolean)
    .join(' · ');

  return (
    <Card size="sm" className="starium-panel flex flex-col overflow-hidden border border-border shadow-sm">
      <CardContent className="flex flex-1 flex-col gap-3 pt-3">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-[color:var(--state-info-bg)] text-[color:var(--state-info)]"
          >
            <Users className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-foreground" title={team.name}>
              {team.name}
            </p>
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          </div>
          {team.status !== 'ACTIVE' && (
            <RegistryBadge className="border-border/70 bg-muted/40 text-foreground">
              Archivée
            </RegistryBadge>
          )}
        </div>

        {team.leads.length > 0 ? (
          <div className="space-y-1.5 rounded-lg border border-border/70 bg-muted/30 p-2.5">
            <p className="starium-overline text-muted-foreground">
              {team.leads.length > 1 ? 'Responsables' : 'Responsable'}
            </p>
            <ul className="space-y-1.5">
              {team.leads.map((lead) => (
                <li key={lead.resourceId} className="flex items-center gap-2">
                  <UserInitialsAvatar
                    displayName={lead.displayName}
                    seed={lead.resourceId}
                    size="sm"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-bold text-foreground">
                      {lead.displayName}
                    </span>
                    {lead.roleName && (
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {lead.roleName}
                      </span>
                    )}
                  </span>
                  <RegistryBadge
                    className={
                      lead.teamRole === 'LEAD'
                        ? 'border-[color:var(--brand-gold-100)] bg-[color:var(--brand-gold-050)] text-[color:var(--brand-gold-700)]'
                        : 'border-border/70 bg-muted/40 text-foreground'
                    }
                  >
                    {TEAM_ROLE_LABEL[lead.teamRole as 'LEAD' | 'DEPUTY']}
                  </RegistryBadge>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-border/80 p-2.5 text-xs text-muted-foreground">
            Aucun responsable désigné.
          </p>
        )}

        {team.members.length > 0 && (
          <UserInitialsAvatarStack
            members={team.members.map((m) => ({
              id: m.resourceId,
              displayName: m.displayName,
              seed: m.resourceId,
            }))}
            max={5}
            size="sm"
            className="justify-start -space-x-2"
            listLabel={`${team.memberCount} membre${team.memberCount > 1 ? 's' : ''} de l'équipe ${team.name}`}
          />
        )}

        <div className="mt-auto grid grid-cols-3 gap-2 border-t border-border/60 pt-2.5">
          <Stat value={String(team.memberCount)} label="Membres" />
          <Stat
            value={canReadCapacity ? String(load?.projectCount ?? 0) : '—'}
            label="Projets"
          />
          <Stat
            value={
              canReadCapacity && load?.loadPercent != null ? `${load.loadPercent} %` : '—'
            }
            label="Charge"
            valueClassName={canReadCapacity ? BAND_TEXT_CLASS[band] : undefined}
          />
        </div>

        <Link
          href={`/teams/capacity?workTeamId=${encodeURIComponent(team.id)}`}
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'w-full gap-1.5')}
        >
          <CalendarDays className="size-4" aria-hidden />
          Voir le plan de charge
        </Link>
      </CardContent>
    </Card>
  );
}

export function WorkTeamCards({
  teams,
  loads,
  isLoading,
  canReadCapacity,
}: {
  teams: WorkTeamSummaryDto[] | undefined;
  loads: WorkTeamLoadRow[] | undefined;
  isLoading: boolean;
  canReadCapacity: boolean;
}) {
  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-80 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!teams || teams.length === 0) {
    return (
      <Card size="sm" className="border border-dashed border-border/80 shadow-sm">
        <CardContent className="py-10">
          <EmptyState
            title="Aucune équipe"
            description="Créez une équipe pour organiser vos ressources et suivre leur plan de charge."
            action={
              <Link
                href="/teams/structure/teams"
                className={cn(buttonVariants({ variant: 'default', size: 'sm' }))}
              >
                Gérer la structure
              </Link>
            }
          />
        </CardContent>
      </Card>
    );
  }

  const loadByTeam = new Map((loads ?? []).map((row) => [row.workTeamId, row]));

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {teams.map((team) => (
        <WorkTeamCard
          key={team.id}
          team={team}
          load={loadByTeam.get(team.id)}
          canReadCapacity={canReadCapacity}
        />
      ))}
    </div>
  );
}
