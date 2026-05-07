'use client';

import Link from 'next/link';
import { ArrowRight, Eye, ShieldCheck, Users, UsersRound } from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { KpiCard } from '@/components/ui/kpi-card';
import { useAccessGroups } from '@/features/access-groups/hooks/use-access-groups';
import { useClientMembers } from '@/features/client-rbac/hooks/use-client-members';
import { useModuleVisibilityMatrix } from '@/features/module-visibility/hooks/use-module-visibility-matrix';
import {
  computeAccessCockpitKpis,
  topModulesByOverrides,
} from '../lib/aggregate';
import { ACCESS_COCKPIT_SHORTCUTS } from '../lib/shortcuts';

export function AccessCockpitPage() {
  const groupsQ = useAccessGroups();
  const matrixQ = useModuleVisibilityMatrix();
  const membersQ = useClientMembers();

  const kpis = computeAccessCockpitKpis({
    groups: groupsQ.data,
    matrix: matrixQ.data,
    members: membersQ.data,
  });
  const topModules = topModulesByOverrides(matrixQ.data, 5);

  return (
    <PageContainer>
      <PageHeader
        title="Cockpit accès"
        description="Synthèse des droits, groupes et visibilité modules. Les pages d'administration RFC-ACL-007 restent accessibles via les raccourcis ci-dessous."
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Groupes d'accès"
          value={String(kpis.groupsCount)}
          subtitle={
            kpis.emptyGroupsCount > 0
              ? `${kpis.emptyGroupsCount} sans membre`
              : 'Tous renseignés'
          }
          icon={<UsersRound />}
          variant="dense"
        />
        <KpiCard
          title="Membres dans des groupes"
          value={String(kpis.totalMembers)}
          subtitle="Total appartenance"
          icon={<Users />}
          variant="dense"
        />
        <KpiCard
          title="Modules avec override"
          value={String(kpis.modulesWithOverride)}
          subtitle={`${kpis.overridesUser} utilisateur · ${kpis.overridesGroup} groupe · ${kpis.overridesClient} client`}
          icon={<Eye />}
          variant="dense"
        />
        <KpiCard
          title="Rôles client"
          value={`${kpis.clientAdmins} / ${kpis.clientUsers}`}
          subtitle="Admins / utilisateurs"
          icon={<ShieldCheck />}
          variant="dense"
        />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-medium">
            Modules avec le plus d&apos;exceptions
          </h3>
          {topModules.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Aucun override actif sur les modules.
            </p>
          ) : (
            <ul className="space-y-2">
              {topModules.map((row) => (
                <li
                  key={row.moduleCode}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <span className="font-medium">{row.moduleName}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {row.count} override{row.count > 1 ? 's' : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="mb-3 text-sm font-medium">Raccourcis administration</h3>
          <div className="grid gap-2">
            {ACCESS_COCKPIT_SHORTCUTS.map((s) => {
              const Icon = s.icon;
              return (
                <Link
                  key={s.href}
                  href={s.href}
                  className="group flex items-center gap-3 rounded-md border px-3 py-2 transition-colors hover:bg-muted/50"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-primary">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{s.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.description}
                    </div>
                  </div>
                  <ArrowRight
                    className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </Link>
              );
            })}
          </div>
        </Card>
      </div>

      {(groupsQ.isError || matrixQ.isError || membersQ.isError) && (
        <p className="text-sm text-destructive">
          Une partie des données n&apos;a pu être chargée. Réessayez ou
          consultez les pages dédiées.
        </p>
      )}
    </PageContainer>
  );
}
