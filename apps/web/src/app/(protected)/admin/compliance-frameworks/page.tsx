'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { displayLabel, firstDisplayLabel } from '@/lib/display-label';
import { toast } from '@/lib/toast';

const LOCALE_LABELS: Record<string, string> = {
  fr: 'Français',
  en: 'English',
  de: 'Deutsch',
  es: 'Español',
  it: 'Italiano',
  nl: 'Nederlands',
  pt: 'Português',
};

function localeDisplayLabel(code: string): string {
  return LOCALE_LABELS[code] ?? code.toUpperCase();
}

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

function localizedLibraryName(item: CisoLibraryItem, locale: string): string {
  if (locale === item.locale) return item.name;
  const tr = item.translations.find((t) => t.locale === locale);
  return firstDisplayLabel([tr?.name, item.name], item.name);
}

function localizedLibraryDescription(
  item: CisoLibraryItem,
  locale: string,
): string | null {
  if (locale === item.locale) return item.description;
  const tr = item.translations.find((t) => t.locale === locale);
  return tr?.description ?? item.description;
}

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
  const [importLocale, setImportLocale] = useState('fr');
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const importSelectionSeededRef = useRef(false);
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

  /** Pré-coche les bibliothèques déjà présentes dans le catalogue plateforme. */
  useEffect(() => {
    if (!importOpen) {
      importSelectionSeededRef.current = false;
      return;
    }
    if (!cisoListQuery.data || importSelectionSeededRef.current) return;
    importSelectionSeededRef.current = true;
    setSelectedPaths(
      new Set(
        cisoListQuery.data
          .filter((item) => item.alreadyImported)
          .map((item) => item.path),
      ),
    );
  }, [importOpen, cisoListQuery.data]);

  const filteredLibraries = useMemo(() => {
    const items = cisoListQuery.data ?? [];
    const q = importSearch.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const localizedName = localizedLibraryName(item, importLocale);
      const localizedDesc = localizedLibraryDescription(item, importLocale);
      const hay = [
        localizedName,
        localizedDesc,
        item.name,
        item.fileName,
        item.refId,
        item.provider,
        item.description,
        item.locale,
        ...(item.languages ?? []),
        ...item.translations.map((t) => t.name),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [cisoListQuery.data, importSearch, importLocale]);

  const availableImportLocales = useMemo(() => {
    const set = new Set<string>();
    for (const item of cisoListQuery.data ?? []) {
      for (const lang of item.languages) set.add(lang);
    }
    if (set.size === 0) {
      set.add('fr');
      set.add('en');
    } else if (!set.has('fr')) {
      // Toujours proposer le français en tête même s’il n’est pas partout.
      set.add('fr');
    }
    return [...set].sort((a, b) => {
      if (a === 'fr') return -1;
      if (b === 'fr') return 1;
      return a.localeCompare(b, 'fr');
    });
  }, [cisoListQuery.data]);

  const alreadyImportedPaths = useMemo(() => {
    return new Set(
      (cisoListQuery.data ?? [])
        .filter((item) => item.alreadyImported)
        .map((item) => item.path),
    );
  }, [cisoListQuery.data]);

  /** Chemins sélectionnés encore à importer (hors déjà présents au catalogue). */
  const importableSelectedPaths = useMemo(() => {
    return [...selectedPaths].filter((path) => !alreadyImportedPaths.has(path));
  }, [selectedPaths, alreadyImportedPaths]);

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
        body: JSON.stringify({ paths, locale: importLocale }),
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
        if (item.alreadyImported) {
          next.add(item.path);
          continue;
        }
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
  const importableCount = importableSelectedPaths.length;
  const alreadySelectedCount = selectedCount - importableCount;

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
                    <TableCell className="max-w-[28rem] whitespace-normal font-medium">
                      <Link
                        href={`/admin/compliance-frameworks/${row.id}`}
                        title={row.name}
                        className="line-clamp-2 break-words text-[color:var(--brand-gold-700)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
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
        size="full"
        contentClassName="flex h-[min(90dvh,calc(100dvh-2rem))] max-h-[min(90dvh,calc(100dvh-2rem))] flex-col sm:max-w-4xl"
        bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden px-5 py-5"
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
              disabled={importableCount === 0 || importMut.isPending}
              onClick={() => importMut.mutate(importableSelectedPaths)}
            >
              {importMut.isPending
                ? 'Import…'
                : `Importer${importableCount > 0 ? ` (${importableCount})` : ''}`}
            </Button>
          </>
        }
      >
        <div className="starium-form flex min-h-0 flex-1 flex-col gap-4">
          <div className="grid shrink-0 gap-4 sm:grid-cols-2">
            <div className="starium-form-field">
              <Label htmlFor="ciso-locale">Langue d’affichage / import</Label>
              <Select
                value={importLocale}
                onValueChange={(v) => setImportLocale(v ?? 'fr')}
              >
                <SelectTrigger id="ciso-locale" className="min-h-11 w-full">
                  <SelectValue>{localeDisplayLabel(importLocale)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {availableImportLocales.map((code) => (
                    <SelectItem key={code} value={code}>
                      {localeDisplayLabel(code)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Libellés affichés et contenu matérialisé à l’import (noms,
                descriptions, exigences).
              </p>
            </div>
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
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 text-sm">
                <p className="text-muted-foreground" aria-live="polite">
                  {filteredLibraries.length} bibliothèque
                  {filteredLibraries.length > 1 ? 's' : ''}
                  {importableCount > 0
                    ? ` · ${importableCount} à importer`
                    : ''}
                  {alreadySelectedCount > 0
                    ? ` · ${alreadySelectedCount} déjà importée${alreadySelectedCount > 1 ? 's' : ''}`
                    : ''}
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
                className="min-h-0 flex-1 space-y-1 overflow-y-auto rounded-lg border border-border/70 p-2"
                role="list"
                aria-label="Bibliothèques CISO Assistant"
              >
                {filteredLibraries.map((item) => {
                  const checked = selectedPaths.has(item.path);
                  const checkboxId = `ciso-${item.fileName}`;
                  const displayName = localizedLibraryName(item, importLocale);
                  const displayDescription = localizedLibraryDescription(
                    item,
                    importLocale,
                  );
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
                  ].filter(Boolean);
                  return (
                    <li key={item.path}>
                      <div
                        className={cn(
                          'flex min-h-11 items-start gap-3 rounded-md px-2 py-2 hover:bg-muted/50',
                          checked && 'bg-muted/40',
                          item.alreadyImported && 'opacity-90',
                        )}
                      >
                        <Checkbox
                          id={checkboxId}
                          checked={checked}
                          disabled={item.alreadyImported}
                          onCheckedChange={(v) => {
                            if (item.alreadyImported) return;
                            togglePath(item.path, v);
                          }}
                          className="mt-1 size-5"
                          aria-label={
                            item.alreadyImported
                              ? `${displayName} (déjà importé)`
                              : `Sélectionner ${displayName}`
                          }
                        />
                        <button
                          type="button"
                          className="min-w-0 flex-1 cursor-pointer space-y-1.5 text-left disabled:cursor-default"
                          disabled={item.alreadyImported}
                          onClick={() => {
                            if (item.alreadyImported) return;
                            togglePath(item.path, !checked);
                          }}
                        >
                          <span className="flex min-w-0 flex-wrap items-center gap-2">
                            <span className="truncate font-medium">{displayName}</span>
                            {item.alreadyImported ? (
                              <Badge variant="secondary">Importé</Badge>
                            ) : null}
                            {item.isNew ? (
                              <Badge
                                variant="secondary"
                                className="bg-[color:var(--brand-gold-050)] text-[color:var(--brand-gold-700)]"
                              >
                                Nouveau
                              </Badge>
                            ) : null}
                          </span>
                          {displayDescription ? (
                            <span className="line-clamp-2 text-xs text-muted-foreground">
                              {displayDescription}
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
