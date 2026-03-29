/**
 * Génère `badge-palette-matrix.generated.ts` avec des littéraux Tailwind complets
 * (requis pour le scan de classes).
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

const SURFACES = {
  pastel: (c) =>
    `border-${c}-200 bg-${c}-100 dark:border-${c}-800 dark:bg-${c}-950/70`,
  soft: (c) =>
    `border-${c}-300 bg-${c}-200 dark:border-${c}-700 dark:bg-${c}-900/80`,
  solid: (c) =>
    `border-${c}-600 bg-${c}-500 dark:border-${c}-500 dark:bg-${c}-600`,
  dark: (c) =>
    `border-${c}-900 bg-${c}-800 dark:border-${c}-950 dark:bg-${c}-950`,
  outline: (c) =>
    `border-2 border-${c}-500 bg-transparent dark:border-${c}-400`,
};

/** Texte « automatique » : contraste selon surface */
const TEXT_AUTO = {
  pastel: (c) => `text-${c}-900 dark:text-${c}-50`,
  soft: (c) => `text-${c}-950 dark:text-${c}-50`,
  solid: () => 'text-white dark:text-white',
  dark: () => 'text-white dark:text-white',
  outline: (c) => `text-${c}-900 dark:text-${c}-100`,
};

const SURFACE_ORDER = ['pastel', 'soft', 'solid', 'dark', 'outline'];

let src = `/* eslint-disable max-len -- littéraux Tailwind générés */
/**
 * Fichier généré — ne pas éditer à la main.
 * \`node apps/web/scripts/generate-badge-palette-matrix.mjs\`
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
    const val = s === 'solid' || s === 'dark' ? fn() : fn(c);
    src += `    ${s}: '${val}',\n`;
  }
  src += `  },\n`;
}
src += `} as const;
`;

writeFileSync(outPath, src, 'utf8');
console.log('Wrote', outPath);
