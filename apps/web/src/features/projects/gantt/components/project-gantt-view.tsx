'use client';

import type { ReactNode } from 'react';

/**
 * En-tête projet (données normalisées API) — cockpit Gantt.
 * Le panneau reste le point d’entrée ; ce composant isole l’affichage résumé.
 */
export function GanttProjectBanner({
  name,
  status,
  plannedStartDate,
  plannedEndDate,
}: {
  name: string;
  status: string;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
}) {
  const fmt = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : '—';

  return (
    <div className="bg-muted/15 border-border/50 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b px-3 py-2 text-xs">
      <span className="font-semibold text-foreground">{name}</span>
      <span className="text-muted-foreground">{status}</span>
      <span className="text-muted-foreground tabular-nums">
        {fmt(plannedStartDate)} → {fmt(plannedEndDate)}
      </span>
    </div>
  );
}

/** Shell d’orchestration : bannière optionnelle + contenu (extractions futures sans casser le panel). */
export function ProjectGanttView({
  banner,
  children,
}: {
  banner?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      {banner}
      {children}
    </>
  );
}
