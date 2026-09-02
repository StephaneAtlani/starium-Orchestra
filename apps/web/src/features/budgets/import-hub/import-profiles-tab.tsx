'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { Copy, Pencil, Play, Trash2 } from 'lucide-react';
import { FilterBar } from '@/components/layout/filter-bar';
import { FilterBarField } from '@/components/layout/filter-bar-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { LoadingState } from '@/components/feedback/loading-state';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { usePermissions } from '@/hooks/use-permissions';
import { budgetQueryKeys } from '../lib/budget-query-keys';
import { budgetImport } from '../constants/budget-routes';
import {
  createBudgetImportMapping,
  deleteBudgetImportMapping,
  duplicateBudgetImportMapping,
  listBudgetImportMappings,
  updateBudgetImportMapping,
} from '../api/budget-imports.api';
import type {
  BudgetImportMappingDto,
  BudgetImportPurpose,
  BudgetImportSourceType,
} from '../types/budget-imports.types';
import { displayLabel } from '@/lib/display-label';
import { EMPTY_SELECT_VALUE } from '../budget-import/budget-import-field-labels';
import { IMPORT_PURPOSE_LABELS, importPurposeLabel } from './import-purpose-labels';
import { ImportProfileFormModal } from './import-profile-form-modal';
import { LaunchImportBudgetModal } from './launch-import-budget-modal';

export function ImportProfilesTab() {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const { has } = usePermissions();
  const canUpdate = has('budgets.update');

  const [search, setSearch] = useState('');
  const [purpose, setPurpose] = useState<string>(EMPTY_SELECT_VALUE);
  const [sourceType, setSourceType] = useState<string>(EMPTY_SELECT_VALUE);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editing, setEditing] = useState<BudgetImportMappingDto | null>(null);

  const [launchOpen, setLaunchOpen] = useState(false);
  const [launchProfile, setLaunchProfile] = useState<BudgetImportMappingDto | null>(null);

  const filters = useMemo(
    () => ({
      limit: 50,
      offset: 0,
      search: search.trim() || undefined,
      importPurpose:
        purpose === EMPTY_SELECT_VALUE ? undefined : (purpose as BudgetImportPurpose),
      sourceType:
        sourceType === EMPTY_SELECT_VALUE
          ? undefined
          : (sourceType as BudgetImportSourceType),
    }),
    [search, purpose, sourceType],
  );

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: budgetQueryKeys.budgetImportMappingsList(clientId, filters),
    queryFn: () => listBudgetImportMappings(authFetch, filters),
    enabled: !!clientId,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: budgetQueryKeys.budgetImportMappingsList(clientId),
    });

  const createMut = useMutation({
    mutationFn: (payload: Parameters<typeof createBudgetImportMapping>[1]) =>
      createBudgetImportMapping(authFetch, payload),
    onSuccess: async () => {
      toast.success('Profil créé');
      await invalidate();
    },
  });

  const updateMut = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Parameters<typeof updateBudgetImportMapping>[2];
    }) => updateBudgetImportMapping(authFetch, id, payload),
    onSuccess: async () => {
      toast.success('Profil mis à jour');
      await invalidate();
    },
  });

  const duplicateMut = useMutation({
    mutationFn: (id: string) => duplicateBudgetImportMapping(authFetch, id),
    onSuccess: async () => {
      toast.success('Profil dupliqué');
      await invalidate();
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteBudgetImportMapping(authFetch, id),
    onSuccess: async () => {
      toast.success('Profil supprimé');
      await invalidate();
    },
  });

  const items = data?.items ?? [];

  const handleLaunch = (profile: BudgetImportMappingDto) => {
    if (profile.defaultBudgetId) {
      router.push(budgetImport(profile.defaultBudgetId, profile.id));
      return;
    }
    setLaunchProfile(profile);
    setLaunchOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Profils réutilisables (mapping + finalité). Le détail des colonnes se configure dans le
          wizard.
        </p>
        {canUpdate ? (
          <Button
            type="button"
            className="min-h-11 sm:min-h-9"
            onClick={() => {
              setFormMode('create');
              setEditing(null);
              setFormOpen(true);
            }}
          >
            Nouveau profil
          </Button>
        ) : null}
      </div>

      <FilterBar aria-label="Filtres des profils d’import" asSearch>
        <FilterBarField id="import-profiles-search" label="Recherche">
          {({ controlId }) => (
            <Input
              id={controlId}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nom du profil"
              className="min-h-11 sm:min-h-9"
            />
          )}
        </FilterBarField>
        <FilterBarField id="import-profiles-purpose" label="Finalité">
          {({ controlId }) => (
            <Select value={purpose} onValueChange={(v) => setPurpose(v ?? EMPTY_SELECT_VALUE)}>
              <SelectTrigger id={controlId} className="min-h-11 w-full sm:min-h-9">
                <SelectValue>
                  {purpose === EMPTY_SELECT_VALUE
                    ? 'Toutes'
                    : IMPORT_PURPOSE_LABELS[purpose as BudgetImportPurpose]}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={EMPTY_SELECT_VALUE}>Toutes</SelectItem>
                {(Object.keys(IMPORT_PURPOSE_LABELS) as BudgetImportPurpose[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {IMPORT_PURPOSE_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FilterBarField>
        <FilterBarField id="import-profiles-source" label="Type">
          {({ controlId }) => (
            <Select
              value={sourceType}
              onValueChange={(v) => setSourceType(v ?? EMPTY_SELECT_VALUE)}
            >
              <SelectTrigger id={controlId} className="min-h-11 w-full sm:min-h-9">
                <SelectValue>
                  {sourceType === EMPTY_SELECT_VALUE
                    ? 'Tous'
                    : sourceType === 'XLSX'
                      ? 'Excel'
                      : 'CSV'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={EMPTY_SELECT_VALUE}>Tous</SelectItem>
                <SelectItem value="CSV">CSV</SelectItem>
                <SelectItem value="XLSX">Excel</SelectItem>
              </SelectContent>
            </Select>
          )}
        </FilterBarField>
      </FilterBar>

      {isLoading ? <LoadingState rows={4} /> : null}
      {error ? (
        <ErrorState
          message="Impossible de charger les profils. Vérifiez vos droits ou réessayez."
          onRetry={() => void refetch()}
        />
      ) : null}
      {!isLoading && !error && items.length === 0 ? (
        <EmptyState
          title="Aucun profil"
          description="Créez un profil ou enregistrez-en un depuis le wizard d’import."
        />
      ) : null}

      {!isLoading && !error && items.length > 0 ? (
        <>
          <div className="hidden md:block overflow-x-auto rounded-lg border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Finalité</TableHead>
                  <TableHead>Budget par défaut</TableHead>
                  <TableHead>Dernière utilisation</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="font-medium text-foreground">
                        {displayLabel(p.name, 'Profil')}
                      </div>
                      {p.description ? (
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {p.description}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>{p.sourceType === 'XLSX' ? 'Excel' : 'CSV'}</TableCell>
                    <TableCell>{importPurposeLabel(p.importPurpose)}</TableCell>
                    <TableCell>
                      {displayLabel(p.defaultBudgetLabel, 'Aucun')}
                    </TableCell>
                    <TableCell className="tabular-nums text-sm">
                      {p.lastUsedAt
                        ? new Date(p.lastUsedAt).toLocaleString('fr-FR')
                        : 'Jamais'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-1">
                        {canUpdate ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="min-h-11 sm:min-h-9"
                            onClick={() => handleLaunch(p)}
                          >
                            <Play className="size-4" aria-hidden />
                            Lancer
                          </Button>
                        ) : null}
                        {canUpdate ? (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="min-h-11 min-w-11 sm:min-h-9 sm:min-w-9"
                            aria-label="Modifier le profil"
                            onClick={() => {
                              setFormMode('edit');
                              setEditing(p);
                              setFormOpen(true);
                            }}
                          >
                            <Pencil className="size-4" />
                          </Button>
                        ) : null}
                        {canUpdate ? (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="min-h-11 min-w-11 sm:min-h-9 sm:min-w-9"
                            aria-label="Dupliquer le profil"
                            onClick={() => duplicateMut.mutate(p.id)}
                          >
                            <Copy className="size-4" />
                          </Button>
                        ) : null}
                        {canUpdate ? (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="min-h-11 min-w-11 sm:min-h-9 sm:min-w-9"
                            aria-label="Supprimer le profil"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Supprimer le profil « ${displayLabel(p.name, 'Profil')} » ?`,
                                )
                              ) {
                                deleteMut.mutate(p.id);
                              }
                            }}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="md:hidden space-y-3" aria-label="Profils d’import">
            {items.map((p) => (
              <li
                key={p.id}
                className="rounded-lg border border-border bg-card p-4 space-y-3"
              >
                <div>
                  <p className="font-medium text-foreground">
                    {displayLabel(p.name, 'Profil')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {p.sourceType === 'XLSX' ? 'Excel' : 'CSV'} ·{' '}
                    {importPurposeLabel(p.importPurpose)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Budget : {displayLabel(p.defaultBudgetLabel, 'Aucun')}
                  </p>
                </div>
                {canUpdate ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="min-h-11"
                      onClick={() => handleLaunch(p)}
                    >
                      Lancer
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="min-h-11"
                      onClick={() => {
                        setFormMode('edit');
                        setEditing(p);
                        setFormOpen(true);
                      }}
                    >
                      Modifier
                    </Button>
                  </div>
                ) : null}
                {p.defaultBudgetId ? (
                  <Link
                    href={budgetImport(p.defaultBudgetId, p.id)}
                    className="text-sm text-primary underline-offset-2 hover:underline"
                  >
                    Configurer le mapping
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <ImportProfileFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        initial={editing}
        busy={createMut.isPending || updateMut.isPending}
        onSubmitCreate={async (payload) => {
          await createMut.mutateAsync(payload);
        }}
        onSubmitUpdate={async (id, payload) => {
          await updateMut.mutateAsync({ id, payload });
        }}
      />

      {launchProfile ? (
        <LaunchImportBudgetModal
          open={launchOpen}
          onOpenChange={setLaunchOpen}
          profileId={launchProfile.id}
          profileName={displayLabel(launchProfile.name, 'Profil')}
        />
      ) : null}
    </div>
  );
}
