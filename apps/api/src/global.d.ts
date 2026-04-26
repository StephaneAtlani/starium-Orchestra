/** Déclarations pour modules sans types ou résolution Docker. */
declare module 'csv-parse/sync' {
  export function parse(input: Buffer | string, options?: Record<string, unknown>): Record<string, string>[];
}
