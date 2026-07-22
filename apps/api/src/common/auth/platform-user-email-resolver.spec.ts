import {
  dedupeUserIds,
  getEligibleUserIds,
  matchProvisioningFromResolution,
  normalizeEmailCandidates,
} from './platform-user-email-resolver';

describe('platform-user-email-resolver', () => {
  it('dedupeUserIds removes duplicates', () => {
    expect(dedupeUserIds(['a', 'b', 'a'])).toEqual(['a', 'b']);
  });

  it('getEligibleUserIds unions primary and verified only', () => {
    const result = {
      primaryUserIds: ['u1'],
      verifiedIdentityUserIds: ['u2', 'u1'],
      unverifiedIdentityUserIds: ['u3'],
    };
    expect(getEligibleUserIds(result).sort()).toEqual(['u1', 'u2']);
  });

  it('matchProvisioningFromResolution returns not_found when eligible empty', () => {
    expect(
      matchProvisioningFromResolution({
        primaryUserIds: [],
        verifiedIdentityUserIds: [],
        unverifiedIdentityUserIds: ['u1'],
      }).kind,
    ).toBe('not_found');
  });

  it('matchProvisioningFromResolution returns matched for single eligible', () => {
    const match = matchProvisioningFromResolution({
      primaryUserIds: ['u1'],
      verifiedIdentityUserIds: [],
      unverifiedIdentityUserIds: [],
    });
    expect(match).toEqual({ kind: 'matched', userId: 'u1' });
  });

  it('matchProvisioningFromResolution returns ambiguous for multiple eligible', () => {
    const match = matchProvisioningFromResolution({
      primaryUserIds: ['u1'],
      verifiedIdentityUserIds: ['u2'],
      unverifiedIdentityUserIds: [],
    });
    expect(match).toEqual({ kind: 'ambiguous', userIds: ['u1', 'u2'] });
  });

  it('normalizeEmailCandidates trims and dedupes', () => {
    expect(
      normalizeEmailCandidates(['  A@B.fr ', 'a@b.fr', null, 'invalid']),
    ).toEqual(['a@b.fr']);
  });
});
