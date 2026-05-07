import { describe, expect, it } from 'vitest';
import { applyCockpitFilters } from './apply-filters';
import type { CockpitMember } from '../api/licenses-cockpit';

function makeMember(overrides: Partial<CockpitMember>): CockpitMember {
  return {
    id: 'u-default',
    email: 'default@test.fr',
    firstName: 'Jean',
    lastName: 'Dupont',
    role: 'CLIENT_USER',
    status: 'ACTIVE',
    licenseType: 'READ_WRITE',
    licenseBillingMode: 'CLIENT_BILLABLE',
    subscriptionId: 'sub-1',
    licenseStartsAt: null,
    licenseEndsAt: null,
    licenseAssignmentReason: null,
    ...overrides,
  };
}

const members: CockpitMember[] = [
  makeMember({ id: 'u1', email: 'jean@test.fr' }),
  makeMember({
    id: 'u2',
    email: 'eval@test.fr',
    firstName: 'Marie',
    lastName: 'Curie',
    licenseBillingMode: 'EVALUATION',
    licenseEndsAt: '2030-01-01T00:00:00.000Z',
    subscriptionId: null,
  }),
  makeMember({
    id: 'u3',
    email: 'expired@test.fr',
    licenseBillingMode: 'EVALUATION',
    licenseEndsAt: '2020-01-01T00:00:00.000Z',
    subscriptionId: null,
  }),
  makeMember({
    id: 'u4',
    email: 'ro@test.fr',
    licenseType: 'READ_ONLY',
    licenseBillingMode: 'NON_BILLABLE',
    subscriptionId: null,
  }),
];

describe('applyCockpitFilters', () => {
  it('respects search across name and email (case-insensitive)', () => {
    const out = applyCockpitFilters(members, {
      search: 'CURIE',
      status: 'all',
      mode: 'all',
      subscriptionId: 'all',
    });
    expect(out.map((m) => m.id)).toEqual(['u2']);
  });

  it('filters by mode READ_ONLY', () => {
    const out = applyCockpitFilters(members, {
      search: '',
      status: 'all',
      mode: 'READ_ONLY',
      subscriptionId: 'all',
    });
    expect(out.map((m) => m.id)).toEqual(['u4']);
  });

  it('filters by billing mode EVALUATION', () => {
    const out = applyCockpitFilters(members, {
      search: '',
      status: 'all',
      mode: 'EVALUATION',
      subscriptionId: 'all',
    });
    expect(out.map((m) => m.id).sort()).toEqual(['u2', 'u3']);
  });

  it('filters expired evaluations', () => {
    const out = applyCockpitFilters(members, {
      search: '',
      status: 'expired',
      mode: 'all',
      subscriptionId: 'all',
    });
    expect(out.map((m) => m.id)).toEqual(['u3']);
  });

  it('filters by subscriptionId', () => {
    const out = applyCockpitFilters(members, {
      search: '',
      status: 'all',
      mode: 'all',
      subscriptionId: 'sub-1',
    });
    expect(out.map((m) => m.id)).toEqual(['u1']);
  });
});
