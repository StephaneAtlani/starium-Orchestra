#!/usr/bin/env node
/**
 * Audit conformité modales Starium.
 * Usage: node scripts/audit-modals.mjs
 * Exit 0 si aucun problème structurel ; exit 1 sinon.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '../apps/web/src');

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

const structuralIssues = [];
const formIssues = [];

for (const file of walk(ROOT)) {
  const rel = file.replace(ROOT + '/', '');
  const text = readFileSync(file, 'utf8');
  if (!text.includes('DialogContent')) continue;
  if (rel.includes('components/ui/dialog.tsx')) continue;
  if (rel.includes('form-dialog-shell')) continue;
  if (text.includes('sidePanel') || text.includes('chatWidget')) continue;

  if (text.includes('-mx-4 -mt-4')) {
    structuralIssues.push(`${rel}: legacy header (-mx-4 -mt-4)`);
  }
  if (/layout=["']legacy["']/.test(text)) {
    structuralIssues.push(`${rel}: layout=legacy`);
  }

  const hasStariumForm =
    text.includes('starium-form') || text.includes('StariumModal');
  const hasRawInputs = /className="h-9 w-full rounded-md border border-input/.test(text);
  if (hasRawInputs && !hasStariumForm) {
    formIssues.push(`${rel}: champs hors starium-form-*`);
  }
}

console.log('=== Audit modales Starium ===\n');
console.log(`Structure: ${structuralIssues.length} problème(s)`);
structuralIssues.forEach((line) => console.log('  -', line));
console.log(`\nFormulaires: ${formIssues.length} fichier(s) avec inputs legacy`);
formIssues.slice(0, 20).forEach((line) => console.log('  -', line));
if (formIssues.length > 20) {
  console.log(`  ... +${formIssues.length - 20} autres`);
}

const failed = structuralIssues.length > 0;
process.exit(failed ? 1 : 0);
