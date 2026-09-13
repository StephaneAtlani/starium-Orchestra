'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { displayLabel } from '@/lib/display-label';
import { cn } from '@/lib/utils';
import { projectDocumentsTab } from '../constants/project-routes';
import { useProjectDocumentsQuery } from '../hooks/use-project-documents-query';
import { projectDocumentTypeLabel } from '../lib/project-document-accept';

/** Résumé fiche projet — le silo complet est l’onglet Documents (RFC-PROJ-DOC-002). */
export function ProjectDocumentsSection({ projectId }: { projectId: string }) {
  const query = useProjectDocumentsQuery(projectId);
  const docs = (query.data ?? []).slice(0, 3);
  const total = query.data?.length ?? 0;
  const tabHref = projectDocumentsTab(projectId);

  return (
    <Card size="sm">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">Documents</CardTitle>
          <p className="text-xs text-muted-foreground">
            Aperçu du registre projet
            {total > 0 ? ` · ${total} document${total > 1 ? 's' : ''}` : ''}.
          </p>
        </div>
        <Link
          href={tabHref}
          className={cn(
            buttonVariants({ variant: 'outline', size: 'sm' }),
            'min-h-11 shrink-0 sm:min-h-9',
          )}
        >
          Voir tous
        </Link>
      </CardHeader>
      <CardContent className="space-y-2">
        {query.isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : query.isError ? (
          <p className="text-sm text-destructive">Impossible de charger les documents.</p>
        ) : docs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun document —{' '}
            <Link href={tabHref} className="text-primary underline-offset-4 hover:underline">
              ouvrir l&apos;onglet Documents
            </Link>
            .
          </p>
        ) : (
          <ul className="divide-y divide-border/60">
            {docs.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <span className="min-w-0 truncate font-medium">
                  {displayLabel(d.name, 'Document sans titre')}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {projectDocumentTypeLabel(d)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
