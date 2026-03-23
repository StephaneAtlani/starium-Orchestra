import { TASK_PRIORITY_LABEL, TASK_STATUS_LABEL } from '../constants/project-enum-labels';
import type { TaskTreeRow, TaskTreeSource } from './project-task-tree';
import type { ProjectTaskApi } from '../types/project.types';

/** Mode de coloration des barres sur la frise Gantt. */
export type GanttBarColorMode = 'default' | 'priority' | 'status' | 'group';

export type GanttBarTone = {
  track: string;
  progress: string;
  handleLeft: string;
  handleRight: string;
  linkPort: string;
};

const PRIMARY: GanttBarTone = {
  track: 'bg-primary/15',
  progress: 'bg-primary/75',
  handleLeft:
    'bg-primary/35 hover:bg-primary/55 border-r border-primary/30',
  handleRight:
    'bg-primary/35 hover:bg-primary/55 border-l border-primary/30',
  linkPort: 'bg-primary/10 hover:bg-primary/25 border-y border-primary/20',
};

/** Ton par défaut (exporté pour `ProjectGanttTaskBar`). */
export const GANTT_BAR_TONE_DEFAULT: GanttBarTone = PRIMARY;

/** Priorité tâche RFC-PROJ-011 */
const PRIORITY: Record<string, GanttBarTone> = {
  LOW: {
    track: 'bg-slate-400/15',
    progress: 'bg-slate-500/75',
    handleLeft:
      'bg-slate-400/35 hover:bg-slate-400/55 border-r border-slate-500/30',
    handleRight:
      'bg-slate-400/35 hover:bg-slate-400/55 border-l border-slate-500/30',
    linkPort: 'bg-slate-400/10 hover:bg-slate-400/25 border-y border-slate-500/20',
  },
  MEDIUM: PRIMARY,
  HIGH: {
    track: 'bg-amber-500/15',
    progress: 'bg-amber-600/85',
    handleLeft:
      'bg-amber-500/40 hover:bg-amber-500/60 border-r border-amber-600/35',
    handleRight:
      'bg-amber-500/40 hover:bg-amber-500/60 border-l border-amber-600/35',
    linkPort: 'bg-amber-500/10 hover:bg-amber-500/25 border-y border-amber-600/25',
  },
  CRITICAL: {
    track: 'bg-destructive/15',
    progress: 'bg-destructive/80',
    handleLeft:
      'bg-destructive/40 hover:bg-destructive/60 border-r border-destructive/35',
    handleRight:
      'bg-destructive/40 hover:bg-destructive/60 border-l border-destructive/35',
    linkPort:
      'bg-destructive/10 hover:bg-destructive/25 border-y border-destructive/25',
  },
};

const STATUS: Record<string, GanttBarTone> = {
  DRAFT: {
    track: 'bg-muted-foreground/12',
    progress: 'bg-muted-foreground/45',
    handleLeft:
      'bg-muted-foreground/25 hover:bg-muted-foreground/40 border-r border-border/50',
    handleRight:
      'bg-muted-foreground/25 hover:bg-muted-foreground/40 border-l border-border/50',
    linkPort:
      'bg-muted-foreground/8 hover:bg-muted-foreground/18 border-y border-border/30',
  },
  TODO: {
    track: 'bg-sky-500/15',
    progress: 'bg-sky-600/80',
    handleLeft:
      'bg-sky-500/40 hover:bg-sky-500/60 border-r border-sky-600/35',
    handleRight:
      'bg-sky-500/40 hover:bg-sky-500/60 border-l border-sky-600/35',
    linkPort: 'bg-sky-500/10 hover:bg-sky-500/25 border-y border-sky-600/25',
  },
  IN_PROGRESS: PRIMARY,
  BLOCKED: {
    track: 'bg-destructive/15',
    progress: 'bg-destructive/78',
    handleLeft:
      'bg-destructive/40 hover:bg-destructive/58 border-r border-destructive/35',
    handleRight:
      'bg-destructive/40 hover:bg-destructive/58 border-l border-destructive/35',
    linkPort:
      'bg-destructive/10 hover:bg-destructive/25 border-y border-destructive/25',
  },
  DONE: {
    track: 'bg-emerald-500/15',
    progress: 'bg-emerald-600/80',
    handleLeft:
      'bg-emerald-500/40 hover:bg-emerald-500/60 border-r border-emerald-600/35',
    handleRight:
      'bg-emerald-500/40 hover:bg-emerald-500/60 border-l border-emerald-600/35',
    linkPort:
      'bg-emerald-500/10 hover:bg-emerald-500/25 border-y border-emerald-600/25',
  },
  CANCELLED: {
    track: 'bg-muted-foreground/10',
    progress: 'bg-muted-foreground/35',
    handleLeft:
      'bg-muted-foreground/20 hover:bg-muted-foreground/35 border-r border-border/40',
    handleRight:
      'bg-muted-foreground/20 hover:bg-muted-foreground/35 border-l border-border/40',
    linkPort:
      'bg-muted-foreground/8 hover:bg-muted-foreground/15 border-y border-border/25',
  },
};

/** Couleurs cycliques par racine d’arborescence (tâche sans parent dans le lot). */
const GROUP_PALETTE: GanttBarTone[] = [
  {
    track: 'bg-sky-500/15',
    progress: 'bg-sky-600/80',
    handleLeft:
      'bg-sky-500/40 hover:bg-sky-500/60 border-r border-sky-600/35',
    handleRight:
      'bg-sky-500/40 hover:bg-sky-500/60 border-l border-sky-600/35',
    linkPort: 'bg-sky-500/10 hover:bg-sky-500/25 border-y border-sky-600/25',
  },
  {
    track: 'bg-violet-500/15',
    progress: 'bg-violet-600/80',
    handleLeft:
      'bg-violet-500/40 hover:bg-violet-500/60 border-r border-violet-600/35',
    handleRight:
      'bg-violet-500/40 hover:bg-violet-500/60 border-l border-violet-600/35',
    linkPort:
      'bg-violet-500/10 hover:bg-violet-500/25 border-y border-violet-600/25',
  },
  {
    track: 'bg-emerald-500/15',
    progress: 'bg-emerald-600/80',
    handleLeft:
      'bg-emerald-500/40 hover:bg-emerald-500/60 border-r border-emerald-600/35',
    handleRight:
      'bg-emerald-500/40 hover:bg-emerald-500/60 border-l border-emerald-600/35',
    linkPort:
      'bg-emerald-500/10 hover:bg-emerald-500/25 border-y border-emerald-600/25',
  },
  {
    track: 'bg-amber-500/15',
    progress: 'bg-amber-600/85',
    handleLeft:
      'bg-amber-500/40 hover:bg-amber-500/60 border-r border-amber-600/35',
    handleRight:
      'bg-amber-500/40 hover:bg-amber-500/60 border-l border-amber-600/35',
    linkPort:
      'bg-amber-500/10 hover:bg-amber-500/25 border-y border-amber-600/25',
  },
  {
    track: 'bg-rose-500/15',
    progress: 'bg-rose-600/80',
    handleLeft:
      'bg-rose-500/40 hover:bg-rose-500/60 border-r border-rose-600/35',
    handleRight:
      'bg-rose-500/40 hover:bg-rose-500/60 border-l border-rose-600/35',
    linkPort: 'bg-rose-500/10 hover:bg-rose-500/25 border-y border-rose-600/25',
  },
  {
    track: 'bg-cyan-500/15',
    progress: 'bg-cyan-600/80',
    handleLeft:
      'bg-cyan-500/40 hover:bg-cyan-500/60 border-r border-cyan-600/35',
    handleRight:
      'bg-cyan-500/40 hover:bg-cyan-500/60 border-l border-cyan-600/35',
    linkPort: 'bg-cyan-500/10 hover:bg-cyan-500/25 border-y border-cyan-600/25',
  },
  {
    track: 'bg-orange-500/15',
    progress: 'bg-orange-600/80',
    handleLeft:
      'bg-orange-500/40 hover:bg-orange-500/60 border-r border-orange-600/35',
    handleRight:
      'bg-orange-500/40 hover:bg-orange-500/60 border-l border-orange-600/35',
    linkPort:
      'bg-orange-500/10 hover:bg-orange-500/25 border-y border-orange-600/25',
  },
  {
    track: 'bg-fuchsia-500/15',
    progress: 'bg-fuchsia-600/80',
    handleLeft:
      'bg-fuchsia-500/40 hover:bg-fuchsia-500/60 border-r border-fuchsia-600/35',
    handleRight:
      'bg-fuchsia-500/40 hover:bg-fuchsia-500/60 border-l border-fuchsia-600/35',
    linkPort:
      'bg-fuchsia-500/10 hover:bg-fuchsia-500/25 border-y border-fuchsia-600/25',
  },
];

function rootTaskId(
  taskId: string,
  parentById: Map<string, string | null>,
): string {
  let id = taskId;
  const seen = new Set<string>();
  for (let i = 0; i < 256; i++) {
    const p = parentById.get(id);
    if (p == null || p === id || seen.has(id)) return id;
    seen.add(id);
    id = p;
  }
  return id;
}

/** Carte id tâche → id de la racine (premier ancêtre sans parent). */
export function buildTaskRootIdMap(
  tasks: Pick<ProjectTaskApi, 'id' | 'parentTaskId'>[],
): Map<string, string> {
  const parentById = new Map<string, string | null>();
  for (const t of tasks) {
    parentById.set(t.id, t.parentTaskId ?? null);
  }
  const out = new Map<string, string>();
  for (const t of tasks) {
    out.set(t.id, rootTaskId(t.id, parentById));
  }
  return out;
}

/** Ordre stable des racines (ordre d’apparition dans la liste affichée). */
export function orderedRootIdsFromRows<T extends TaskTreeSource>(
  rows: TaskTreeRow<T>[],
  rootIdOf: (taskId: string) => string,
): string[] {
  const order: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const r = rootIdOf(row.id);
    if (!seen.has(r)) {
      seen.add(r);
      order.push(r);
    }
  }
  return order;
}

export function resolveGanttBarTone(
  mode: GanttBarColorMode,
  row: Pick<ProjectTaskApi, 'priority' | 'status' | 'id'>,
  ctx: {
    rootId: string;
    rootIndex: number;
  },
): GanttBarTone {
  if (mode === 'default') return PRIMARY;

  if (mode === 'priority') {
    const p = row.priority ?? 'MEDIUM';
    return PRIORITY[p] ?? PRIORITY.MEDIUM ?? PRIMARY;
  }

  if (mode === 'status') {
    const s = row.status ?? 'TODO';
    return STATUS[s] ?? STATUS.TODO;
  }

  if (mode === 'group') {
    const i = Math.max(0, ctx.rootIndex) % GROUP_PALETTE.length;
    return GROUP_PALETTE[i] ?? PRIMARY;
  }

  return PRIMARY;
}

export type GanttBarLegendItem = {
  id: string;
  label: string;
  /** Classe du segment « avancement » (carré légende) */
  progressClass: string;
  /** Info-bulle optionnelle */
  title?: string;
};

/** Entrées pour la légende sous la barre d’outils Gantt (alignées sur `resolveGanttBarTone`). */
export function getGanttBarLegendItems(mode: GanttBarColorMode): GanttBarLegendItem[] {
  if (mode === 'default') {
    return [
      {
        id: 'default',
        label: 'Thème interface',
        progressClass: PRIMARY.progress,
        title: 'Couleur unique du thème (avancement)',
      },
    ];
  }
  if (mode === 'priority') {
    return (['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map((k) => ({
      id: k,
      label: TASK_PRIORITY_LABEL[k] ?? k,
      progressClass: PRIORITY[k]!.progress,
    }));
  }
  if (mode === 'status') {
    return (
      [
        'DRAFT',
        'TODO',
        'IN_PROGRESS',
        'BLOCKED',
        'DONE',
        'CANCELLED',
      ] as const
    ).map((k) => ({
      id: k,
      label: TASK_STATUS_LABEL[k] ?? k,
      progressClass: STATUS[k]!.progress,
    }));
  }
  if (mode === 'group') {
    return GROUP_PALETTE.map((tone, i) => ({
      id: `g${i}`,
      label: `${i + 1}`,
      progressClass: tone.progress,
      title: `Racine n°${i + 1} dans l’ordre d’affichage (couleurs cycliques)`,
    }));
  }
  return [];
}
