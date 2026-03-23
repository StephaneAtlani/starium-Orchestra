'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { IndentDecrease, IndentIncrease } from 'lucide-react';
import {
  computeIndentPatch,
  computeOutdentPatch,
} from '../lib/project-task-indent';
import type { TaskTreeRow, TaskTreeSource } from '../lib/project-task-tree';

export type TaskIndentActionsProps = {
  displayedRows: TaskTreeRow<TaskTreeSource>[];
  taskId: string;
  isPending: boolean;
  onIndent: (taskId: string) => void;
  onOutdent: (taskId: string) => void;
  /** Variante compacte (sidebar Gantt). */
  compact?: boolean;
  className?: string;
};

/**
 * Indenter / désindenter — mêmes libellés accessibles, mêmes désactivations (parité table / Gantt).
 */
export function TaskIndentActions({
  displayedRows,
  taskId,
  isPending,
  onIndent,
  onOutdent,
  compact = false,
  className,
}: TaskIndentActionsProps) {
  const canIndent = computeIndentPatch(displayedRows, taskId) !== null;
  const canOutdent = computeOutdentPatch(displayedRows, taskId) !== null;

  const btnClass = compact ? 'h-7 w-7 shrink-0 p-0' : 'h-8 w-8 shrink-0 p-0';

  return (
    <div
      className={cn('inline-flex items-center gap-0.5', className)}
      role="group"
      aria-label="Hiérarchie de la tâche"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={btnClass}
        disabled={!canIndent || isPending}
        aria-label="Indenter la tâche"
        title="Indenter"
        onClick={() => onIndent(taskId)}
      >
        <IndentIncrease className="size-3.5" aria-hidden />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={btnClass}
        disabled={!canOutdent || isPending}
        aria-label="Désindenter la tâche"
        title="Désindenter"
        onClick={() => onOutdent(taskId)}
      >
        <IndentDecrease className="size-3.5" aria-hidden />
      </Button>
    </div>
  );
}
