/** Déclarations pour modules sans types ou résolution Docker. */
declare module 'xlsx' {
  const XLSX: {
    read: (data: unknown, opts?: unknown) => { SheetNames: string[]; Sheets: Record<string, unknown> };
    utils: { sheet_to_json: <T>(sheet: unknown, opts?: unknown) => T[] };
    [key: string]: unknown;
  };
  export = XLSX;
}

declare module 'csv-parse/sync' {
  export function parse(input: Buffer | string, options?: Record<string, unknown>): Record<string, string>[];
}
