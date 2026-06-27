'use client';

import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RegistryBadge } from '@/lib/ui/registry-badge';
import { projectSheet } from '../constants/project-routes';
import { projectWarningLabel } from '../constants/project-enum-labels';
import type { ProjectDetail } from '../types/project.types';

const DANGER_WARNING_CODES = new Set(['PLANNING_DRIFT', 'BLOCKED']);

function warningChipClass(code: string): string {
  if (DANGER_WARNING_CODES.has(code)) {
    return 'border-destructive/35 bg-destructive/[0.08] text-destructive dark:border-destructive/50 dark:bg-destructive/15';
  }
  return 'border-amber-300/80 bg-amber-50 text-foreground dark:border-amber-400/40 dark:bg-amber-100/90';
}

/** Points d’attention pilotage (aperçu projet) — libellés métier, pas les codes API. */
export function ProjectPilotageAttentionPanel({
  projectId,
  project,
}: {
  projectId: string;
  project: ProjectDetail;
}) {
  const warnings = project.warnings ?? [];
  if (warnings.length === 0) return null;

  return (
    <article
      className="starium-card starium-risk-attention"
      role="status"
      aria-live="polite"
      aria-label="Points d'attention pilotage"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <AlertTriangle
            className="size-4 shrink-0 text-[color:var(--state-warning)]"
            strokeWidth={2}
            aria-hidden
          />
          <h2 className="text-sm font-semibold text-foreground">Points d&apos;attention</h2>
        </div>
        <Link href={projectSheet(projectId)} className="starium-ov-btn shrink-0">
          Compléter la fiche projet
        </Link>
      </div>
      <ul className="flex flex-wrap gap-2" role="list">
        {warnings.map((code) => (
          <li key={code}>
            <RegistryBadge className={cn('text-xs', warningChipClass(code))}>
              {projectWarningLabel(code)}
            </RegistryBadge>
          </li>
        ))}
      </ul>
    </article>
  );
}
