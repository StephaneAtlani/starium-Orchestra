'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { ProjectParentSummary } from '../types/project.types';
import { projectDetail } from '../constants/project-routes';

export function ProjectHierarchyBreadcrumb({
  ancestorChain,
  currentName,
}: {
  ancestorChain: ProjectParentSummary[];
  currentName: string;
}) {
  if (ancestorChain.length === 0) return null;

  return (
    <nav aria-label="Fil d'Ariane projet" className="mb-3 min-w-0">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        {ancestorChain.map((ancestor) => (
          <li key={ancestor.id} className="flex min-w-0 items-center gap-1">
            <Link
              href={projectDetail(ancestor.id)}
              className="max-w-[12rem] truncate rounded-sm underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-xs"
            >
              {ancestor.code} — {ancestor.name}
            </Link>
            <ChevronRight className="size-3.5 shrink-0" aria-hidden />
          </li>
        ))}
        <li className="min-w-0 truncate font-medium text-foreground" aria-current="page">
          {currentName}
        </li>
      </ol>
    </nav>
  );
}
