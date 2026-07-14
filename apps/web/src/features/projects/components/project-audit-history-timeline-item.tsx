'use client';

import { cn } from '@/lib/utils';
import type { ProjectHistoryItem } from '../types/project.types';
import {
  formatProjectHistoryWhen,
  getProjectAuditActionVisual,
  projectAuditActionVerb,
} from '../lib/project-audit-history-utils';
import { ProjectHistoryChangeList } from './project-history-change-list';

type HistoryLocale = 'fr' | 'en';

type ProjectAuditHistoryTimelineItemProps = {
  item: ProjectHistoryItem;
  locale: HistoryLocale;
  actionLabel: string;
  unknownAuthor: string;
  isLast: boolean;
};

export function ProjectAuditHistoryTimelineItem({
  item,
  locale,
  actionLabel,
  unknownAuthor,
  isLast,
}: ProjectAuditHistoryTimelineItemProps) {
  const visual = getProjectAuditActionVisual(item.action);
  const Icon = visual.icon;
  const authorName = item.actorDisplayName ?? unknownAuthor;
  const verb = projectAuditActionVerb(item.action, locale);
  const showSummary =
    item.summary.trim().length > 0 && item.summary.trim() !== actionLabel.trim();
  const whenLabel = formatProjectHistoryWhen(item.createdAt, locale);

  return (
    <li className="relative flex gap-3 sm:gap-4">
      <div className="relative flex w-10 shrink-0 flex-col items-center sm:w-11">
        <div
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-lg sm:size-11',
            visual.iconBgClass,
          )}
          aria-hidden
        >
          <Icon className={cn('size-4 sm:hidden', visual.iconTextClass)} strokeWidth={1.75} />
          <span
            className={cn(
              'hidden text-[0.65rem] font-semibold tracking-wide sm:inline',
              visual.iconTextClass,
            )}
          >
            {visual.abbr}
          </span>
        </div>
        {!isLast ? (
          <span
            aria-hidden
            className="absolute top-11 bottom-0 left-1/2 w-px -translate-x-1/2 bg-border/80 sm:top-12"
          />
        ) : null}
      </div>

      <div className="min-w-0 flex-1 pb-6 last:pb-0">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 text-sm leading-snug">
            <span className="font-semibold text-foreground">{authorName}</span>{' '}
            <span className="text-muted-foreground">{verb}</span>
          </p>
          <span
            aria-hidden
            className={cn('mt-1.5 size-2 shrink-0 rounded-full', visual.dotClass)}
          />
        </div>

        <p className="mt-1 text-sm font-medium leading-snug text-foreground">{actionLabel}</p>

        {showSummary ? (
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.summary}</p>
        ) : null}

        <ProjectHistoryChangeList changes={item.changes ?? []} variant="timeline" />

        <time
          dateTime={item.createdAt}
          className="mt-2 block text-xs text-muted-foreground tabular-nums"
          title={new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', {
            dateStyle: 'medium',
            timeStyle: 'short',
          }).format(new Date(item.createdAt))}
        >
          {whenLabel}
        </time>
      </div>
    </li>
  );
}
