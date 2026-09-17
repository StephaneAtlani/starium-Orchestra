'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/auth-context';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { LoadingState } from '@/components/feedback/loading-state';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { displayLabel } from '@/lib/display-label';
import { toast } from '@/lib/toast';

type PlatformRequirement = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  category: string | null;
  sortOrder: number;
};

type PlatformFrameworkDetail = {
  id: string;
  name: string;
  version: string;
  description: string | null;
  provider: string | null;
  isActive: boolean;
  archivedAt: string | null;
  nextAuditAt: string | null;
  createdAt: string;
  updatedAt: string;
  requirements: PlatformRequirement[];
};

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string | string[] };
    if (Array.isArray(body.message)) return body.message.join(', ');
    if (typeof body.message === 'string' && body.message.trim()) return body.message;
  } catch {
    // ignore
  }
  return `Erreur ${res.status}`;
}

export default function AdminComplianceFrameworkDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const frameworkId = params.id;
  const { user, isLoading: authLoading } = useAuth();
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (user?.platformRole !== 'PLATFORM_ADMIN') {
      router.replace('/dashboard');
    }
  }, [authLoading, user, router]);

  const detailQuery = useQuery({
    queryKey: ['platform', 'compliance-frameworks', frameworkId],
    queryFn: async () => {
      const res = await authFetch(
        `/api/platform/compliance/frameworks/${frameworkId}`,
      );
      if (!res.ok) throw new Error(await parseError(res));
      return res.json() as Promise<PlatformFrameworkDetail>;
    },
    enabled: user?.platformRole === 'PLATFORM_ADMIN' && Boolean(frameworkId),
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({
      queryKey: ['platform', 'compliance-frameworks'],
    });
  };

  const setActiveMut = useMutation({
    mutationFn: async (isActive: boolean) => {
      const res = await authFetch(
        `/api/platform/compliance/frameworks/${frameworkId}`,
        {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ isActive }),
        },
      );
      if (!res.ok) throw new Error(await parseError(res));
      return res.json();
    },
    onSuccess: async (_data, isActive) => {
      toast.success(
        isActive ? 'Référentiel proposé aux clients' : 'Référentiel désactivé',
      );
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const archiveMut = useMutation({
    mutationFn: async () => {
      const res = await authFetch(
        `/api/platform/compliance/frameworks/${frameworkId}/archive`,
        { method: 'POST' },
      );
      if (!res.ok) throw new Error(await parseError(res));
      return res.json();
    },
    onSuccess: async () => {
      toast.success('Référentiel archivé');
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const restoreMut = useMutation({
    mutationFn: async () => {
      const res = await authFetch(
        `/api/platform/compliance/frameworks/${frameworkId}/restore`,
        { method: 'POST' },
      );
      if (!res.ok) throw new Error(await parseError(res));
      return res.json();
    },
    onSuccess: async () => {
      toast.success('Référentiel restauré (proposé)');
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filteredRequirements = useMemo(() => {
    const rows = detailQuery.data?.requirements ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const hay = [r.code, r.title, r.description, r.category]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [detailQuery.data?.requirements, search]);

  const requirementGroups = useMemo(() => {
    const map = new Map<string, PlatformRequirement[]>();
    for (const req of filteredRequirements) {
      const key = req.category?.trim() || '';
      const list = map.get(key);
      if (list) list.push(req);
      else map.set(key, [req]);
    }
    const labels = [...map.keys()].sort((a, b) => {
      if (!a) return 1;
      if (!b) return -1;
      return a.localeCompare(b, 'fr');
    });
    return labels.map((key) => ({
      key: key || '__uncategorized__',
      label: key || 'Sans catégorie',
      rows: map.get(key) ?? [],
    }));
  }, [filteredRequirements]);

  if (authLoading || user?.platformRole !== 'PLATFORM_ADMIN') {
    return authLoading ? (
      <PageContainer>
        <LoadingState rows={4} />
      </PageContainer>
    ) : null;
  }

  if (detailQuery.isLoading) {
    return (
      <PageContainer>
        <LoadingState rows={6} />
      </PageContainer>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <PageContainer>
        <ErrorState
          message={
            detailQuery.error instanceof Error
              ? detailQuery.error.message
              : 'Référentiel introuvable'
          }
          onRetry={() => void detailQuery.refetch()}
        />
        <Link
          href="/admin/compliance-frameworks"
          className={cn(buttonVariants({ variant: 'outline' }), 'mt-4 inline-flex')}
        >
          Retour au catalogue
        </Link>
      </PageContainer>
    );
  }

  const fw = detailQuery.data;
  const archived = Boolean(fw.archivedAt);
  const statusLabel = archived ? 'Archivé' : fw.isActive ? 'Proposé' : 'Inactif';
  const busy =
    setActiveMut.isPending || archiveMut.isPending || restoreMut.isPending;

  return (
    <PageContainer>
      <PageHeader
        title={fw.name}
        description={`Version ${fw.version} · ${fw.requirements.length} exigence${
          fw.requirements.length > 1 ? 's' : ''
        } · ${statusLabel}`}
        backHref="/admin/compliance-frameworks"
        eyebrow="Référentiels conformité"
        status={<span className="text-sm text-muted-foreground">{statusLabel}</span>}
        actions={
          <div className="flex flex-wrap gap-2">
            {archived ? (
              <Button
                type="button"
                size="sm"
                className="min-h-11 sm:min-h-9"
                disabled={busy}
                onClick={() => restoreMut.mutate()}
              >
                Restaurer (proposer)
              </Button>
            ) : (
              <>
                {fw.isActive ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-11 sm:min-h-9"
                    disabled={busy}
                    onClick={() => setActiveMut.mutate(false)}
                  >
                    Désactiver
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    className="min-h-11 sm:min-h-9"
                    disabled={busy}
                    onClick={() => setActiveMut.mutate(true)}
                  >
                    Proposer
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-11 sm:min-h-9"
                  disabled={busy}
                  onClick={() => archiveMut.mutate()}
                >
                  Archiver
                </Button>
              </>
            )}
          </div>
        }
      />

      <section
        className="starium-section space-y-3 p-4 sm:p-5"
        aria-labelledby="pfw-meta-heading"
      >
        <h2 id="pfw-meta-heading" className="text-sm font-semibold">
          Métadonnées
        </h2>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">Nom</dt>
            <dd className="text-sm font-medium">{fw.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Version</dt>
            <dd className="text-sm">{fw.version}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Statut</dt>
            <dd className="text-sm">{statusLabel}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Exigences</dt>
            <dd className="text-sm tabular-nums">{fw.requirements.length}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Organisme</dt>
            <dd className="text-sm">
              {displayLabel(fw.provider, 'Non renseigné')}
            </dd>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <dt className="text-xs text-muted-foreground">Périmètre</dt>
            <dd className="text-sm text-muted-foreground">
              {fw.description?.trim()
                ? fw.description
                : 'Aucun résumé de périmètre.'}
            </dd>
          </div>
        </dl>
        <p className="text-xs text-muted-foreground">
          Proposé = visible pour activation client. Inactif = masqué du catalogue
          client. Archivé = retiré (restaurable).
        </p>
      </section>

      <section className="starium-module space-y-3" aria-labelledby="pfw-req-heading">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h2 id="pfw-req-heading" className="text-base font-semibold">
            Exigences
          </h2>
          <div className="starium-form-field w-full sm:max-w-xs">
            <Label htmlFor="pfw-req-search">Rechercher</Label>
            <Input
              id="pfw-req-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Code, titre, catégorie…"
              className="min-h-11"
              autoComplete="off"
            />
          </div>
        </div>

        {filteredRequirements.length === 0 ? (
          <EmptyState
            title="Aucune exigence"
            description={
              search.trim()
                ? 'Aucun résultat pour cette recherche.'
                : 'Ce référentiel n’a pas encore d’exigences.'
            }
          />
        ) : (
          <div className="space-y-3">
            {requirementGroups.map((group, index) => (
              <details
                key={group.key}
                className="group overflow-hidden rounded-lg border border-border/70 bg-card open:shadow-sm"
                open={index === 0 || Boolean(search.trim())}
              >
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="text-sm font-semibold text-foreground">
                    {group.label}
                  </span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {group.rows.length} exigence
                    {group.rows.length > 1 ? 's' : ''}
                  </span>
                </summary>
                <div className="overflow-x-auto border-t border-border/60">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[8rem]">Code</TableHead>
                        <TableHead>Titre</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.rows.map((req) => (
                        <TableRow key={req.id}>
                          <TableCell className="font-medium tabular-nums">
                            {displayLabel(req.code, 'Sans code')}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-medium whitespace-normal">
                                {displayLabel(req.title, 'Sans titre')}
                              </p>
                              {req.description ? (
                                <p
                                  className="line-clamp-2 text-xs text-muted-foreground"
                                  title={req.description}
                                >
                                  {req.description}
                                </p>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </details>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground" aria-live="polite">
          {filteredRequirements.length} exigence
          {filteredRequirements.length > 1 ? 's' : ''}
          {search.trim()
            ? ` (filtrée${filteredRequirements.length > 1 ? 's' : ''})`
            : ''}
        </p>
      </section>
    </PageContainer>
  );
}
