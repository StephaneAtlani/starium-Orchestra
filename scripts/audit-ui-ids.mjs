#!/usr/bin/env node
/**
 * Audit « valeur, jamais l'ID » — règle Starium non négociable.
 *
 * Détecte les identifiants techniques susceptibles d'être rendus visibles dans
 * l'UI de apps/web. Exit 0 si conforme, exit 1 sinon.
 *
 * Usage :
 *   node scripts/audit-ui-ids.mjs
 *   node scripts/audit-ui-ids.mjs --json
 *
 * Une exception légitime (outil de diagnostic technique, page dev) se déclare
 * dans scripts/audit-ui-ids.allowlist.json avec une justification écrite.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const WEB_SRC = join(import.meta.dirname, '../apps/web/src');
const ALLOWLIST_PATH = join(import.meta.dirname, 'audit-ui-ids.allowlist.json');

const allowlist = JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf8'));
const allowedFiles = new Map(
  Object.entries(allowlist.files ?? {}).map(([file, reason]) => [file, reason]),
);

/** Dernier segment d'un chemin d'accès : `a.b.ownerUserId` -> `ownerUserId`. */
function lastSegment(expression) {
  const parts = expression.split(/\??\./);
  return parts[parts.length - 1] ?? '';
}

function isIdSegment(segment) {
  return /^(?:id|_id)$/.test(segment) || /^[a-z][\w$]*Id$/.test(segment);
}

/** Vrai si l'expression désigne clairement un identifiant technique. */
function isIdExpression(expression) {
  const cleaned = expression.trim().replace(/[!)\s]+$/, '');
  if (!cleaned) return false;
  if (/[(]/.test(cleaned)) return false; // appel de fonction : trop ambigu
  if (/error/i.test(cleaned)) return false; // messages de validation, pas des IDs
  return isIdSegment(lastSegment(cleaned));
}

const ID_PATH = String.raw`[A-Za-z_$][\w$]*(?:\??\.[A-Za-z_$][\w$]*)*`;
const LABEL_PATH = String.raw`[A-Za-z_$][\w$]*(?:\??\.[A-Za-z_$][\w$]*)*(?:\([^()]*\))?(?:\??\.[A-Za-z_$][\w$]*)*`;

const LABEL_SEGMENT =
  /^(?:name|label|title|code|text|caption|subject|reference|libelle|nom|intitule|displayName|fullName|firstName|lastName|email|shortName|heading|summary|value)$/i;

/**
 * Vrai si l'expression produit un libellé destiné à l'affichage — c'est la
 * partie gauche typique de l'anti-pattern `entity.name ?? entity.id`.
 */
function isLabelExpression(expression) {
  const cleaned = expression.trim();
  if (/\.(?:get|find)\s*\(/.test(cleaned)) return true;
  const withoutCalls = cleaned.replace(/\([^()]*\)/g, '');
  const segments = withoutCalls.split(/\??\./).filter(Boolean);
  return segments.some((segment) => LABEL_SEGMENT.test(segment));
}

const RULES = [
  {
    id: 'fallback-vers-id',
    label:
      'Repli sur un identifiant (`libellé ?? entity.id`) : utiliser displayLabel() avec un texte métier',
    scan(line) {
      const found = [];
      const re = new RegExp(
        String.raw`(${LABEL_PATH})\s*(?:\?\?|\|\|)\s*(${ID_PATH})`,
        'g',
      );
      let match;
      while ((match = re.exec(line)) !== null) {
        if (isIdExpression(match[2]) && isLabelExpression(match[1])) {
          found.push(`${match[1]} … ${match[2]}`);
        }
      }
      return found;
    },
  },
  {
    id: 'ternaire-vers-id',
    label:
      'Branche de repli sur un identifiant (`cond ? libellé : entity.id`) : prévoir un texte métier',
    scan(line) {
      const found = [];
      const re = new RegExp(
        String.raw`\?\s*(${LABEL_PATH})\s*:\s*(${ID_PATH})`,
        'g',
      );
      let match;
      while ((match = re.exec(line)) !== null) {
        if (isIdExpression(match[2]) && isLabelExpression(match[1])) {
          found.push(`${match[1]} … ${match[2]}`);
        }
      }
      return found;
    },
  },
  {
    id: 'id-rendu-en-jsx',
    label: "Identifiant rendu comme texte JSX : afficher un libellé métier",
    scan(line) {
      const found = [];
      const re = new RegExp(String.raw`(?:>|^\s*)\{\s*(${ID_PATH})\s*\}`, 'g');
      let match;
      while ((match = re.exec(line)) !== null) {
        if (isIdExpression(match[1])) found.push(match[1]);
      }
      return found;
    },
  },
  {
    id: 'id-dans-un-libelle',
    label:
      "Identifiant interpolé dans un texte affiché (titre, description, toast, aria-label)",
    scan(line) {
      const found = [];
      // Littéral gabarit contenant de la prose (au moins une espace) + un ${id}.
      const templates = line.match(/`[^`]*`/g) ?? [];
      for (const template of templates) {
        if (!/\s/.test(template.replace(/\$\{[^}]*\}/g, ''))) continue;
        const re = new RegExp(String.raw`\$\{\s*(${ID_PATH})\s*\}`, 'g');
        let match;
        while ((match = re.exec(template)) !== null) {
          if (isIdExpression(match[1])) found.push(match[1]);
        }
      }
      return found;
    },
  },
];

/** Contextes où un identifiant n'est jamais visible par l'utilisateur. */
const NON_VISIBLE_CONTEXT =
  /\b(?:key|href|value|defaultValue|id|htmlFor|queryKey|enabled|seed|name|data-[\w-]+)=|\bqueryKey\b|\brouter\.(?:push|replace)\b|\bnew URLSearchParams\b|\bsearchParams\b|^\s*\/\/|^\s*\*/;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next') continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      walk(path, out);
    } else if (/\.tsx?$/.test(name) && !/\.(?:spec|test)\.tsx?$/.test(name)) {
      out.push(path);
    }
  }
  return out;
}

const violations = [];
let scannedFiles = 0;

for (const file of walk(WEB_SRC)) {
  const rel = relative(join(import.meta.dirname, '..'), file);
  if (allowedFiles.has(rel)) continue;
  scannedFiles += 1;

  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, index) => {
    // L'annotation vaut pour la ligne elle-même ou la ligne juste au-dessus.
    if (line.includes('audit-ui-ids:ignore')) return;
    if ((lines[index - 1] ?? '').includes('audit-ui-ids:ignore')) return;
    if (NON_VISIBLE_CONTEXT.test(line)) return;

    for (const rule of RULES) {
      for (const expression of rule.scan(line)) {
        violations.push({
          file: rel,
          line: index + 1,
          rule: rule.id,
          message: rule.label,
          expression,
          snippet: line.trim().slice(0, 140),
        });
      }
    }
  });
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ scannedFiles, violations }, null, 2));
  process.exit(violations.length > 0 ? 1 : 0);
}

console.log('=== Audit « valeur, jamais l’ID » — apps/web ===\n');
console.log(`Fichiers analysés : ${scannedFiles}`);
console.log(`Exceptions déclarées : ${allowedFiles.size}`);
console.log(`Violations : ${violations.length}\n`);

for (const violation of violations) {
  console.log(`${violation.file}:${violation.line}  [${violation.rule}]`);
  console.log(`  ${violation.message}`);
  console.log(`  → ${violation.snippet}`);
  console.log('');
}

if (violations.length > 0) {
  console.log(
    'Corriger avec displayLabel() / firstDisplayLabel() (apps/web/src/lib/display-label.ts),\n' +
      'ou déclarer une exception justifiée dans scripts/audit-ui-ids.allowlist.json,\n' +
      'ou annoter la ligne avec un commentaire audit-ui-ids:ignore si elle est réellement invisible.',
  );
}

process.exit(violations.length > 0 ? 1 : 0);
