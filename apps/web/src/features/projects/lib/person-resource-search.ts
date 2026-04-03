import { formatResourceDisplayName } from '@/lib/resource-labels';
import type { ResourceListItem } from '@/services/resources';

/** Filtre catalogue Humaine : accents ignorés, plusieurs mots (tous requis). */
export function normalizeSearchText(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();
}

export function personResourceMatchesSearch(r: ResourceListItem, rawQuery: string): boolean {
  const q = rawQuery.trim();
  if (!q) return true;
  const hay = [
    formatResourceDisplayName(r),
    r.firstName ?? '',
    r.name,
    r.email ?? '',
    r.code ?? '',
    r.companyName ?? '',
    r.role?.name ?? '',
    r.role?.code ?? '',
  ]
    .join(' ')
    .trim();
  const nh = normalizeSearchText(hay);
  const tokens = normalizeSearchText(q)
    .split(/\s+/)
    .filter(Boolean);
  return tokens.every((t) => nh.includes(t));
}
