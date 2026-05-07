import type { CockpitMember } from '../api/licenses-cockpit';
import {
  getLicenseExpirationStatus,
  isModeWithExpiration,
} from './license-status';
import type { CockpitFilters } from '../components/license-cockpit-filters';

/**
 * Applique les filtres combinés du cockpit licences sur la liste des membres.
 * Les filtres "all" sont des no-op ; la recherche est insensible à la casse.
 */
export function applyCockpitFilters(
  members: CockpitMember[],
  filters: CockpitFilters,
): CockpitMember[] {
  const search = filters.search.trim().toLowerCase();
  return members.filter((m) => {
    if (search) {
      const haystack = [m.firstName, m.lastName, m.email]
        .filter(Boolean)
        .map((s) => String(s).toLowerCase())
        .join(' ');
      if (!haystack.includes(search)) return false;
    }
    if (filters.mode !== 'all') {
      if (filters.mode === 'READ_ONLY') {
        if (m.licenseType !== 'READ_ONLY') return false;
      } else if (m.licenseBillingMode !== filters.mode) {
        return false;
      }
    }
    if (filters.subscriptionId !== 'all') {
      if (m.subscriptionId !== filters.subscriptionId) return false;
    }
    if (filters.status !== 'all') {
      const expirable = isModeWithExpiration(m.licenseBillingMode);
      const status = getLicenseExpirationStatus(
        m.licenseEndsAt,
        m.licenseBillingMode,
      );
      if (filters.status === 'expired') {
        if (!expirable || status.kind !== 'expired') return false;
      } else if (filters.status === 'soon') {
        if (!expirable || status.kind !== 'soon') return false;
      } else if (filters.status === 'active') {
        if (expirable && status.kind === 'expired') return false;
      }
    }
    return true;
  });
}
