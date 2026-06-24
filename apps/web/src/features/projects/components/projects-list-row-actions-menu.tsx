'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import {
  Calendar,
  ClipboardList,
  LayoutDashboard,
  ListTodo,
  MoreHorizontal,
  ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  projectDetail,
  projectPlanning,
  projectRisks,
  projectSheet,
} from '../constants/project-routes';
import type { ProjectListItem } from '../types/project.types';

export function ProjectsListRowActionsMenu({ project }: { project: ProjectListItem }) {
  const menuRef = useRef<HTMLDetailsElement>(null);
  const detailHref = projectDetail(project.id);
  const pointsHref = `${detailHref}?tab=points`;

  useEffect(() => {
    const el = menuRef.current;
    if (!el) return;

    const closeIfOpen = () => {
      if (el.open) el.open = false;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (!el.open) return;
      const target = e.target as Node | null;
      if (target && el.contains(target)) return;
      closeIfOpen();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !el.open) return;
      closeIfOpen();
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const closeMenu = () => {
    const el = menuRef.current;
    if (el) el.open = false;
  };

  const items = [
    { href: detailHref, label: 'Synthèse', Icon: LayoutDashboard },
    { href: projectSheet(project.id), label: 'Fiche projet', Icon: ClipboardList },
    { href: projectPlanning(project.id), label: 'Planning', Icon: ListTodo },
    { href: pointsHref, label: 'Points projet', Icon: Calendar },
    { href: projectRisks(project.id), label: 'Risques', Icon: ShieldAlert },
  ] as const;

  return (
    <details
      ref={menuRef}
      className="group/details relative shrink-0 group-open/details:z-[120]"
    >
      <summary
        className="inline-flex size-8 list-none cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground [&::-webkit-details-marker]:hidden"
        aria-label={`Actions pour ${project.name}`}
      >
        <MoreHorizontal className="size-4" aria-hidden />
      </summary>
      <div
        className={cn(
          'starium-dropdown-panel starium-dropdown-panel--floating absolute right-0 z-[120] mt-1 min-w-[13rem] rounded-xl py-1.5 text-base shadow-lg',
          'pointer-events-none translate-y-1 scale-[0.98] opacity-0 transition-all duration-150 ease-out',
          'group-open/details:pointer-events-auto group-open/details:translate-y-0 group-open/details:scale-100 group-open/details:opacity-100',
        )}
      >
        {items.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={closeMenu}
            className="flex min-h-11 w-full items-center gap-2.5 px-3.5 py-3 text-left text-base starium-text hover:bg-accent"
          >
            <Icon className="size-[1.125rem] shrink-0 opacity-80" aria-hidden />
            {label}
          </Link>
        ))}
      </div>
    </details>
  );
}
