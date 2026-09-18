export const EMPTY_PROCEDURE_DOC = {
  schemaVersion: 2,
  blocks: [
    { t: 'h1', html: '' },
    { t: 'p', html: '' },
  ],
} as const;

export type ProcedureContentJson = {
  schemaVersion: 2;
  blocks: unknown[];
};
