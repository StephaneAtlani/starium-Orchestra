'use client';

import Link from 'next/link';
import { useEffect, useRef, type ComponentType } from 'react';
import {
  CalendarRange,
  Check,
  Copy,
  MoreHorizontal,
  Pencil,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProjectTaskApi } from '../types/project.types';

type MenuAction = {
  key: string;
  label: string;
  Icon: ComponentType<{ className?: string; strokeWidth?: number; 'aria-hidden'?: boolean }>;
  onClick?: () => void;
  href?: string;
  tone?: 'default' | 'danger';
};

export function ProjectTaskRowActionsMenu({
  task,
  planningHref,
  onEdit,
  onMarkDone,
  onMarkInProgress,
  onDuplicate,
}: {
  task: ProjectTaskApi;
  planningHref: string;
  onEdit: (task: ProjectTaskApi) => void;
  onMarkDone: (task: ProjectTaskApi) => void;
  onMarkInProgress: (task: ProjectTaskApi) => void;
  onDuplicate: (task: ProjectTaskApi) => void;
}) {
  const menuRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const el = menuRef.current;
    if (!el) return;

    const closeIfOpen = () => {
      if (el.open) el.open = false;
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!el.open) return;
      const target = event.target as Node | null;
      if (target && el.contains(target)) return;
      closeIfOpen();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !el.open) return;
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

  const isTerminal = task.status === 'DONE' || task.status === 'CANCELLED';
  const canMarkDone = !isTerminal;
  const canMarkInProgress =
    task.status !== 'IN_PROGRESS' && task.status !== 'DONE' && task.status !== 'CANCELLED';

  const items: MenuAction[] = [
    {
      key: 'edit',
      label: 'Modifier',
      Icon: Pencil,
      onClick: () => onEdit(task),
    },
    ...(canMarkDone
      ? [
          {
            key: 'done',
            label: 'Marquer terminée',
            Icon: Check,
            onClick: () => onMarkDone(task),
          } satisfies MenuAction,
        ]
      : []),
    ...(canMarkInProgress
      ? [
          {
            key: 'progress',
            label: 'Marquer en cours',
            Icon: Zap,
            onClick: () => onMarkInProgress(task),
          } satisfies MenuAction,
        ]
      : []),
    {
      key: 'duplicate',
      label: 'Dupliquer',
      Icon: Copy,
      onClick: () => onDuplicate(task),
    },
    {
      key: 'planning',
      label: 'Voir dans le Gantt',
      Icon: CalendarRange,
      href: planningHref,
    },
  ];

  return (
    <details
      ref={menuRef}
      className="group/details relative inline-block group-open/details:z-[120]"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <summary
        className="starium-dt-dots-btn [&::-webkit-details-marker]:hidden"
        aria-label={`Actions pour ${task.name}`}
      >
        <MoreHorizontal aria-hidden />
      </summary>
      <div
        className={cn(
          'starium-dropdown-panel starium-dropdown-panel--floating starium-dropdown-panel--compact',
          'absolute right-0 z-[120] mt-1 shadow-lg',
          'pointer-events-none translate-y-1 scale-[0.98] opacity-0 transition-all duration-150 ease-out',
          'group-open/details:pointer-events-auto group-open/details:translate-y-0 group-open/details:scale-100 group-open/details:opacity-100',
        )}
        role="menu"
      >
        {items.map((item) => {
          const Icon = item.Icon;
          const showDividerBefore = item.key === 'duplicate';

          return (
            <div key={item.key}>
              {showDividerBefore ? <div className="starium-dropdown-divider" role="separator" /> : null}
              {item.href ? (
                <Link
                  href={item.href}
                  role="menuitem"
                  className="starium-dropdown-item"
                  onClick={closeMenu}
                >
                  <Icon className="shrink-0" strokeWidth={1.75} aria-hidden />
                  {item.label}
                </Link>
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  className={cn(
                    'starium-dropdown-item',
                    item.tone === 'danger' && 'starium-dropdown-item--danger',
                  )}
                  onClick={() => {
                    item.onClick?.();
                    closeMenu();
                  }}
                >
                  <Icon className="shrink-0" strokeWidth={1.75} aria-hidden />
                  {item.label}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </details>
  );
}
