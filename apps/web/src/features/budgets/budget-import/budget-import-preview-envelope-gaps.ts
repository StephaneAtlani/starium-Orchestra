import type { PreviewRowResult } from '../types/budget-imports.types';

export interface MissingEnvelopeGap {
  code: string;
  rowCount: number;
  suggestedName: string;
}

export function envelopeCodeFromPreviewRow(row: PreviewRowResult): string | null {
  const d = row.data;
  if (!d || typeof d !== 'object') return null;
  const raw = d.envelopeCode ?? d.envelope;
  if (raw == null) return null;
  const code = String(raw).trim();
  return code.length > 0 ? code : null;
}

export function extractMissingEnvelopeGaps(rows: PreviewRowResult[]): MissingEnvelopeGap[] {
  const map = new Map<string, { count: number; sampleName?: string }>();

  for (const row of rows) {
    if (row.reason !== 'MISSING_ENVELOPE') continue;
    const code = envelopeCodeFromPreviewRow(row);
    if (!code) continue;
    const key = code.toUpperCase();
    const existing = map.get(key) ?? { count: 0 };
    existing.count += 1;
    if (!existing.sampleName) {
      const name = row.data?.name ?? row.data?.label;
      if (name != null && String(name).trim()) {
        existing.sampleName = String(name).trim();
      }
    }
    map.set(key, existing);
  }

  return [...map.entries()]
    .map(([code, meta]) => ({
      code,
      rowCount: meta.count,
      suggestedName: meta.sampleName ?? `Enveloppe ${code}`,
    }))
    .sort((a, b) => a.code.localeCompare(b.code, 'fr'));
}

export function countMissingEnvelopeWithoutCode(rows: PreviewRowResult[]): number {
  return rows.filter(
    (row) => row.reason === 'MISSING_ENVELOPE' && !envelopeCodeFromPreviewRow(row),
  ).length;
}

export function countNoMatchUpdateOnly(rows: PreviewRowResult[]): number {
  return rows.filter((row) => row.reason === 'NO_MATCH_UPDATE_ONLY').length;
}
