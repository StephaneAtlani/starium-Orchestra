export const EMPTY_PROCEDURE_DOC: {
  type: 'doc';
  content: Array<{ type: string }>;
} = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

export type ProcedureContentJson = {
  type: 'doc';
  content?: unknown[];
};
