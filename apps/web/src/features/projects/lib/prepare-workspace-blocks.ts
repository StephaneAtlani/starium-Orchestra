import type { PrepTypeCode } from './prepare-workspace-types';

export type PrepStdBlock = {
  id: string;
  title: string;
  defaultMin: number;
  /** Si vide = tous les types. */
  types: PrepTypeCode[];
};

/** Blocs vue simple — kit prep-workspace `PW_STD`. */
export const PW_STD_BLOCKS: PrepStdBlock[] = [
  { id: 'presents', title: 'Présents', defaultMin: 5, types: [] },
  { id: 'objectif', title: 'Objectif', defaultMin: 5, types: [] },
  { id: 'tour', title: 'Tour de table', defaultMin: 10, types: [] },
  { id: 'actions', title: 'Suivi des actions', defaultMin: 15, types: [] },
  {
    id: 'avancement',
    title: 'Avancement du projet',
    defaultMin: 15,
    types: [],
  },
  { id: 'planning', title: 'Le planning', defaultMin: 10, types: [] },
  { id: 'arbitrage', title: 'Arbitrages', defaultMin: 15, types: [] },
];

export function blocksForTypeCode(typeCode: PrepTypeCode): PrepStdBlock[] {
  return PW_STD_BLOCKS.filter(
    (b) => b.types.length === 0 || b.types.includes(typeCode),
  );
}

export function defaultSelectedBlockIds(typeCode: PrepTypeCode): string[] {
  return blocksForTypeCode(typeCode).map((b) => b.id);
}

export function findStdBlock(blockId: string): PrepStdBlock | undefined {
  return PW_STD_BLOCKS.find((b) => b.id === blockId);
}
