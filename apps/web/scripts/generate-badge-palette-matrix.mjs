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

const TEXT_AUTO = {
  /** Pastel : max contraste sur fond clair (950) et sur fond sombre teinté (50). */
  pastel: (c) =>
    `text-${c}-950 font-medium dark:text-${c}-50`,
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
