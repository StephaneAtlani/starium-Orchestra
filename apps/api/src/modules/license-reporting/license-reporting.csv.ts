/**
 * Helpers CSV minimalistes pour exports RFC-ACL-012.
 * Format : RFC 4180, séparateur `,`, BOM UTF-8, escape `"` -> `""`.
 */

const BOM = '\uFEFF';

export function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function rowsToCsv(headers: string[], rows: Array<Array<string | number | null>>): string {
  const lines: string[] = [];
  lines.push(headers.map((h) => escapeCsvCell(h)).join(','));
  for (const row of rows) {
    lines.push(row.map((cell) => escapeCsvCell(cell)).join(','));
  }
  return BOM + lines.join('\n') + '\n';
}
