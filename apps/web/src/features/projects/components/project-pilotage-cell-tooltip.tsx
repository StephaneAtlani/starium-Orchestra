'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { getProjectPilotageSnapshot } from '../api/projects.api';
import { projectQueryKeys } from '../lib/project-query-keys';
import {
  projectPilotageSnapshotNeedsFetch,
  resolveProjectPilotageSnapshot,
} from '../lib/project-pilotage-snapshot-fallback';
import type { ProjectListItem } from '../types/project.types';
import {
  buildProjectSignalsCellTooltip,
  buildProjectTrjCellTooltip,
} from './projects-table-tooltips';
import { cn } from '@/lib/utils';

const TOOLTIP_CONTENT_CLASS =
  'max-w-[14rem] px-2.5 py-2 !block text-left leading-snug [&]:items-start';

type Variant = 'signals' | 'trj';

export function ProjectPilotageCellTooltip({
  project,
  variant,
  children,
  className,
  align = 'start',
}: {
  project: ProjectListItem;
  variant: Variant;
  children: ReactNode;
  className?: string;
  align?: 'start' | 'center' | 'end';
}) {
  const [open, setOpen] = useState(false);
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const needsFetch = projectPilotageSnapshotNeedsFetch(project);

  const { data: fetched } = useQuery({
    queryKey: projectQueryKeys.pilotageSnapshot(clientId, project.id),
    queryFn: async () => {
      try {
        return await getProjectPilotageSnapshot(authFetch, project.id);
      } catch {
        return null;
      }
    },
    enabled: open && needsFetch && Boolean(clientId),
    staleTime: 60_000,
    retry: false,
  });

  const snapshot = resolveProjectPilotageSnapshot(project, fetched ?? undefined);
  const tip =
    variant === 'signals'
      ? buildProjectSignalsCellTooltip(project, snapshot)
      : buildProjectTrjCellTooltip(project, snapshot);

  return (
    <Tooltip open={open} onOpenChange={(nextOpen) => setOpen(nextOpen)}>
      <TooltipTrigger
        render={
          <span
            className={cn('max-w-full cursor-help inline-flex', className)}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side="top" align={align} className={TOOLTIP_CONTENT_CLASS}>
        {tip}
      </TooltipContent>
    </Tooltip>
  );
}
