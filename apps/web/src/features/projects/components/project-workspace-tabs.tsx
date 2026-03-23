'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { CalendarRange, ClipboardList, LayoutDashboard, Layers3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { projectDetail, projectPlanning, projectSheet } from '../constants/project-routes';

function tabLinkClass(active: boolean) {
  return cn(
    'group relative inline-flex h-[calc(100%-1px)] min-h-9 flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-1.5 py-0.5 text-sm font-medium whitespace-nowrap transition-all',
    'hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:size-4',
    active
      ? 'bg-background font-semibold text-foreground shadow-sm [&_svg]:opacity-100'
      : 'text-foreground/60 [&_svg]:opacity-70',
  );
}

const tablistClassName =
  'grid h-11 min-w-[min(100%,22rem)] grid-cols-2 gap-1 rounded-xl bg-muted/90 p-1 shadow-inner ring-1 ring-border/40 sm:min-w-0 sm:grid-cols-4';

/**
 * Navigation principale projet : Synthèse · Fiche projet · Planning · Points projet.
 * À placer dans un `CardHeader` (même structure que le détail : `Card` + header dégradé).
 */
export function ProjectWorkspaceTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');
  const isSheet = pathname?.includes('/sheet');
  const isPlanning = pathname?.includes('/planning');
  const isPoints = tab === 'points';
  const isSynth = !isSheet && !isPoints && !isPlanning;

  const detailHref = projectDetail(projectId);
  const pointsHref = `${detailHref}?tab=points`;
  const planningHref = projectPlanning(projectId);

  return (
    <div className="min-w-0 overflow-x-auto [-webkit-overflow-scrolling:touch]">
      <div
        role="tablist"
        aria-label="Navigation projet"
        className={tablistClassName}
      >
      <Link
        href={detailHref}
        role="tab"
        aria-current={isSynth ? 'page' : undefined}
        className={tabLinkClass(isSynth)}
      >
        <LayoutDashboard className="size-4 shrink-0 opacity-70" />
        Synthèse
      </Link>
      <Link
        href={projectSheet(projectId)}
        role="tab"
        aria-current={isSheet ? 'page' : undefined}
        className={tabLinkClass(isSheet)}
      >
        <Layers3 className="size-4 shrink-0 opacity-70" />
        Fiche projet
      </Link>
      <Link
        href={planningHref}
        role="tab"
        aria-current={isPlanning ? 'page' : undefined}
        className={tabLinkClass(isPlanning)}
      >
        <CalendarRange className="size-4 shrink-0 opacity-70" />
        Planning
      </Link>
      <Link
        href={pointsHref}
        role="tab"
        aria-current={isPoints ? 'page' : undefined}
        className={tabLinkClass(isPoints)}
      >
        <ClipboardList className="size-4 shrink-0 opacity-70" />
        Points projet
      </Link>
      </div>
    </div>
  );
}
