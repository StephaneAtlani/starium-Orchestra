import type { ProcedureTemplateOutlineItem } from '../types/procedure.types';

/** Warnings non bloquants — miroir du util API. */
export function outlineHierarchyWarnings(
  items: ProcedureTemplateOutlineItem[],
): string[] {
  const warnings: string[] = [];
  let prevLevel = 0;
  for (const item of items) {
    if (prevLevel > 0 && item.level > prevLevel + 1) {
      warnings.push(
        `Titre « ${item.title || 'sans libellé'} » (H${item.level}) saute un niveau après H${prevLevel}`,
      );
    }
    prevLevel = item.level;
  }
  return warnings;
}
