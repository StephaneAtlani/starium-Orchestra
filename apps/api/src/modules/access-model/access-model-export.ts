import { escapeCsvCell } from '../license-reporting/license-reporting.csv';
import type { AccessModelIssueItem } from './access-model.types';

const BOM = '\uFEFF';

export function sanitizeAccessModelExportFilenamePart(
  clientSlug: string | null | undefined,
  clientId: string,
): string {
  const raw = (clientSlug?.trim() || clientId).slice(0, 200);
  const ascii = raw
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, '-')
    .replace(/["'/\\;\r\n\u0000-\u001f]/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (!ascii || ascii.length > 80) {
    return clientId;
  }
  return ascii;
}

export function buildAccessModelExportFilename(
  clientSlug: string | null | undefined,
  clientId: string,
  dateIso: string,
): string {
  const safe = sanitizeAccessModelExportFilenamePart(clientSlug, clientId);
  const date = dateIso.slice(0, 10);
  return `access-model-issues-${safe}-${date}.csv`;
}

export function issuesToCsv(
  items: AccessModelIssueItem[],
  delimiter: ',' | ';' = ',',
): string {
  const headers = [
    'category',
    'module',
    'resourceLabel',
    'resourceType',
    'resourceId',
    'detail',
    'suggestedAction',
    'deepLinkPath',
  ];
  const sep = delimiter;
  const escape = (value: string | number | null | undefined) => {
    const str = escapeCsvCell(value);
    if (sep === ';' && str && !str.startsWith('"') && /[;\n\r]/.test(str)) {
      return `"${String(value ?? '').replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines: string[] = [];
  lines.push(headers.map((h) => escape(h)).join(sep));
  for (const item of items) {
    const resourceId = item.resourceId?.trim();
    if (!resourceId) {
      throw new Error(
        `Export access-model : resourceId manquant pour issue ${item.id} (${item.category})`,
      );
    }
    lines.push(
      [
        item.category,
        item.module,
        item.label,
        item.resourceType ?? '',
        resourceId,
        item.subtitle ?? '',
        item.correctiveAction.label,
        item.correctiveAction.href,
      ]
        .map((cell) => escape(cell))
        .join(sep),
    );
  }
  return BOM + lines.join('\n') + '\n';
}
