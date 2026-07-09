'use client';

import Link from 'next/link';
import { ArrowUpRight, Unlink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { FormDialogShell } from '@/components/layout/form-dialog-shell';
import type { StrategicVisionAlertDto } from '../types/strategic-vision.types';
import { extractUnalignedProjectListItems } from '../lib/strategic-unaligned-projects';

export function StrategicUnalignedProjectsDialog({
  open,
  onOpenChange,
  alerts,
  isLoading,
  isError,
  expectedCount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alerts: StrategicVisionAlertDto[] | undefined;
  isLoading: boolean;
  isError: boolean;
  expectedCount: number;
}) {
  const projects = extractUnalignedProjectListItems(alerts);

  return (
    <FormDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Projets non alignés"
      description={`${expectedCount} projet${expectedCount > 1 ? 's' : ''} sans lien objectif sur le périmètre courant.`}
      icon={Unlink}
      size="md"
      footer={
        <Button
          type="button"
          variant="outline"
          className="min-h-11 sm:min-h-9"
          onClick={() => onOpenChange(false)}
        >
          Fermer
        </Button>
      }
    >
      <div aria-live="polite">
        {isLoading ? (
          <div className="space-y-2" aria-busy="true">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        ) : isError ? (
          <ErrorState message="Impossible de charger la liste des projets non alignés." />
        ) : projects.length === 0 ? (
          <EmptyState
            title="Aucun projet à afficher"
            description="Aucun projet non aligné n'a été trouvé pour ce périmètre."
          />
        ) : (
          <ul className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
            {projects.map((project) => (
              <li key={project.projectId} className="border-b border-border/60 last:border-b-0">
                <Link
                  href={`/projects/${project.projectId}`}
                  className="flex min-h-11 items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                  onClick={() => onOpenChange(false)}
                >
                  <span className="min-w-0 truncate">{project.label}</span>
                  <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="sr-only">Ouvrir le projet {project.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </FormDialogShell>
  );
}
