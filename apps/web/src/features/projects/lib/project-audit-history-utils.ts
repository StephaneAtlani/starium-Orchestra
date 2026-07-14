import {
  FileText,
  FolderKanban,
  GitBranch,
  Pencil,
  UserRound,
  type LucideIcon,
} from 'lucide-react';

type HistoryLocale = 'fr' | 'en';

export type ProjectAuditActionVisual = {
  abbr: string;
  icon: LucideIcon;
  iconBgClass: string;
  iconTextClass: string;
  dotClass: string;
};

const ACTION_VISUALS: Record<string, ProjectAuditActionVisual> = {
  'project.sheet.updated': {
    abbr: 'FCH',
    icon: FileText,
    iconBgClass: 'bg-rose-500/10',
    iconTextClass: 'text-rose-700 dark:text-rose-400',
    dotClass: 'bg-rose-500',
  },
  'project.status.updated': {
    abbr: 'STT',
    icon: Pencil,
    iconBgClass: 'bg-sky-500/10',
    iconTextClass: 'text-sky-700 dark:text-sky-400',
    dotClass: 'bg-sky-500',
  },
  'project.owner.updated': {
    abbr: 'RSP',
    icon: UserRound,
    iconBgClass: 'bg-emerald-500/10',
    iconTextClass: 'text-emerald-700 dark:text-emerald-400',
    dotClass: 'bg-emerald-600',
  },
  'project.parent.assigned': {
    abbr: 'PAR',
    icon: GitBranch,
    iconBgClass: 'bg-violet-500/10',
    iconTextClass: 'text-violet-700 dark:text-violet-400',
    dotClass: 'bg-violet-500',
  },
  'project.parent.changed': {
    abbr: 'PAR',
    icon: GitBranch,
    iconBgClass: 'bg-violet-500/10',
    iconTextClass: 'text-violet-700 dark:text-violet-400',
    dotClass: 'bg-violet-500',
  },
  'project.parent.detached': {
    abbr: 'PAR',
    icon: GitBranch,
    iconBgClass: 'bg-violet-500/10',
    iconTextClass: 'text-violet-700 dark:text-violet-400',
    dotClass: 'bg-violet-500',
  },
};

const DEFAULT_ACTION_VISUAL: ProjectAuditActionVisual = {
  abbr: 'PRJ',
  icon: FolderKanban,
  iconBgClass: 'bg-amber-500/10',
  iconTextClass: 'text-amber-800 dark:text-amber-400',
  dotClass: 'bg-amber-500',
};

export function getProjectAuditActionVisual(action: string): ProjectAuditActionVisual {
  return ACTION_VISUALS[action] ?? DEFAULT_ACTION_VISUAL;
}

const ACTION_VERBS: Record<HistoryLocale, Record<string, string>> = {
  fr: {
    'project.updated': 'a modifié le projet',
    'project.parent.assigned': 'a rattaché un projet parent',
    'project.parent.changed': 'a modifié le projet parent',
    'project.parent.detached': 'a retiré le projet parent',
    'project.status.updated': 'a modifié le statut',
    'project.owner.updated': 'a modifié le responsable',
    'project.sheet.updated': 'a mis à jour la fiche projet',
  },
  en: {
    'project.updated': 'updated the project',
    'project.parent.assigned': 'assigned a parent project',
    'project.parent.changed': 'changed the parent project',
    'project.parent.detached': 'removed the parent project',
    'project.status.updated': 'updated the status',
    'project.owner.updated': 'updated the owner',
    'project.sheet.updated': 'updated the project sheet',
  },
};

const FALLBACK_VERBS: Record<HistoryLocale, string> = {
  fr: 'a modifié le projet',
  en: 'updated the project',
};

export function projectAuditActionVerb(action: string, locale: HistoryLocale): string {
  return ACTION_VERBS[locale][action] ?? FALLBACK_VERBS[locale];
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function formatProjectHistoryWhen(iso: string, locale: HistoryLocale): string {
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (60 * 1000));
    const diffHours = Math.floor(diffMs / (3600 * 1000));

    if (locale === 'fr') {
      if (diffMinutes < 1) return "À l'instant";
      if (diffMinutes < 60) {
        return diffMinutes === 1 ? 'Il y a 1 min' : `Il y a ${diffMinutes} min`;
      }
      if (diffHours < 24) {
        return diffHours === 1 ? 'Il y a 1 h' : `Il y a ${diffHours} h`;
      }

      const todayStart = startOfLocalDay(now).getTime();
      const dateStart = startOfLocalDay(date).getTime();
      const dayDiff = Math.round((todayStart - dateStart) / (86400 * 1000));

      const time = new Intl.DateTimeFormat('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);

      if (dayDiff === 1) return `Hier à ${time}`;

      const datePart = new Intl.DateTimeFormat('fr-FR', {
        day: 'numeric',
        month: 'short',
      }).format(date);

      return `${datePart} à ${time}`;
    }

    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    if (diffMinutes < 60) return rtf.format(-diffMinutes, 'minute');
    if (diffHours < 24) return rtf.format(-diffHours, 'hour');

    const todayStart = startOfLocalDay(now).getTime();
    const dateStart = startOfLocalDay(date).getTime();
    const dayDiff = Math.round((todayStart - dateStart) / (86400 * 1000));

    const time = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);

    if (dayDiff === 1) return `Yesterday at ${time}`;

    const datePart = new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
    }).format(date);

    return `${datePart} at ${time}`;
  } catch {
    return iso;
  }
}
