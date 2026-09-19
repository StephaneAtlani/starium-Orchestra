export type ProcedureTemplateOutlineItem = {
  level: 1 | 2 | 3;
  title: string;
};

export type NormalizedOutline = {
  items: ProcedureTemplateOutlineItem[];
  hierarchyWarnings: string[];
};

/**
 * Normalise l'outline et calcule des warnings d'imbrication (non bloquants).
 * Un niveau qui saute (ex. H1 → H3) produit un avertissement.
 */
export function normalizeProcedureTemplateOutline(
  raw: unknown,
): NormalizedOutline {
  if (!Array.isArray(raw)) {
    return { items: [], hierarchyWarnings: [] };
  }

  const items: ProcedureTemplateOutlineItem[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const levelRaw = (entry as { level?: unknown }).level;
    const titleRaw = (entry as { title?: unknown }).title;
    const level =
      levelRaw === 1 || levelRaw === 2 || levelRaw === 3
        ? levelRaw
        : levelRaw === '1' || levelRaw === '2' || levelRaw === '3'
          ? (Number(levelRaw) as 1 | 2 | 3)
          : null;
    if (level == null) continue;
    const title = typeof titleRaw === 'string' ? titleRaw.trim() : '';
    if (!title) continue;
    items.push({ level, title: title.slice(0, 200) });
  }

  const hierarchyWarnings: string[] = [];
  let prevLevel = 0;
  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    if (prevLevel > 0 && item.level > prevLevel + 1) {
      hierarchyWarnings.push(
        `Titre « ${item.title} » (H${item.level}) saute un niveau après H${prevLevel}`,
      );
    }
    prevLevel = item.level;
  }

  return { items, hierarchyWarnings };
}

export function outlineHasH1(items: ProcedureTemplateOutlineItem[]): boolean {
  return items.some((i) => i.level === 1);
}

function escapeHtmlText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Matérialise un outline en contentJson schemaVersion 2 (titre + p vide). */
export function contentJsonFromTemplateOutline(
  items: ProcedureTemplateOutlineItem[],
): { schemaVersion: 2; blocks: Array<{ t: string; html: string }> } {
  if (items.length === 0) {
    return {
      schemaVersion: 2,
      blocks: [
        { t: 'h1', html: '' },
        { t: 'p', html: '' },
      ],
    };
  }
  const blocks: Array<{ t: string; html: string }> = [];
  for (const item of items) {
    const t = item.level === 1 ? 'h1' : item.level === 2 ? 'h2' : 'h3';
    blocks.push({ t, html: escapeHtmlText(item.title) });
    blocks.push({ t: 'p', html: '' });
  }
  return { schemaVersion: 2, blocks };
}
