'use client';

import Link from 'next/link';
import { CalendarPlus, ChevronLeft } from 'lucide-react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PermissionGate } from '@/components/PermissionGate';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { buttonVariants } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/use-permissions';
import { GovernanceCyclesCalendarPage } from '@/features/governance-cycles/components/governance-cycles-calendar-page';
import { projectsList } from '@/features/projects/constants/project-routes';

function CyclesCalendarRouteInner() {
  const { has, isSuccess: permsSuccess } = usePermissions();
  const canRead = has('governance_cycles.read');

  if (!canRead && permsSuccess) {
    return (
      <PageContainer>
        <Alert>
          <AlertDescription>
            Permission <code className="text-xs">governance_cycles.read</code> requise.
          </AlertDescription>
        </Alert>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        title="Calendrier de gouvernance"
        description="Points projet et instances de cycle du client actif."
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Link
              href="/cycles"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                'min-h-11 justify-center gap-1.5 sm:min-h-0',
              )}
            >
              <ChevronLeft className="size-4" aria-hidden />
              Cycles
            </Link>
            <PermissionGate permission="projects.update">
              <Link
                href={projectsList()}
                className={cn(
                  buttonVariants({ size: 'sm' }),
                  'min-h-11 justify-center gap-1.5 sm:min-h-0',
                )}
              >
                <CalendarPlus className="size-4" aria-hidden />
                Créer un point
              </Link>
            </PermissionGate>
          </div>
        }
      />
      <GovernanceCyclesCalendarPage />
    </PageContainer>
  );
}

export default function CyclesCalendarRoutePage() {
  return (
    <RequireActiveClient>
      <CyclesCalendarRouteInner />
    </RequireActiveClient>
  );
}
