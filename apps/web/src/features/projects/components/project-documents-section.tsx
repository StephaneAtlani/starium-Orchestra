'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RegistryBadge } from '@/lib/ui/registry-badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useProjectDocumentsQuery } from '../hooks/use-project-documents-query';
import {
  PROJECT_DOCUMENT_CATEGORY_LABEL,
  PROJECT_DOCUMENT_STATUS_LABEL,
  PROJECT_DOCUMENT_STORAGE_TYPE_LABEL,
} from '../constants/project-enum-labels';

function formatBytes(bytes: number | null) {
  if (bytes == null || !Number.isFinite(bytes)) return '—';
  const units = ['o', 'Ko', 'Mo', 'Go', 'To'];
  let v = Math.max(0, bytes);
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  const s = i === 0 ? String(Math.round(v)) : v.toFixed(v < 10 ? 1 : 0);
  return `${s} ${units[i]}`;
}

export function ProjectDocumentsSection({ projectId }: { projectId: string }) {
  const query = useProjectDocumentsQuery(projectId);

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-base">Documents</CardTitle>
        <p className="text-xs text-muted-foreground">
          Registre métier (lecture seule) — pas d&apos;upload ni téléchargement dans le MVP.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {query.isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : query.isError ? (
          <p className="text-sm text-destructive">Impossible de charger les documents.</p>
        ) : (query.data?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun document pour ce projet.</p>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead className="hidden md:table-cell">Catégorie</TableHead>
                  <TableHead className="hidden lg:table-cell">Stockage</TableHead>
                  <TableHead className="hidden xl:table-cell">Statut</TableHead>
                  <TableHead className="hidden xl:table-cell text-right">Taille</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data?.map((d) => {
                  const name = d.name?.trim() || 'Sans titre';
                  const categoryLabel = PROJECT_DOCUMENT_CATEGORY_LABEL[d.category] ?? d.category;
                  const storageLabel =
                    PROJECT_DOCUMENT_STORAGE_TYPE_LABEL[d.storageType] ?? d.storageType;
                  const statusLabel = PROJECT_DOCUMENT_STATUS_LABEL[d.status] ?? d.status;
                  return (
                    <TableRow key={d.id} className="align-top">
                      <TableCell className="min-w-0">
                        <div className="min-w-0 space-y-1">
                          <p className="min-w-0 truncate font-medium text-foreground">{name}</p>
                          <div className="flex flex-wrap items-center gap-2 md:hidden">
                            <RegistryBadge className="border border-border text-[11px] text-foreground">
                              {categoryLabel}
                            </RegistryBadge>
                            <RegistryBadge
                              className={cn(
                                'bg-secondary text-secondary-foreground text-[11px]',
                                d.storageType === 'MICROSOFT' && 'opacity-75',
                              )}
                            >
                              {storageLabel}
                            </RegistryBadge>
                            <RegistryBadge className="border border-border text-[11px] text-foreground">
                              {statusLabel}
                            </RegistryBadge>
                          </div>
                          {d.description ? (
                            <p className="line-clamp-2 text-xs text-muted-foreground">
                              {d.description}
                            </p>
                          ) : null}
                          {d.externalUrl ? (
                            <p className="text-xs">
                              <Link
                                href={d.externalUrl}
                                target="_blank"
                                className="text-primary underline-offset-4 hover:underline"
                              >
                                Ouvrir le lien
                              </Link>
                            </p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <RegistryBadge className="border border-border text-xs text-foreground">
                          {categoryLabel}
                        </RegistryBadge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <RegistryBadge
                          className={cn(
                            'bg-secondary text-secondary-foreground text-xs',
                            d.storageType === 'MICROSOFT' && 'opacity-75',
                          )}
                        >
                          {storageLabel}
                        </RegistryBadge>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        <RegistryBadge className="border border-border text-xs text-foreground">
                          {statusLabel}
                        </RegistryBadge>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-right text-sm text-muted-foreground tabular-nums">
                        {formatBytes(d.sizeBytes)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

