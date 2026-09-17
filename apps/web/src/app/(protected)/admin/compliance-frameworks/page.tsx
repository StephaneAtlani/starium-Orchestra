'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Plus, Scale } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { LoadingState } from '@/components/feedback/loading-state';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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

type PlatformFrameworkRow = {
  id: string;
  name: string;
  version: string;
  isActive: boolean;
  archivedAt: string | null;
  _count: { requirements: number };
};

type CisoLibraryItem = {
  path: string;
  fileName: string;
  name: string;
  description: string | null;
  version: string;
  locale: string | null;
  refId: string | null;
  publicationDate: string | null;
  provider: string | null;
  languages: string[];
  translations: Array<{
    locale: string;
    name: string | null;
    description: string | null;
  }>;
  hasFramework: boolean;
  alreadyImported: boolean;
  size: number;
  updatedAt: string | null;
  isNew: boolean;
};

type ImportResult = {
  imported: number;
  skipped: number;
  errors: number;
  results: Array<{
    path: string;
    status: 'imported' | 'skipped' | 'error';
    name?: string;
    version?: string;
    requirementCount?: number;
    message?: string;
  }>;
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

function formatLibraryUpdatedAt(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    // publication_date CISO peut être une année ("2022") ou texte libre
    return iso.trim() || null;
  }
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

export default function AdminComplianceFrameworksPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();

  const [includeArchived, setIncludeArchived] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importSearch, setImportSearch] = useState('');
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [name, setName] = useState('');
  const [version, setVersion] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (user?.platformRole !== 'PLATFORM_ADMIN') {
      router.replace('/dashboard');
    }
  }, [authLoading, user, router]);

  const listQuery = useQuery({
    queryKey: ['platform', 'compliance-frameworks', { includeArchived }],
    queryFn: async () => {
      const qs = includeArchived ? '?includeArchived=true' : '';
      const res = await authFetch(`/api/platform/compliance/frameworks${qs}`);
      if (!res.ok) throw new Error(await parseError(res));
      return res.json() as Promise<PlatformFrameworkRow[]>;
    },
    enabled: user?.platformRole === 'PLATFORM_ADMIN',
  });

  const cisoListQuery = useQuery({
    queryKey: ['platform', 'ciso-libraries'],
    queryFn: async () => {
      const res = await authFetch('/api/platform/compliance/ciso-libraries');
      if (!res.ok) throw new Error(await parseError(res));
      return res.json() as Promise<CisoLibraryItem[]>;
    },
    enabled: user?.platformRole === 'PLATFORM_ADMIN' && importOpen,
    staleTime: 5 * 60 * 1000,
  });

  const filteredLibraries = useMemo(() => {
    const items = cisoListQuery.data ?? [];
    const q = importSearch.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const hay = [
        item.name,
        item.fileName,
        item.refId,
        item.provider,
        item.description,
        item.locale,
        ...(item.languages ?? []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [cisoListQuery.data, importSearch]);

  const createMut = useMutation({
    mutationFn: async () => {
      const res = await authFetch('/api/platform/compliance/frameworks', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          version: version.trim(),
          isActive: true,
        }),
      });
      if (!res.ok) throw new Error(await parseError(res));
      return res.json();
    },
    onSuccess: async () => {
      toast.success('Référentiel ajouté au catalogue');
      setCreateOpen(false);
      setName('');
      setVersion('');
      await queryClient.invalidateQueries({
        queryKey: ['platform', 'compliance-frameworks'],
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const importMut = useMutation({
    mutationFn: async (paths: string[]) => {
      const res = await authFetch('/api/platform/compliance/ciso-libraries/import', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ paths }),
      });
      if (!res.ok) throw new Error(await parseError(res));
      return res.json() as Promise<ImportResult>;
    },
    onSuccess: async (data) => {
      const parts = [
        data.imported > 0 ? `${data.imported} importé(s)` : null,
        data.skipped > 0 ? `${data.skipped} ignoré(s)` : null,
        data.errors > 0 ? `${data.errors} erreur(s)` : null,
      ].filter(Boolean);
      if (data.imported > 0) {
        toast.success(parts.join(' · ') || 'Import terminé');
      } else if (data.errors > 0) {
        toast.error(parts.join(' · ') || 'Import échoué');
      } else {
        toast.success(parts.join(' · ') || 'Rien à importer');
      }
      setSelectedPaths(new Set());
      setImportOpen(false);
      setImportSearch('');
      await queryClient.invalidateQueries({
        queryKey: ['platform', 'compliance-frameworks'],
      });
      await queryClient.invalidateQueries({
        queryKey: ['platform', 'ciso-libraries'],
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const archiveMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await authFetch(
        `/api/platform/compliance/frameworks/${id}/archive`,
        { method: 'POST' },
      );
      if (!res.ok) throw new Error(await parseError(res));
      return res.json();
    },
    onSuccess: async () => {
      toast.success('Référentiel archivé');
      await queryClient.invalidateQueries({
        queryKey: ['platform', 'compliance-frameworks'],
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const restoreMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await authFetch(
        `/api/platform/compliance/frameworks/${id}/restore`,
        { method: 'POST' },
      );
      if (!res.ok) throw new Error(await parseError(res));
      return res.json();
    },
    onSuccess: async () => {
      toast.success('Référentiel restauré');
      await queryClient.invalidateQueries({
        queryKey: ['platform', 'compliance-frameworks'],
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function togglePath(path: string, checked: boolean) {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (checked) next.add(path);
      else next.delete(path);
      return next;
    });
  }

  function toggleVisible(selectAll: boolean) {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      for (const item of filteredLibraries) {
        if (selectAll) next.add(item.path);
        else next.delete(item.path);
      }
      return next;
    });
  }

  if (authLoading || user?.platformRole !== 'PLATFORM_ADMIN') {
    return authLoading ? (
      <PageContainer>
        <LoadingState rows={4} />
      </PageContainer>
    ) : null;
  }

  const items = listQuery.data ?? [];
  const selectedCount = selectedPaths.size;

  return (
    <PageContainer>
      <PageHeader
        title="Référentiels conformité (catalogue)"
        description="Cadres proposés à tous les clients (ISO, NIS2, RGPD…). Le client les active ensuite dans Conformité."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/dashboard"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              Retour admin
            </Link>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-11 sm:min-h-9"
              onClick={() => {
                setImportOpen(true);
                setSelectedPaths(new Set());
                setImportSearch('');
              }}
            >
              <Download className="size-4" aria-hidden />
              Importer
            </Button>
            <Button
              type="button"
              size="sm"
              className="min-h-11 sm:min-h-9"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="size-4" aria-hidden />
              Nouveau référentiel
            </Button>
          </div>
        }
      />

      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={includeArchived}
          onChange={(e) => setIncludeArchived(e.target.checked)}
          className="size-4"
        />
        Afficher les archivés
      </label>

      {listQuery.isLoading ? (
        <LoadingState rows={5} />
      ) : listQuery.isError ? (
        <ErrorState
          message={
            listQuery.error instanceof Error
              ? listQuery.error.message
              : 'Impossible de charger le catalogue'
          }
          onRetry={() => void listQuery.refetch()}
        />
      ) : items.length === 0 ? (
        <EmptyState
          title="Catalogue vide"
          description="Importez depuis CISO Assistant, ou créez un référentiel manuellement."
          action={
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setImportOpen(true);
                  setSelectedPaths(new Set());
                  setImportSearch('');
                }}
              >
                Importer
              </Button>
              <Button type="button" onClick={() => setCreateOpen(true)}>
                Nouveau référentiel
              </Button>
            </div>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border/70 bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Version</TableHead>
                <TableHead className="text-right tabular-nums">Exigences</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((row) => {
                const archived = Boolean(row.archivedAt);
                return (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/admin/compliance-frameworks/${row.id}`}
                        className="text-[color:var(--brand-gold-700)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      >
                        {row.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{row.version}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row._count.requirements}
                    </TableCell>
                    <TableCell>
                      {archived ? 'Archivé' : row.isActive ? 'Proposé' : 'Inactif'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Link
                          href={`/admin/compliance-frameworks/${row.id}`}
                          className={cn(
                            buttonVariants({ variant: 'outline', size: 'sm' }),
                            'min-h-11 sm:min-h-9',
                          )}
                        >
                          Voir
                        </Link>
                        {archived ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="min-h-11 sm:min-h-9"
                            onClick={() => restoreMut.mutate(row.id)}
                          >
                            Restaurer
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="min-h-11 sm:min-h-9"
                            onClick={() => archiveMut.mutate(row.id)}
                          >
                            Archiver
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <StariumModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Nouveau référentiel catalogue"
        description="Visible pour tous les clients tant qu’il n’est pas archivé."
        icon={Scale}
        size="md"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button
              type="button"
              disabled={!name.trim() || !version.trim() || createMut.isPending}
              onClick={() => createMut.mutate()}
            >
              Créer
            </Button>
          </>
        }
      >
        <div className="starium-form space-y-4">
          <div className="starium-form-field">
            <Label htmlFor="pfw-name">Nom</Label>
            <Input
              id="pfw-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ISO 27001"
              className="min-h-11"
            />
          </div>
          <div className="starium-form-field">
            <Label htmlFor="pfw-version">Version</Label>
            <Input
              id="pfw-version"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="2022"
              className="min-h-11"
            />
          </div>
        </div>
      </StariumModal>

      <StariumModal
        open={importOpen}
        onOpenChange={(open) => {
          setImportOpen(open);
          if (!open) {
            setSelectedPaths(new Set());
            setImportSearch('');
          }
        }}
        title="Importer depuis CISO Assistant"
        description="Bibliothèques community (clone local). Métadonnées YAML + langues + badge Nouveau."
        icon={Download}
        size="xl"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 sm:min-h-9"
              onClick={() => setImportOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              className="min-h-11 sm:min-h-9"
              disabled={selectedCount === 0 || importMut.isPending}
              onClick={() => importMut.mutate([...selectedPaths])}
            >
              {importMut.isPending
                ? 'Import…'
                : `Importer${selectedCount > 0 ? ` (${selectedCount})` : ''}`}
            </Button>
          </>
        }
      >
        <div className="starium-form space-y-4">
          <div className="starium-form-field">
            <Label htmlFor="ciso-search">Rechercher</Label>
            <Input
              id="ciso-search"
              value={importSearch}
              onChange={(e) => setImportSearch(e.target.value)}
              placeholder="iso27001, nis2, rgpd…"
              className="min-h-11"
              autoComplete="off"
            />
          </div>

          {cisoListQuery.isLoading ? (
            <LoadingState rows={6} />
          ) : cisoListQuery.isError ? (
            <ErrorState
              message={
                cisoListQuery.error instanceof Error
                  ? cisoListQuery.error.message
                  : 'Impossible de lister les bibliothèques'
              }
              onRetry={() => void cisoListQuery.refetch()}
            />
          ) : filteredLibraries.length === 0 ? (
            <EmptyState
              title="Aucun référentiel"
              description={
                importSearch.trim()
                  ? 'Aucun résultat pour cette recherche.'
                  : 'La liste GitHub est vide ou indisponible.'
              }
            />
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <p className="text-muted-foreground" aria-live="polite">
                  {filteredLibraries.length} bibliothèque
                  {filteredLibraries.length > 1 ? 's' : ''}
                  {selectedCount > 0 ? ` · ${selectedCount} sélectionnée(s)` : ''}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-11 sm:min-h-9"
                    onClick={() => toggleVisible(true)}
                  >
                    Tout cocher
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-11 sm:min-h-9"
                    onClick={() => toggleVisible(false)}
                  >
                    Tout décocher
                  </Button>
                </div>
              </div>

              <ul
                className="max-h-[min(50vh,28rem)] space-y-1 overflow-y-auto rounded-lg border border-border/70 p-2"
                role="list"
                aria-label="Bibliothèques CISO Assistant"
              >
                {filteredLibraries.map((item) => {
                  const checked = selectedPaths.has(item.path);
                  const checkboxId = `ciso-${item.fileName}`;
                  const updatedLabel = formatLibraryUpdatedAt(item.updatedAt);
                  const publicationLabel = formatLibraryUpdatedAt(
                    item.publicationDate,
                  );
                  const metaBits = [
                    item.refId
                      ? `Réf. ${displayLabel(item.refId, 'sans code')}`
                      : null,
                    item.version && item.version !== '—'
                      ? `v${item.version}`
                      : null,
                    item.provider,
                    item.locale ? `locale ${item.locale}` : null,
                    publicationLabel ? `publié ${publicationLabel}` : null,
                    updatedLabel ? `MAJ ${updatedLabel}` : null,
                    item.alreadyImported
                      ? 'déjà dans le catalogue (approx.)'
                      : null,
                  ].filter(Boolean);
                  return (
                    <li key={item.path}>
                      <div
                        className={cn(
                          'flex min-h-11 items-start gap-3 rounded-md px-2 py-2 hover:bg-muted/50',
                          checked && 'bg-muted/40',
                        )}
                      >
                        <Checkbox
                          id={checkboxId}
                          checked={checked}
                          onCheckedChange={(v) => togglePath(item.path, v)}
                          className="mt-1 size-5"
                          aria-label={`Sélectionner ${item.name}`}
                        />
                        <button
                          type="button"
                          className="min-w-0 flex-1 cursor-pointer space-y-1.5 text-left"
                          onClick={() => togglePath(item.path, !checked)}
                        >
                          <span className="flex min-w-0 flex-wrap items-center gap-2">
                            <span className="truncate font-medium">{item.name}</span>
                            {item.isNew ? (
                              <Badge
                                variant="secondary"
                                className="bg-[color:var(--brand-gold-050)] text-[color:var(--brand-gold-700)]"
                              >
                                Nouveau
                              </Badge>
                            ) : null}
                          </span>
                          {item.description ? (
                            <span className="line-clamp-2 text-xs text-muted-foreground">
                              {item.description}
                            </span>
                          ) : null}
                          {item.languages.length > 0 ? (
                            <span
                              className="flex flex-wrap gap-1"
                              aria-label={`Langues : ${item.languages.join(', ')}`}
                            >
                              {item.languages.map((lang) => (
                                <Badge key={lang} variant="outline">
                                  {lang.toUpperCase()}
                                </Badge>
                              ))}
                            </span>
                          ) : null}
                          {metaBits.length > 0 ? (
                            <span className="block truncate text-xs text-muted-foreground">
                              {metaBits.join(' · ')}
                            </span>
                          ) : null}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </StariumModal>
    </PageContainer>
  );
}
