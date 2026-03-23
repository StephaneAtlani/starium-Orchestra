'use client';

import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Info, UserPlus } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/feedback/empty-state';
import { LoadingState } from '@/components/feedback/loading-state';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { formatResourceDisplayName, RESOURCE_AFFILIATION_LABEL } from '@/lib/resource-labels';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { tryListResources, type ResourceListItem } from '@/services/resources';
import { NewResourceForm } from '@/app/(protected)/resources/_components/new-resource-form';
import { personResourceMatchesSearch } from '../lib/person-resource-search';

export type PersonCatalogPickerFooterVariant = 'confirm-and-close' | 'done-only';

export type PersonCatalogPickerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Clé TanStack Query (ex. `['resources','human','project-owner']`). */
  queryKey: readonly unknown[];
  queryEnabled?: boolean;
  title: string;
  description: ReactNode;
  /** Bloc optionnel sous le titre (ex. rôle équipe). */
  contextSlot?: ReactNode;
  /** Post-filtre sur la liste API (ex. emails déjà affectés au rôle). */
  filterFetchedResources?: (items: ResourceListItem[]) => ResourceListItem[];
  selectedResourceId: string;
  selectedResourceDetails: ResourceListItem | null;
  onSelectionChange: (id: string, resource: ResourceListItem | null) => void;
  /** Permet de vider la sélection (ex. responsable projet « Aucun »). */
  allowEmpty?: boolean;
  emptySelectionLabel?: string;
  footerVariant: PersonCatalogPickerFooterVariant;
  /** Mode confirm-and-close */
  confirmLabel?: string;
  onConfirm?: () => void;
  confirmDisabled?: boolean;
  secondaryLabel?: string;
  /** Mode done-only */
  doneLabel?: string;
  newPersonFormPrefix: string;
  newPersonDialogDescription: ReactNode;
  /** Intro dans l’encart carte (ligne texte). */
  catalogIntro: ReactNode;
  /** Sous le champ filtre (hint + id pour aria-describedby). */
  filterHint: ReactNode;
  emptyStateNoFilter: { title: string; description: string };
  emptyStateFiltered: { title: string; description: string };
  /** Optionnel : classe DialogContent (largeur). */
  dialogContentClassName?: string;
};

export function PersonCatalogPickerDialog({
  open,
  onOpenChange,
  queryKey,
  queryEnabled = true,
  title,
  description,
  contextSlot,
  filterFetchedResources,
  selectedResourceId,
  selectedResourceDetails,
  onSelectionChange,
  allowEmpty = false,
  emptySelectionLabel = 'Aucun responsable',
  footerVariant,
  confirmLabel = 'Ajouter',
  onConfirm,
  confirmDisabled = false,
  secondaryLabel = 'Fermer',
  doneLabel = 'Terminé',
  newPersonFormPrefix,
  newPersonDialogDescription,
  catalogIntro,
  filterHint,
  emptyStateNoFilter,
  emptyStateFiltered,
  dialogContentClassName,
}: PersonCatalogPickerDialogProps) {
  const authFetch = useAuthenticatedFetch();
  const baseId = useId();
  const searchId = `${baseId}-search`;
  const hintId = `${baseId}-hint`;

  const [search, setSearch] = useState('');
  const [newPersonOpen, setNewPersonOpen] = useState(false);

  useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  const {
    data: resourcesOutcome,
    isLoading: resourcesLoading,
    refetch: refetchHumanResources,
  } = useQuery({
    queryKey: [...queryKey],
    queryFn: () => tryListResources(authFetch, { type: 'HUMAN', limit: 100, offset: 0 }),
    enabled: open && queryEnabled,
  });

  const rawItems = resourcesOutcome?.ok ? resourcesOutcome.data.items : [];
  const humanResources = useMemo(
    () => (filterFetchedResources ? filterFetchedResources(rawItems) : rawItems),
    [rawItems, filterFetchedResources],
  );

  const resourcesBlock =
    resourcesOutcome && !resourcesOutcome.ok ? resourcesOutcome : null;
  const resourceCatalogDenied = Boolean(resourcesBlock);

  const filteredResources = useMemo(
    () => humanResources.filter((r) => personResourceMatchesSearch(r, search)),
    [humanResources, search],
  );

  const selectedPerson = useMemo((): ResourceListItem | null => {
    if (!selectedResourceId) return null;
    return (
      humanResources.find((x) => x.id === selectedResourceId) ??
      (selectedResourceDetails?.id === selectedResourceId ? selectedResourceDetails : null)
    );
  }, [selectedResourceId, humanResources, selectedResourceDetails]);

  const tableRows = useMemo(() => {
    const ids = new Set(filteredResources.map((r) => r.id));
    if (selectedPerson && !ids.has(selectedPerson.id)) {
      return [selectedPerson, ...filteredResources];
    }
    return filteredResources;
  }, [filteredResources, selectedPerson]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn(
            'max-h-[min(90vh,800px)] w-full max-w-[calc(100%-2rem)] gap-4 overflow-y-auto sm:max-w-5xl',
            dialogContentClassName,
          )}
          showCloseButton
        >
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="text-lg font-semibold tracking-tight">{title}</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">{description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {contextSlot}

            {resourcesBlock ? (
              <Alert
                variant={
                  resourcesBlock.status === 404 || resourcesBlock.status >= 500
                    ? 'destructive'
                    : 'default'
                }
                className={
                  resourcesBlock.status === 403
                    ? 'border-amber-500/45 bg-amber-500/[0.07] text-foreground [&_[data-slot=alert-description]]:text-muted-foreground'
                    : resourcesBlock.status === 401
                      ? 'border-border'
                      : resourcesBlock.status === 404 || resourcesBlock.status >= 500
                        ? 'border-destructive/35'
                        : 'border-border'
                }
              >
                {resourcesBlock.status === 403 || resourcesBlock.status === 401 ? (
                  <Info
                    className="size-4 shrink-0 text-amber-700 dark:text-amber-400"
                    aria-hidden
                  />
                ) : (
                  <AlertCircle className="size-4 shrink-0" aria-hidden />
                )}
                <AlertTitle>
                  {resourcesBlock.status === 403
                    ? 'Accès au catalogue restreint'
                    : resourcesBlock.status === 401
                      ? 'Authentification requise'
                      : resourcesBlock.status === 404
                        ? 'API ressources introuvable'
                        : 'Catalogue indisponible'}
                </AlertTitle>
                <AlertDescription>
                  {resourcesBlock.message}
                  {resourcesBlock.status === 403 ? (
                    <span className="mt-2 block text-xs text-muted-foreground">
                      Vérifie la permission <strong className="font-medium">resources.read</strong>{' '}
                      ou que le module Ressources est activé pour ce client.
                    </span>
                  ) : null}
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="min-w-0 space-y-3 rounded-xl border border-border/70 bg-card p-4 shadow-sm">
              <p className="text-xs text-muted-foreground">{catalogIntro}</p>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Label htmlFor={searchId} className="text-sm font-medium">
                    Filtrer
                  </Label>
                  {allowEmpty ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-muted-foreground"
                      disabled={resourceCatalogDenied}
                      onClick={() => onSelectionChange('', null)}
                    >
                      {emptySelectionLabel}
                    </Button>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setNewPersonOpen(true)}
                  disabled={resourceCatalogDenied}
                >
                  <UserPlus className="h-4 w-4" />
                  Nouvelle personne
                </Button>
              </div>

              <Input
                id={searchId}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nom, email, société, code…"
                autoComplete="off"
                disabled={resourceCatalogDenied}
                aria-describedby={hintId}
              />
              <p id={hintId} className="text-xs text-muted-foreground">
                {filterHint}
              </p>

              <div className="min-w-0" role="region" aria-label="Catalogue personnes">
                {resourcesLoading ? (
                  <div className="min-h-[10rem] py-2">
                    <LoadingState rows={5} />
                  </div>
                ) : tableRows.length === 0 ? (
                  <EmptyState
                    className="py-10"
                    title={search.trim() ? emptyStateFiltered.title : emptyStateNoFilter.title}
                    description={
                      search.trim() ? emptyStateFiltered.description : emptyStateNoFilter.description
                    }
                  />
                ) : (
                  <div className="max-h-[min(40vh,320px)] min-h-0 overflow-auto rounded-lg border border-border/60 bg-background">
                    <Table className="min-w-[56rem]">
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="min-w-[10rem] pl-3">Nom</TableHead>
                          <TableHead className="min-w-[8rem]">Email</TableHead>
                          <TableHead className="min-w-[8rem] max-w-[12rem]">Société</TableHead>
                          <TableHead className="hidden w-[6rem] sm:table-cell">Code</TableHead>
                          <TableHead className="w-[6rem] text-right pr-3">Portée</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tableRows.map((r) => {
                          const selected = selectedResourceId === r.id;
                          return (
                            <TableRow
                              key={r.id}
                              data-state={selected ? 'selected' : undefined}
                              className="cursor-pointer"
                              tabIndex={0}
                              aria-selected={selected}
                              onClick={() => onSelectionChange(r.id, r)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  onSelectionChange(r.id, r);
                                }
                              }}
                            >
                              <TableCell className="max-w-[14rem] truncate pl-3 font-medium">
                                {formatResourceDisplayName(r)}
                              </TableCell>
                              <TableCell className="max-w-[12rem] truncate text-muted-foreground">
                                {r.email ?? '—'}
                              </TableCell>
                              <TableCell className="max-w-[12rem] truncate text-muted-foreground">
                                {r.companyName?.trim() ? r.companyName : '—'}
                              </TableCell>
                              <TableCell className="hidden max-w-[6rem] truncate text-muted-foreground sm:table-cell">
                                {r.code ?? '—'}
                              </TableCell>
                              <TableCell className="pr-3 text-right">
                                {r.affiliation ? (
                                  <Badge variant="outline" className="font-normal">
                                    {RESOURCE_AFFILIATION_LABEL[r.affiliation]}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              {selectedPerson ? (
                <p className="text-xs text-muted-foreground">
                  Sélection :{' '}
                  <span className="font-medium text-foreground">
                    {formatResourceDisplayName(selectedPerson)}
                  </span>
                  {selectedPerson.email ? ` · ${selectedPerson.email}` : null}
                  {selectedPerson.companyName?.trim()
                    ? ` · ${selectedPerson.companyName.trim()}`
                    : null}
                </p>
              ) : null}
            </div>

            {footerVariant === 'done-only' ? (
              <DialogFooter showCloseButton={false}>
                <Button type="button" variant="default" onClick={() => onOpenChange(false)}>
                  {doneLabel}
                </Button>
              </DialogFooter>
            ) : (
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  {secondaryLabel}
                </Button>
                <Button
                  type="button"
                  onClick={() => onConfirm?.()}
                  disabled={confirmDisabled || resourceCatalogDenied}
                >
                  {confirmLabel}
                </Button>
              </DialogFooter>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={newPersonOpen} onOpenChange={setNewPersonOpen}>
        <DialogContent
          className="max-h-[min(90vh,720px)] w-full max-w-lg overflow-y-auto sm:max-w-lg"
          showCloseButton
        >
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="text-lg font-semibold tracking-tight">Nouvelle personne</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              {newPersonDialogDescription}
            </DialogDescription>
          </DialogHeader>
          {newPersonOpen ? (
            <NewResourceForm
              formIdPrefix={newPersonFormPrefix}
              forceType="HUMAN"
              className="w-full max-w-full space-y-4"
              onSuccess={(created) => {
                onSelectionChange(created.id, created);
                void refetchHumanResources();
                setNewPersonOpen(false);
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
