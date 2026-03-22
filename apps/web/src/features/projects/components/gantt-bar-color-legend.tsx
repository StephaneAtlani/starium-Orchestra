'use client';

import { cn } from '@/lib/utils';
import {
  getGanttBarLegendItems,
  type GanttBarColorMode,
} from '../lib/gantt-bar-palette';

export function GanttBarColorLegend({ mode }: { mode: GanttBarColorMode }) {
  const items = getGanttBarLegendItems(mode);

  return (
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border/50 bg-muted/15 px-3 py-1.5 text-[10px] leading-tight text-muted-foreground"
      role="list"
      aria-label="Légende des couleurs des barres de tâches"
    >
      <span className="shrink-0 font-medium text-foreground/80">Légende</span>
      {items.map((item) => (
        <span
          key={item.id}
          className="inline-flex items-center gap-1.5"
          role="listitem"
          title={item.title}
        >
          <span
            className={cn(
              'size-2.5 shrink-0 rounded-sm ring-1 ring-border/40',
              item.progressClass,
            )}
            aria-hidden
          />
          <span className="max-w-[8rem] truncate sm:max-w-none">{item.label}</span>
        </span>
      ))}
      {mode === 'group' && (
        <span className="text-[9px] text-muted-foreground/90 italic">
          (ordre des racines dans la liste)
        </span>
      )}
    </div>
  );
}
