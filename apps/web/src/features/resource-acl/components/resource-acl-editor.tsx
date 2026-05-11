'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/context/auth-context';
import { useActiveClient } from '@/hooks/use-active-client';
import { useClientMembers } from '@/features/client-rbac/hooks/use-client-members';
import { useAccessGroups } from '@/features/access-groups/hooks/use-access-groups';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { toast } from '@/lib/toast';

import type {
  ResourceAclEntry,
  ResourceAclEntryInput,
  ResourceAclResourceType,
} from '../api/resource-acl.types';
import { addResourceAclEntry, removeResourceAclEntry } from '../api/resource-acl';
import { resourceAclKeys } from '../query-keys';
import { useResourceAcl } from '../hooks/use-resource-acl';
import { useGroupMemberships } from '../hooks/use-group-memberships';
import {
  computeEffectiveAdminCapacity,
  wouldRemovingEntryRemoveLastAdmin,
  type AdminCapacitySnapshot,
} from '../lib/admin-capacity';
import { runSequentialDelete } from '../lib/delete-sequence';
import { resolveEffectiveCanEdit } from '../lib/policy';
import type { SubjectCandidate } from '../lib/filter-available-subjects';

import { ResourceAclPublicBanner } from './resource-acl-public-banner';
import { ResourceAclEntryRow } from './resource-acl-entry-row';
import { ResourceAclAddEntryForm } from './resource-acl-add-entry-form';
import { ResourceAclConfirmationDialog } from './resource-acl-confirmation-dialog';

export interface ResourceAclEditorProps {
  resourceType: ResourceAclResourceType;
  resourceId: string;
  resourceLabel: string;
  /** Force lecture seule (cas budget-line drawer). */
  readOnly?: boolean;
  /** Override **réducteur** de la policy par défaut (`activeClient.role === 'CLIENT_ADMIN'`). */
  canEdit?: boolean;
}

type PendingConfirmation =
  | { kind: 'first-entry-no-self'; pending: ResourceAclEntryInput }
  | { kind: 'remove-last-admin'; entry: ResourceAclEntry }
  | { kind: 'bulk-delete' };

export function ResourceAclEditor({
  resourceType,
  resourceId,
  resourceLabel,
  readOnly = false,
  canEdit,
}: ResourceAclEditorProps) {
  const { user } = useAuth();
  const { activeClient } = useActiveClient();
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const currentUserId = user?.id;
  const activeClientId = activeClient?.id ?? '';

  const effectiveCanEdit =
    !readOnly &&
    resolveEffectiveCanEdit({
      activeClientRole: activeClient?.role,
      override: canEdit,
    });

  const aclQuery = useResourceAcl({ resourceType, resourceId });

  const entries = useMemo(
    () => aclQuery.data?.entries ?? [],
    [aclQuery.data?.entries],
  );
  const restricted = aclQuery.data?.restricted ?? false;

  const groupIds = useMemo(
    () =>
      entries
        .filter((e) => e.subjectType === 'GROUP')
        .map((e) => e.subjectId),
    [entries],
  );
  const groupMembershipsQuery = useGroupMemberships(groupIds);

  const adminSnapshot: AdminCapacitySnapshot = useMemo(
    () =>
      computeEffectiveAdminCapacity({
        currentUserId,
        entries,
        groupMemberships: groupMembershipsQuery.groupMemberships,
      }),
    [currentUserId, entries, groupMembershipsQuery.groupMemberships],
  );

  const clientMembersQuery = useClientMembers();
  const accessGroupsQuery = useAccessGroups();

  const userCandidates: SubjectCandidate[] = useMemo(() => {
    return (clientMembersQuery.data ?? [])
      .filter((m) => m.status === 'ACTIVE')
      .map((m) => {
        const name = [m.firstName, m.lastName].filter(Boolean).join(' ').trim();
        return {
          id: m.id,
          label: name ? `${name} (${m.email})` : m.email,
          searchHint: m.email,
        };
      });
  }, [clientMembersQuery.data]);

  const groupCandidates: SubjectCandidate[] = useMemo(() => {
    return (accessGroupsQuery.data ?? []).map((g) => ({
      id: g.id,
      label: g.name,
    }));
  }, [accessGroupsQuery.data]);

  const [selfAdminChecked, setSelfAdminChecked] = useState(true);
  const [pendingConfirmation, setPendingConfirmation] =
    useState<PendingConfirmation | null>(null);
  const [bulkDelete, setBulkDelete] = useState<{
    inProgress: boolean;
    done: number;
    total: number;
    failedAt?: { entryId: string; error: Error };
    remainingEntryIds: string[];
  } | null>(null);
  const [addPending, setAddPending] = useState(false);
  const [removePending, setRemovePending] = useState<string | null>(null);

  const canPerformDestructive =
    effectiveCanEdit && !groupMembershipsQuery.isLoading;

  const refetch = useCallback(async () => {
    await aclQuery.refetch();
  }, [aclQuery]);

  const showFirstEntryHelp = !restricted;

  const performAdd = useCallback(
    async (entry: ResourceAclEntryInput, opts?: { addSelfFirst?: boolean }) => {
      if (!effectiveCanEdit) return;
      setAddPending(true);
      try {
        if (opts?.addSelfFirst && currentUserId) {
          await addResourceAclEntry(authFetch, resourceType, resourceId, {
            subjectType: 'USER',
            subjectId: currentUserId,
            permission: 'ADMIN',
          });
          await refetch();
        }
        await addResourceAclEntry(authFetch, resourceType, resourceId, entry);
        await refetch();
      } catch (err) {
        toast.error("Erreur lors de l'ajout", {
          description: (err as Error).message,
        });
      } finally {
        setAddPending(false);
      }
    },
    [
      effectiveCanEdit,
      currentUserId,
      authFetch,
      resourceType,
      resourceId,
      refetch,
    ],
  );

  const handleSubmitAdd = useCallback(
    (entry: ResourceAclEntryInput) => {
      if (!effectiveCanEdit) return;

      if (showFirstEntryHelp) {
        if (!selfAdminChecked) {
          setPendingConfirmation({
            kind: 'first-entry-no-self',
            pending: entry,
          });
          return;
        }
        const isAddingSelfAlready =
          entry.subjectType === 'USER' &&
          entry.subjectId === currentUserId &&
          entry.permission === 'ADMIN';

        if (isAddingSelfAlready) {
          void performAdd(entry);
          return;
        }
        void performAdd(entry, { addSelfFirst: true });
        return;
      }

      void performAdd(entry);
    },
    [
      effectiveCanEdit,
      showFirstEntryHelp,
      selfAdminChecked,
      currentUserId,
      performAdd,
    ],
  );

  const handleConfirmFirstEntryNoSelf = useCallback(() => {
    if (
      !pendingConfirmation ||
      pendingConfirmation.kind !== 'first-entry-no-self'
    )
      return;
    const entry = pendingConfirmation.pending;
    setPendingConfirmation(null);
    void performAdd(entry);
  }, [pendingConfirmation, performAdd]);

  const performRemove = useCallback(
    async (entry: ResourceAclEntry) => {
      if (!effectiveCanEdit) return;
      setRemovePending(entry.id);
      try {
        await removeResourceAclEntry(
          authFetch,
          resourceType,
          resourceId,
          entry.id,
        );
        await refetch();
        await queryClient.invalidateQueries({
          queryKey: resourceAclKeys.list(activeClientId, resourceType, resourceId),
        });
      } catch (err) {
        toast.error('Erreur lors de la suppression', {
          description: (err as Error).message,
        });
      } finally {
        setRemovePending(null);
      }
    },
    [
      effectiveCanEdit,
      authFetch,
      resourceType,
      resourceId,
      refetch,
      queryClient,
      activeClientId,
    ],
  );

  const handleRemoveClick = useCallback(
    (entry: ResourceAclEntry) => {
      if (!canPerformDestructive) return;
      if (wouldRemovingEntryRemoveLastAdmin(adminSnapshot, entry.id)) {
        setPendingConfirmation({ kind: 'remove-last-admin', entry });
        return;
      }
      void performRemove(entry);
    },
    [canPerformDestructive, adminSnapshot, performRemove],
  );

  const handleConfirmRemoveLastAdmin = useCallback(() => {
    if (
      !pendingConfirmation ||
      pendingConfirmation.kind !== 'remove-last-admin'
    )
      return;
    const entry = pendingConfirmation.entry;
    setPendingConfirmation(null);
    void performRemove(entry);
  }, [pendingConfirmation, performRemove]);

  const performBulkDelete = useCallback(
    async (idsToDelete: string[]) => {
      if (!effectiveCanEdit) return;
      setBulkDelete({
        inProgress: true,
        done: 0,
        total: idsToDelete.length,
        remainingEntryIds: idsToDelete,
      });

      const result = await runSequentialDelete({
        entryIds: idsToDelete,
        deleteOne: (entryId) =>
          removeResourceAclEntry(authFetch, resourceType, resourceId, entryId),
        refetch: async () => {
          await refetch();
        },
        onProgress: (done, total) => {
          setBulkDelete((prev) =>
            prev ? { ...prev, done, total } : prev,
          );
        },
      });

      setBulkDelete({
        inProgress: false,
        done: result.deletedEntryIds.length,
        total: idsToDelete.length,
        failedAt: result.failedAt,
        remainingEntryIds: result.remainingEntryIds,
      });

      if (result.failedAt) {
        toast.error('Suppression partielle', {
          description: `${result.deletedEntryIds.length} sur ${idsToDelete.length} supprimées. La suppression de l’entrée « ${result.failedAt.entryId} » a échoué : ${result.failedAt.error.message}`,
        });
      } else {
        toast.success('Mode public restauré', {
          description: 'Toutes les permissions ACL ont été supprimées.',
        });
      }
    },
    [effectiveCanEdit, authFetch, resourceType, resourceId, refetch],
  );

  const handleConfirmBulkDelete = useCallback(() => {
    setPendingConfirmation(null);
    const ids = entries.map((e) => e.id);
    void performBulkDelete(ids);
  }, [entries, performBulkDelete]);

  const handleResumeBulkDelete = useCallback(() => {
    if (!bulkDelete) return;
    void performBulkDelete(bulkDelete.remainingEntryIds);
  }, [bulkDelete, performBulkDelete]);

  if (aclQuery.isLoading) {
    return (
      <div className="space-y-3" data-testid="resource-acl-editor-loading">
        <p className="text-sm text-muted-foreground">Chargement des permissions…</p>
      </div>
    );
  }

  if (aclQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Impossible de charger les permissions de cette ressource :{' '}
          {(aclQuery.error as Error)?.message ?? 'erreur inconnue'}
        </AlertDescription>
      </Alert>
    );
  }

  const showPublicBanner =
    !!aclQuery.data &&
    aclQuery.data.restricted === false &&
    aclQuery.data.entries.length === 0 &&
    !bulkDelete?.inProgress &&
    !bulkDelete?.failedAt;

  return (
    <div className="space-y-4" data-testid="resource-acl-editor">
      {showPublicBanner && (
        <ResourceAclPublicBanner resourceLabel={resourceLabel} />
      )}

      {restricted && (
        <div data-testid="resource-acl-restricted-table">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Sujet</TableHead>
                <TableHead>Permission</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <ResourceAclEntryRow
                  key={entry.id}
                  entry={entry}
                  canEdit={canPerformDestructive}
                  isPending={removePending === entry.id}
                  removalIsLockoutRisk={wouldRemovingEntryRemoveLastAdmin(
                    adminSnapshot,
                    entry.id,
                  )}
                  onRemove={handleRemoveClick}
                />
              ))}
            </TableBody>
          </Table>

          {bulkDelete && (
            <div
              className="mt-3 flex flex-wrap items-center gap-3 rounded-md border border-border/60 bg-muted/30 p-3 text-sm"
              data-testid="resource-acl-bulk-delete-status"
            >
              <span>
                {bulkDelete.inProgress
                  ? `Suppression en cours… (${bulkDelete.done}/${bulkDelete.total})`
                  : bulkDelete.failedAt
                    ? `${bulkDelete.done} sur ${bulkDelete.total} supprimées. Reste ${bulkDelete.remainingEntryIds.length} entrée(s).`
                    : `${bulkDelete.done}/${bulkDelete.total} supprimées.`}
              </span>
              {!bulkDelete.inProgress && bulkDelete.remainingEntryIds.length > 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleResumeBulkDelete}
                  data-testid="resource-acl-bulk-resume"
                >
                  Reprendre
                </Button>
              )}
            </div>
          )}

          {effectiveCanEdit && (
            <div className="mt-3 flex justify-end">
              <Button
                type="button"
                variant="destructive"
                disabled={
                  !canPerformDestructive ||
                  bulkDelete?.inProgress === true ||
                  entries.length === 0
                }
                onClick={() =>
                  setPendingConfirmation({ kind: 'bulk-delete' })
                }
                data-testid="resource-acl-bulk-delete"
              >
                Tout supprimer (revenir au mode public)
              </Button>
            </div>
          )}
        </div>
      )}

      {effectiveCanEdit && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Ajouter une permission</h3>
          <ResourceAclAddEntryForm
            entries={entries}
            userCandidates={userCandidates}
            groupCandidates={groupCandidates}
            showSelfAdminOption={showFirstEntryHelp && !!currentUserId}
            selfAdminChecked={selfAdminChecked}
            onSelfAdminCheckedChange={setSelfAdminChecked}
            isPending={addPending}
            disabled={
              clientMembersQuery.isLoading || accessGroupsQuery.isLoading
            }
            onSubmit={handleSubmitAdd}
          />
        </div>
      )}

      <ResourceAclConfirmationDialog
        open={pendingConfirmation?.kind === 'first-entry-no-self'}
        onOpenChange={(open) => {
          if (!open) setPendingConfirmation(null);
        }}
        title="Confirmer sans vous ajouter en ADMIN ?"
        description={
          <>
            Vous risquez de perdre l'accès en édition à «&nbsp;{resourceLabel}&nbsp;»
            si vous n'êtes pas listé en ADMIN. Confirmez si vous comprenez le
            risque.
          </>
        }
        confirmLabel="Continuer sans m'ajouter"
        onConfirm={handleConfirmFirstEntryNoSelf}
        isPending={addPending}
      />

      <ResourceAclConfirmationDialog
        open={pendingConfirmation?.kind === 'remove-last-admin'}
        onOpenChange={(open) => {
          if (!open) setPendingConfirmation(null);
        }}
        title="Supprimer votre dernière capacité ADMIN ?"
        description={
          <>
            Cette entrée est votre <strong>dernière source de capacité ADMIN</strong>{' '}
            sur «&nbsp;{resourceLabel}&nbsp;». Sa suppression vous fera perdre
            l'accès en édition. Confirmez si vous comprenez le risque.
          </>
        }
        confirmLabel="Supprimer quand même"
        onConfirm={handleConfirmRemoveLastAdmin}
        isPending={removePending !== null}
      />

      <ResourceAclConfirmationDialog
        open={pendingConfirmation?.kind === 'bulk-delete'}
        onOpenChange={(open) => {
          if (!open) setPendingConfirmation(null);
        }}
        title="Revenir en mode public ?"
        description={
          <>
            Toutes les entrées ACL de «&nbsp;{resourceLabel}&nbsp;» vont être
            supprimées une à une. La ressource repassera en mode RBAC public.
            Cette opération peut s'arrêter au premier échec et nécessiter une
            reprise manuelle.
          </>
        }
        confirmLabel="Tout supprimer"
        onConfirm={handleConfirmBulkDelete}
        isPending={bulkDelete?.inProgress === true}
      />
    </div>
  );
}
