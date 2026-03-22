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
      <span
        className="inline-flex items-center gap-1.5 border-l border-border/50 pl-3"
        title="Sur la ligne d’une tâche parente : fine barre de résumé au-dessus (plage min–max, tâche + sous-tâches affichées), style MS Project"
      >
        <span
          className="h-1.5 w-8 shrink-0 rounded-sm border border-primary/35 bg-primary/20 shadow-sm"
          aria-hidden
        />
        <span>Résumé (au-dessus)</span>
      </span>
    </div>
  );
}
