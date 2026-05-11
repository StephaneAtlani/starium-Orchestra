import { describe, expect, it, vi } from 'vitest';
import { runSequentialDelete } from './delete-sequence';

describe('runSequentialDelete', () => {
  it('succès complet (5/5) — DELETE puis refetch dans l’ordre', async () => {
    const order: string[] = [];
    const deleteOne = vi.fn(async (id: string) => {
      order.push(`del:${id}`);
    });
    const refetch = vi.fn(async () => {
      order.push('refetch');
    });
    const onProgress = vi.fn();

    const result = await runSequentialDelete({
      entryIds: ['e1', 'e2', 'e3', 'e4', 'e5'],
      deleteOne,
      refetch,
      onProgress,
    });

    expect(result.deletedEntryIds).toEqual(['e1', 'e2', 'e3', 'e4', 'e5']);
    expect(result.remainingEntryIds).toEqual([]);
    expect(result.failedAt).toBeUndefined();
    expect(deleteOne).toHaveBeenCalledTimes(5);
    expect(refetch).toHaveBeenCalledTimes(5);

    expect(order).toEqual([
      'del:e1',
      'refetch',
      'del:e2',
      'refetch',
      'del:e3',
      'refetch',
      'del:e4',
      'refetch',
      'del:e5',
      'refetch',
    ]);
    expect(onProgress.mock.calls).toEqual([
      [1, 5],
      [2, 5],
      [3, 5],
      [4, 5],
      [5, 5],
    ]);
  });

  it('échec partiel à la 3ᵉ → failedAt + remainingEntryIds [e3,e4,e5]', async () => {
    const error = new Error('boom');
    const deleteOne = vi.fn(async (id: string) => {
      if (id === 'e3') throw error;
    });
    const refetch = vi.fn(async () => undefined);

    const result = await runSequentialDelete({
      entryIds: ['e1', 'e2', 'e3', 'e4', 'e5'],
      deleteOne,
      refetch,
    });

    expect(result.deletedEntryIds).toEqual(['e1', 'e2']);
    expect(result.remainingEntryIds).toEqual(['e3', 'e4', 'e5']);
    expect(result.failedAt).toEqual({ entryId: 'e3', error });
    expect(deleteOne).toHaveBeenCalledTimes(3);
    expect(refetch).toHaveBeenCalledTimes(2);
  });

  it('await refetch() bloque deleteOne(n+1) jusqu’à résolution (test imposé n°3)', async () => {
    const events: string[] = [];
    let resolveFirstRefetch: () => void = () => undefined;
    const firstRefetch = new Promise<void>((res) => {
      resolveFirstRefetch = res;
    });

    let refetchCalls = 0;
    const refetch = vi.fn(async () => {
      refetchCalls += 1;
      events.push(`refetch:start:${refetchCalls}`);
      if (refetchCalls === 1) {
        await firstRefetch;
      }
      events.push(`refetch:end:${refetchCalls}`);
    });

    const deleteOne = vi.fn(async (id: string) => {
      events.push(`delete:${id}`);
    });

    const promise = runSequentialDelete({
      entryIds: ['e1', 'e2'],
      deleteOne,
      refetch,
    });

    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(events).toContain('delete:e1');
    expect(events).toContain('refetch:start:1');
    expect(events).not.toContain('delete:e2');

    resolveFirstRefetch();
    const result = await promise;

    expect(result.deletedEntryIds).toEqual(['e1', 'e2']);
    expect(events.indexOf('refetch:end:1')).toBeLessThan(
      events.indexOf('delete:e2'),
    );
  });

  it('reprise après échec : nouvel appel sur remainingEntryIds repart de e3', async () => {
    const error = new Error('boom');
    let attempt = 0;
    const deleteOne = vi.fn(async (id: string) => {
      if (id === 'e3' && attempt === 0) {
        attempt = 1;
        throw error;
      }
    });
    const refetch = vi.fn(async () => undefined);

    const first = await runSequentialDelete({
      entryIds: ['e1', 'e2', 'e3', 'e4', 'e5'],
      deleteOne,
      refetch,
    });
    expect(first.failedAt?.entryId).toBe('e3');

    const second = await runSequentialDelete({
      entryIds: first.remainingEntryIds,
      deleteOne,
      refetch,
    });

    expect(second.deletedEntryIds).toEqual(['e3', 'e4', 'e5']);
    expect(second.remainingEntryIds).toEqual([]);
    expect(second.failedAt).toBeUndefined();
  });

  it('shouldDelete=false → arrêt propre, pas de failedAt', async () => {
    const deleteOne = vi.fn(async () => undefined);
    const refetch = vi.fn(async () => undefined);
    const shouldDelete = vi.fn((id: string) => id !== 'e3');

    const result = await runSequentialDelete({
      entryIds: ['e1', 'e2', 'e3', 'e4'],
      deleteOne,
      refetch,
      shouldDelete,
    });

    expect(result.deletedEntryIds).toEqual(['e1', 'e2']);
    expect(result.remainingEntryIds).toEqual(['e3', 'e4']);
    expect(result.failedAt).toBeUndefined();
    expect(deleteOne).toHaveBeenCalledTimes(2);
  });

  it('liste vide → résultat vide, aucun appel', async () => {
    const deleteOne = vi.fn(async () => undefined);
    const refetch = vi.fn(async () => undefined);
    const result = await runSequentialDelete({
      entryIds: [],
      deleteOne,
      refetch,
    });
    expect(result.deletedEntryIds).toEqual([]);
    expect(result.remainingEntryIds).toEqual([]);
    expect(deleteOne).not.toHaveBeenCalled();
    expect(refetch).not.toHaveBeenCalled();
  });
});
