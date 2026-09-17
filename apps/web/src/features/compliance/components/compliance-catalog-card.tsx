'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { firstDisplayLabel } from '@/lib/display-label';

export type ComplianceCatalogCardModel = {
  id: string;
  name: string;
  version: string;
  description?: string | null;
  provider?: string | null;
  requirementCount: number;
  domainCount: number;
  familyLabel: string;
  isActive?: boolean;
};

type ComplianceCatalogCardProps = {
  item: ComplianceCatalogCardModel;
  /** Catalogue plateforme : Activer / Réactiver / Déjà activé */
  catalogAction?: {
    kind: 'activated' | 'activate' | 'reactivate';
    pending?: boolean;
    onActivate?: () => void;
  };
  /** Instance client : Voir + Désactiver / Réactiver */
  clientActions?: {
    pending?: boolean;
    onToggleActive?: () => void;
  };
};

export function ComplianceCatalogCard({
  item,
  catalogAction,
  clientActions,
}: ComplianceCatalogCardProps) {
  const title = firstDisplayLabel([item.name], 'Référentiel');
  const description =
    item.description?.trim() ||
    'Aucun résumé de périmètre.';
  const counts = [
    `${item.requirementCount} exigence${item.requirementCount > 1 ? 's' : ''}`,
    item.domainCount > 0
      ? `${item.domainCount} domaine${item.domainCount > 1 ? 's' : ''}`
      : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Badge variant="secondary">{item.familyLabel}</Badge>
            {item.provider ? (
              <span className="text-xs text-muted-foreground">
                {item.provider}
              </span>
            ) : null}
            {item.isActive === false ? (
              <Badge variant="outline">Inactif</Badge>
            ) : null}
          </div>
          <div>
            {clientActions ? (
              <Link
                href={`/compliance/frameworks/${item.id}`}
                className="font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {title}{' '}
                <span className="text-muted-foreground">({item.version})</span>
              </Link>
            ) : (
              <p className="font-medium">
                {title}{' '}
                <span className="text-muted-foreground">({item.version})</span>
              </p>
            )}
            <p
              className="mt-1 line-clamp-2 text-sm text-muted-foreground"
              title={description}
            >
              {description}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{counts}</p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {catalogAction?.kind === 'activated' ? (
            <Badge variant="secondary">Déjà activé</Badge>
          ) : null}
          {catalogAction && catalogAction.kind !== 'activated' ? (
            <Button
              type="button"
              size="sm"
              className="min-h-11 sm:min-h-9"
              disabled={catalogAction.pending}
              onClick={catalogAction.onActivate}
            >
              {catalogAction.kind === 'reactivate' ? 'Réactiver' : 'Activer'}
            </Button>
          ) : null}
          {clientActions ? (
            <>
              <Link
                href={`/compliance/frameworks/${item.id}`}
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'sm' }),
                  'min-h-11 sm:min-h-9',
                )}
              >
                Voir
              </Link>
              <Button
                type="button"
                variant={item.isActive ? 'outline' : 'default'}
                size="sm"
                className="min-h-11 sm:min-h-9"
                disabled={clientActions.pending}
                onClick={clientActions.onToggleActive}
              >
                {item.isActive ? 'Désactiver' : 'Réactiver'}
              </Button>
            </>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
