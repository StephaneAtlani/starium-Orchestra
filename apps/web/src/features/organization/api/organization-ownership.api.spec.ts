import { describe, expect, it, vi } from 'vitest';
import { postOwnershipTransfer } from './organization-ownership.api';

describe('organization-ownership.api', () => {
  it('postOwnershipTransfer sends dryRun then confirmApply payload', async () => {
    const authFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ dryRun: true, applied: false, countsByType: {} }),
    });

    await postOwnershipTransfer(authFetch as never, {
      fromOrgUnitId: 'from',
      toOrgUnitId: 'to',
      resourceTypes: ['PROJECT'],
      dryRun: true,
    });

    expect(authFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/organization/ownership-transfers'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          fromOrgUnitId: 'from',
          toOrgUnitId: 'to',
          resourceTypes: ['PROJECT'],
          dryRun: true,
        }),
      }),
    );
  });
});
