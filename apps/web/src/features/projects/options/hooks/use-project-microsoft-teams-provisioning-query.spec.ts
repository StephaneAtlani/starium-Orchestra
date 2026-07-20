import { describe, expect, it } from 'vitest';

/** Logique refetchInterval extraite du hook pour test unitaire stable. */
function provisioningRefetchInterval(data: { status: string } | null | undefined): false | number {
  if (!data) return false;
  return data.status === 'PENDING' || data.status === 'IN_PROGRESS' ? 5_000 : false;
}

describe('useProjectMicrosoftTeamsProvisioningQuery polling policy', () => {
  it('actif pour PENDING/IN_PROGRESS', () => {
    expect(provisioningRefetchInterval({ status: 'PENDING' })).toBe(5000);
    expect(provisioningRefetchInterval({ status: 'IN_PROGRESS' })).toBe(5000);
  });

  it('arrêté pour statuts terminaux', () => {
    expect(provisioningRefetchInterval({ status: 'COMPLETED' })).toBe(false);
    expect(provisioningRefetchInterval({ status: 'FAILED' })).toBe(false);
    expect(provisioningRefetchInterval({ status: 'PARTIAL' })).toBe(false);
    expect(provisioningRefetchInterval(null)).toBe(false);
  });
});
