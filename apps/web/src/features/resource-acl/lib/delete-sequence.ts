/**
 * Orchestration du retour mode public (RFC-ACL-013).
 *
 * Backend RFC-ACL-005 : `PUT entries=[]` est interdit (`MIN_LENGTH 1`). Le seul
 * moyen de revenir en `restricted === false` est de DELETE toutes les entrées
 * une par une.
 *
 * Règles :
 * - DELETE séquentiel (jamais `Promise.all`).
 * - **`await refetch()` après chaque DELETE** (et **non** `invalidateQueries`) :
 *   on doit attendre que le serveur réponde et que la cache soit fraîche avant
 *   de passer à l'entrée suivante (sinon mauvais calcul de capacité ADMIN,
 *   bandeau « Mode public » prématuré, etc.).
 * - Stop au premier échec → retourne `failedAt` + `remainingEntryIds` pour
 *   permettre la reprise. Pas de logique optimistic.
 */

export interface DeleteSequenceResult {
  deletedEntryIds: string[];
  remainingEntryIds: string[];
  failedAt?: { entryId: string; error: Error };
}

export interface RunSequentialDeleteInput {
  /** IDs à supprimer dans l'ordre. Le caller fournit déjà la séquence souhaitée. */
  entryIds: string[];
  /** Doit lever en cas d'échec serveur ; ne fait pas de retry. */
  deleteOne: (entryId: string) => Promise<void>;
  /**
   * **Doit retourner après que la cache liste a été mise à jour avec la donnée
   * serveur fraîche** (ex. `query.refetch().then(() => undefined)`). Ne PAS passer
   * `invalidateQueries` ici.
   */
  refetch: () => Promise<void>;
  /** Notifie l'avancement avant de passer à l'entrée suivante. */
  onProgress?: (done: number, total: number) => void;
  /**
   * Garde-fou self-lockout, appelé **avant** `deleteOne(entryId)`.
   * Si retourne `false`, la séquence s'arrête proprement (pas de `failedAt`,
   * `entryId` reste dans `remainingEntryIds`).
   */
  shouldDelete?: (entryId: string) => boolean | Promise<boolean>;
}

export async function runSequentialDelete(
  input: RunSequentialDeleteInput,
): Promise<DeleteSequenceResult> {
  const { entryIds, deleteOne, refetch, onProgress, shouldDelete } = input;
  const total = entryIds.length;
  const deletedEntryIds: string[] = [];

  for (let i = 0; i < entryIds.length; i++) {
    const entryId = entryIds[i]!;

    if (shouldDelete) {
      const ok = await shouldDelete(entryId);
      if (!ok) {
        return {
          deletedEntryIds,
          remainingEntryIds: entryIds.slice(i),
        };
      }
    }

    try {
      await deleteOne(entryId);
    } catch (err) {
      return {
        deletedEntryIds,
        remainingEntryIds: entryIds.slice(i),
        failedAt: { entryId, error: err as Error },
      };
    }

    await refetch();
    deletedEntryIds.push(entryId);
    onProgress?.(deletedEntryIds.length, total);
  }

  return { deletedEntryIds, remainingEntryIds: [] };
}
