'use client';

import { useState } from 'react';
import { History } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/feedback/empty-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { cn } from '@/lib/utils';
import { useProjectAuditHistory } from '../hooks/use-project-audit-history';
import { ProjectAuditHistoryTimelineItem } from './project-audit-history-timeline-item';
import {
  DEFAULT_TASK_PAGE_SIZE,
  ProjectTasksPagination,
} from './project-tasks-pagination';

type HistoryLocale = 'fr' | 'en';

const COPY: Record<
  HistoryLocale,
  {
    title: string;
    description: string;
    errorTitle: string;
    errorDescription: string;
    emptyTitle: string;
    emptyDescription: string;
    unknownAuthor: string;
    fallbackAction: string;
    actions: Record<string, string>;
  }
> = {
  fr: {
    title: 'Historique des modifications',
    description:
      'Derniers changements audités sur le projet, affichés du plus récent au plus ancien.',
    errorTitle: 'Historique indisponible',
    errorDescription: 'Impossible de charger l’historique des modifications pour le moment.',
    emptyTitle: 'Aucune modification',
    emptyDescription: 'Aucun événement d’historique n’a encore été enregistré sur ce projet.',
    unknownAuthor: 'Auteur inconnu',
    fallbackAction: 'Modification du projet',
    actions: {
      'project.updated': 'Projet mis à jour',
      'project.parent.assigned': 'Projet parent rattaché',
      'project.parent.changed': 'Projet parent modifié',
      'project.parent.detached': 'Projet parent retiré',
      'project.status.updated': 'Statut du projet modifié',
      'project.owner.updated': 'Responsable modifié',
      'project.sheet.updated': 'Fiche projet mise à jour',
    },
  },
  en: {
    title: 'Modification history',
    description: 'Latest audited changes on this project, newest first.',
    errorTitle: 'History unavailable',
    errorDescription: 'Unable to load modification history right now.',
    emptyTitle: 'No modifications',
    emptyDescription: 'No history events have been recorded for this project yet.',
    unknownAuthor: 'Unknown author',
    fallbackAction: 'Project change',
    actions: {
      'project.updated': 'Project updated',
      'project.parent.assigned': 'Parent project assigned',
      'project.parent.changed': 'Parent project changed',
      'project.parent.detached': 'Parent project removed',
      'project.status.updated': 'Project status updated',
      'project.owner.updated': 'Owner updated',
      'project.sheet.updated': 'Project sheet updated',
    },
  },
};

function actionLabel(action: string, locale: HistoryLocale): string {
  return COPY[locale].actions[action] ?? COPY[locale].fallbackAction;
}

export function ProjectAuditHistorySection({
  projectId,
  locale = 'fr',
}: {
  projectId: string;
  locale?: HistoryLocale;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_TASK_PAGE_SIZE);
  const offset = (page - 1) * pageSize;
  const historyQuery = useProjectAuditHistory(projectId, { limit: pageSize, offset });
  const copy = COPY[locale];
  const total = historyQuery.data?.total ?? 0;
  const items = historyQuery.data?.items ?? [];
  const showPagination = total > 0;

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="size-4 shrink-0" aria-hidden />
          {copy.title}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{copy.description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {historyQuery.isLoading && !historyQuery.data ? (
          <LoadingState rows={4} />
        ) : historyQuery.isError ? (
          <Alert variant="destructive" className="border-destructive/40">
            <AlertTitle>{copy.errorTitle}</AlertTitle>
            <AlertDescription>{copy.errorDescription}</AlertDescription>
          </Alert>
        ) : items.length === 0 ? (
          <EmptyState
            title={copy.emptyTitle}
            description={copy.emptyDescription}
            className="rounded-lg border border-border/60 bg-muted/10 px-4 py-8 text-center"
          />
        ) : (
          <ul
            className={cn('space-y-0', historyQuery.isFetching && 'opacity-70')}
            aria-busy={historyQuery.isFetching}
            aria-label={copy.title}
          >
            {items.map((item, index) => (
              <ProjectAuditHistoryTimelineItem
                key={item.id}
                item={item}
                locale={locale}
                actionLabel={actionLabel(item.action, locale)}
                unknownAuthor={copy.unknownAuthor}
                isLast={index === items.length - 1}
              />
            ))}
          </ul>
        )}

        {showPagination ? (
          <ProjectTasksPagination
            total={total}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
            entityLabel="modifications"
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
