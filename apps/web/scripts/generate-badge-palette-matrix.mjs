/**
 * Génère `badge-palette-matrix.generated.ts` — surfaces : pastel | dark (Foncé) | vivid (Vif).
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, '../src/lib/ui/badge-palette-matrix.generated.ts');

const COLORS = [
  'slate',
  'gray',
  'zinc',
  'stone',
  'red',
  'orange',
  'amber',
  'yellow',
  'rose',
  'pink',
  'fuchsia',
  'purple',
  'violet',
  'indigo',
  'blue',
  'sky',
  'cyan',
  'teal',
  'emerald',
  'green',
  'lime',
];

/**
 * Pastel : mode clair = teintes 50–200 (plus doux que 100 seul).
 * Mode sombre = voile coloré léger (opacity / mid-hue), pas bg-950 (sinon ce n’est plus « pastel »).
 * Réf. usages courants Tailwind : slash opacity sur la teinte (ex. bg-blue-500/15).
 */
const pastel = (c) =>
  `border-${c}-200/80 bg-${c}-50 dark:border-${c}-400/35 dark:bg-${c}-400/18`;

/** Foncé : profond, peu saturé (lisible, sobre) */
const dark = (c) =>
  `border-${c}-900 bg-${c}-800 dark:border-${c}-950 dark:bg-${c}-950`;

/** Vif : saturation forte, pastille « punch » */
const vivid = (c) =>
  `border-${c}-600 bg-${c}-500 shadow-sm dark:border-${c}-500 dark:bg-${c}-600`;

const SURFACES = { pastel, dark, vivid };

/**
 * Texte auto sur pastel :
 * - Clair : 950 (ou neutre pour jaune/citron/ambre).
 * - Sombre : **pas** `text-*-50` (presque blanc) — on utilise `*-500` pour garder la teinte
 *   sans effet « toujours blanc » sur le voile `dark:bg-*-400/18`.
 */
const PASTEL_AUTO_LIGHT_TEXT_NEUTRAL = new Set(['yellow', 'lime', 'amber']);

function pastelTextAuto(c) {
  const light = PASTEL_AUTO_LIGHT_TEXT_NEUTRAL.has(c)
    ? 'text-neutral-900'
    : `text-${c}-900`;
  return `${light} font-semibold dark:text-${c}-500`;
}

const TEXT_AUTO = {
  pastel: (c) => pastelTextAuto(c),
  dark: () => 'text-white dark:text-white',
  vivid: () => 'text-white dark:text-white',
};

const SURFACE_ORDER = ['pastel', 'dark', 'vivid'];

let src = `/* eslint-disable max-len -- littéraux Tailwind générés */
/**
 * Fichier généré — ne pas éditer à la main.
 * \`pnpm --filter @starium-orchestra/web run generate:badge-matrix\`
 */

export const PALETTE_SURFACE_BASE = {
`;

for (const c of COLORS) {
  src += `  ${c}: {\n`;
  for (const s of SURFACE_ORDER) {
    src += `    ${s}: '${SURFACES[s](c)}',\n`;
  }
  src += `  },\n`;
}
src += `} as const;

export const PALETTE_TEXT_AUTO = {
`;

for (const c of COLORS) {
  src += `  ${c}: {\n`;
  for (const s of SURFACE_ORDER) {
    const fn = TEXT_AUTO[s];
    const val = s === 'pastel' ? fn(c) : fn();
    src += `    ${s}: '${val}',\n`;
  }
  src += `  },\n`;
}
src += `} as const;
`;

writeFileSync(outPath, src, 'utf8');
console.log('Wrote', outPath);
