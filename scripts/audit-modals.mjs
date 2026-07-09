#!/usr/bin/env node
/**
 * Audit conformité modales Starium.
 * Usage: node scripts/audit-modals.mjs
 * Exit 0 si conforme ; exit 1 si usages DialogContent directs hors socle.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '../apps/web/src');

const ALLOWED_DIALOG_CONTENT = new Set([
  'components/ui/dialog.tsx',
  'components/layout/form-dialog-shell.tsx',
  'components/ui/dialog.spec.tsx',
]);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === 'node_modules') continue;
      walk(p, out);
    } else if (name.endsWith('.tsx') && !name.includes('.spec.')) {
      out.push(p);
    }
  }
  return out;
}

const directDialogContent = [];
const formIssues = [];
let stariumModalCount = 0;

for (const file of walk(ROOT)) {
  const rel = file.replace(ROOT + '/', '');
  const text = readFileSync(file, 'utf8');

  if (text.includes('StariumModal') || text.includes('FormDialogShell')) {
    stariumModalCount += 1;
  }

  if (!text.includes('DialogContent')) continue;
  if (ALLOWED_DIALOG_CONTENT.has(rel)) continue;
  if (rel.includes('.spec.')) continue;

  // Nom de type ou commentaire uniquement
  if (
    !/<DialogContent[\s>]/.test(text) &&
    !text.includes('from \'@/components/ui/dialog\'') &&
    !text.includes('from "@/components/ui/dialog"')
  ) {
    continue;
  }

  if (/<DialogContent[\s>]/.test(text) || /import[\s\S]*DialogContent/.test(text)) {
    directDialogContent.push(rel);
  }

  const hasStariumForm =
    text.includes('starium-form') || text.includes('StariumModal');
  const hasRawInputs = /className="h-9 w-full rounded-md border border-input/.test(text);
  if (hasRawInputs && !hasStariumForm) {
    formIssues.push(`${rel}: champs hors starium-form-*`);
  }
}

console.log('=== Audit modales Starium ===\n');
console.log(`Fichiers StariumModal/FormDialogShell : ${stariumModalCount}`);
console.log(`DialogContent direct (hors socle) : ${directDialogContent.length}`);
directDialogContent.forEach((line) => console.log('  -', line));
console.log(`\nFormulaires legacy : ${formIssues.length}`);
formIssues.forEach((line) => console.log('  -', line));

const failed = directDialogContent.length > 0 || formIssues.length > 0;
process.exit(failed ? 1 : 0);
