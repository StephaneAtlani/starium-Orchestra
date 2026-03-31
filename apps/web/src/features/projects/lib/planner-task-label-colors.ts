/**
 * Couleurs proches des pastilles Microsoft Planner / Teams (libellés par slot category1…25).
 * Graph ne fournit pas les couleurs ; elles sont fixes par index comme dans l’UI Teams.
 */
const PLANNER_CATEGORY_HEX: readonly string[] = [
  '#E74856', // 1 — rouge
  '#FF8C00', // 2 — orange
  '#FFB900', // 3 — jaune / ambre
  '#107C10', // 4 — vert
  '#0078D4', // 5 — bleu
  '#8764B8', // 6 — violet
  '#C239B3', // 7 — magenta
  '#00A4A6', // 8 — sarcelle
  '#CA5010', // 9 — orange foncé
  '#567C73', // 10 — gris-vert
  '#498205', // 11 — olive
  '#881798', // 12 — prune
  '#038387', // 13 — cyan
  '#5C2D91', // 14 — violet profond
  '#D13438', // 15 — cramoisi
  '#EAA300', // 16 — or
  '#004E8C', // 17 — bleu marine
  '#8F5900', // 18 — brun
  '#486991', // 19 — bleu acier
  '#AD0052', // 20 — framboise
  '#00B294', // 21 — menthe
  '#4F6BED', // 22 — pervenche
  '#69797E', // 23 — gris
  '#B84E4E', // 24 — rouge poussiéreux
  '#9B6F1F', // 25 — bronze
];

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const s = hex.trim();
  const m6 = s.match(/^#([0-9a-fA-F]{6})$/);
  if (m6) {
    const n = parseInt(m6[1], 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  const m3 = s.match(/^#([0-9a-fA-F]{3})$/);
  if (m3) {
    const x = m3[1];
    return {
      r: parseInt(x[0] + x[0], 16),
      g: parseInt(x[1] + x[1], 16),
      b: parseInt(x[2] + x[2], 16),
    };
  }
  return null;
}

/** Luminance relative (sRGB) → texte lisible sur fond coloré (style Teams : souvent blanc). */
export function pickReadableTextOnBackground(backgroundHex: string): string {
  const rgb = parseHex(backgroundHex);
  if (!rgb) return '#ffffff';
  const lin = (c: number) => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  const L = 0.2126 * lin(rgb.r) + 0.7152 * lin(rgb.g) + 0.0722 * lin(rgb.b);
  return L > 0.45 ? '#1c1c1c' : '#ffffff';
}

export function plannerCategoryColorHex(
  plannerCategoryId: string | null | undefined,
): string | null {
  if (!plannerCategoryId || !/^category\d+$/.test(plannerCategoryId)) return null;
  const n = Number(plannerCategoryId.replace('category', ''));
  if (n < 1 || n > 25) return null;
  return PLANNER_CATEGORY_HEX[n - 1] ?? null;
}

/**
 * Couleur de pastille : API `color` (#hex) si présente, sinon palette Planner si `plannerCategoryId`.
 */
export function resolveTaskLabelDisplayColor(
  plannerCategoryId: string | null | undefined,
  colorFromApi: string | null | undefined,
): string {
  const trimmed = colorFromApi?.trim();
  if (trimmed && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed)) {
    return trimmed;
  }
  const fromCat = plannerCategoryColorHex(plannerCategoryId);
  if (fromCat) return fromCat;
  return '#94a3b8';
}
