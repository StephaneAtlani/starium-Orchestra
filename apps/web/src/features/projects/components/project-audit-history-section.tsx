'use client';

import { History } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/feedback/empty-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { useProjectAuditHistory } from '../hooks/use-project-audit-history';

const DEFAULT_PARAMS = { limit: 20, offset: 0 } as const;

const PROJECT_HISTORY_ACTION_LABELS: Record<string, string> = {
  'project.updated': 'Projet mis à jour',
  'project.parent.assigned': 'Projet parent rattaché',
  'project.parent.changed': 'Projet parent modifié',
  'project.parent.detached': 'Projet parent retiré',
  'project.status.updated': 'Statut du projet modifié',
  'project.owner.updated': 'Responsable modifié',
  'project.sheet.updated': 'Fiche projet mise à jour',
};

function actionLabel(action: string): string {
  return PROJECT_HISTORY_ACTION_LABELS[action] ?? 'Modification du projet';
}

function formatHistoryDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function ProjectAuditHistorySection({ projectId }: { projectId: string }) {
  const historyQuery = useProjectAuditHistory(projectId, DEFAULT_PARAMS);

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="size-4 shrink-0" aria-hidden />
          Historique des modifications
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Derniers changements audités sur le projet, affichés du plus récent au plus ancien.
        </p>
      </CardHeader>
      <CardContent>
        {historyQuery.isLoading ? (
          <LoadingState rows={4} />
        ) : historyQuery.isError ? (
          <Alert variant="destructive" className="border-destructive/40">
            <AlertTitle>Historique indisponible</AlertTitle>
            <AlertDescription>
              Impossible de charger l’historique des modifications pour le moment.
            </AlertDescription>
          </Alert>
        ) : (historyQuery.data?.items.length ?? 0) === 0 ? (
          <EmptyState
            title="Aucune modification"
            description="Aucun événement d’historique n’a encore été enregistré sur ce projet."
            className="rounded-lg border border-border/60 bg-muted/10 px-4 py-8 text-center"
          />
        ) : (
          <ul className="divide-y divide-border/60 rounded-lg border border-border/60 bg-muted/10">
            {historyQuery.data?.items.map((item) => (
              <li key={item.id} className="px-4 py-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{actionLabel(item.action)}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.summary}</p>
                  </div>
                  <div className="shrink-0 text-xs text-muted-foreground sm:max-w-[16rem] sm:text-right">
                    <p>{formatHistoryDate(item.createdAt)}</p>
                    <p className="mt-1">{item.actorDisplayName ? `Par ${item.actorDisplayName}` : 'Auteur inconnu'}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
