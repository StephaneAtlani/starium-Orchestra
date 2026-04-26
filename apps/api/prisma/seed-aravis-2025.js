/**
 * Seed autonome : import Excel « Export aravis 2025 » (ou équivalent).
 *
 * Structure attendue :
 * - Onglet « Compte » : colonnes Metier, Compte, Libellé compte
 * - Une feuille par numéro de compte (61561600, …) : mouvements avec « Ligne budgetaire »
 *
 * Crée / remplace : exercice budgétaire, budget, comptes GL (upsert), enveloppes (1 par compte),
 * lignes : **une ligne par mouvement Excel** sur chaque feuille compte présente.
 * **Tous les comptes** listés dans l’onglet « Compte » ont une enveloppe ; les feuilles absentes = enveloppe vide.
 * Feuilles présentes mais non listées dans « Compte » sont traitées à la suite.
 * Libellé = « Objet de la dépense », code = `{compte}-L{index}`.
 * Montants : `committedAmount` = « Montant facture », `consumedAmount` = « Montant qui consomme ».
 * Type Commande / Facture déduit de la colonne « Référence » : préfixe **CD** = commande, **FA** = facture.
 * Fournisseurs : `Supplier.code` = colonne « Fournisseur », `Supplier.name` = « Nom du fournisseur ».
 *
 * Variables d'environnement :
 * - DATABASE_URL (ou .env dans apps/api)
 * - ARAVIS_XLSX_PATH : chemin absolu du fichier (défaut : chemin ci-dessous)
 * - SEED_CLIENT_SLUG : slug client cible (défaut : sitral)
 * - ARAVIS_BUDGET_CODE : code unique du budget (défaut : ARAVIS-2025-IMPORT)
 * - ARAVIS_EXERCISE_CODE : code exercice (défaut : EX-2025-ARAVIS)
 *
 * Usage : node prisma/seed-aravis-2025.js
 *         npm run seed:aravis --prefix apps/api
 */

const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eq = trimmed.indexOf('=');
      if (eq > 0) {
        const key = trimmed.slice(0, eq).trim();
        const value = trimmed.slice(eq + 1).trim();
        if (!process.env[key]) process.env[key] = value;
      }
    }
  }
}

const ExcelJS = require('exceljs');
const { PrismaClient } = require('@prisma/client');

function formatCellValue(value) {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object' && value !== null && Array.isArray(value.richText)) {
    return value.richText.map((t) => t.text).join('');
  }
  if (typeof value === 'object' && value.text != null) return String(value.text);
  if (typeof value === 'object' && value.result !== undefined) {
    return formatCellValue(value.result);
  }
  return String(value);
}

/** Équivalent pratique de `XLSX.utils.sheet_to_json(sheet, { defval: '' })` : 1ère ligne = clés. */
function sheetToJsonRecords(sheet) {
  if (!sheet || sheet.rowCount < 1) return [];
  const lastCol = sheet.columnCount || 1;
  const rawMatrix = [];
  for (let r = 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const arr = [];
    for (let c = 1; c <= lastCol; c++) {
      arr.push(formatCellValue(row.getCell(c).value));
    }
    rawMatrix.push(arr);
  }
  const headers = rawMatrix[0].map((h) => String(h ?? '').trim());
  const records = [];
  for (let ri = 1; ri < rawMatrix.length; ri++) {
    const row = rawMatrix[ri];
    const obj = {};
    for (let c = 0; c < headers.length; c++) {
      const key = headers[c] || `Column_${c}`;
      obj[key] = row[c] != null ? String(row[c]) : '';
    }
    records.push(obj);
  }
  return records;
}

const prisma = new PrismaClient();

const DEFAULT_XLSX =
  process.env.ARAVIS_XLSX_PATH ||
  '/Users/satlani/Documents/Export aravis 2025.xlsx';

const CLIENT_SLUG = process.env.SEED_CLIENT_SLUG || 'sitral';
const BUDGET_CODE = process.env.ARAVIS_BUDGET_CODE || 'ARAVIS-2025-IMPORT';
const EXERCISE_CODE = process.env.ARAVIS_EXERCISE_CODE || 'EX-2025-ARAVIS';

/** Comptes 2xxx = immo → CAPEX, sinon OPEX */
function expenseTypeForAccount(accountCode) {
  const s = String(accountCode).trim();
  return s.startsWith('2') ? 'CAPEX' : 'OPEX';
}

function envelopeTypeForAccount(accountCode) {
  return expenseTypeForAccount(accountCode) === 'CAPEX' ? 'BUILD' : 'RUN';
}

function toDecimalString(n) {
  if (n === '' || n === null || n === undefined) return '0';
  const x = Number(n);
  if (Number.isNaN(x)) return '0';
  return x.toFixed(2);
}

/** Code unique par budget : 61561600-L000001 … (évite collision entre feuilles). */
function lineCodeForRow(accountCode, rowIndexInSheet) {
  return `${accountCode}-L${String(rowIndexInSheet).padStart(6, '0')}`;
}

/** Commande / Facture depuis « Référence » (CD… / FA…). Sinon colonne Excel en secours. */
function kindFromReference(r) {
  const raw = String(r['Référence'] ?? '').trim().toUpperCase();
  if (raw.startsWith('CD')) return 'Commande';
  if (raw.startsWith('FA')) return 'Facture';
  return '';
}

function rowDocTypeFallback(r) {
  return String(
    r['commande Facture Avoir'] ?? r['Commande Facture Avoir'] ?? '',
  ).trim();
}

function rowKindLabel(r) {
  return kindFromReference(r) || rowDocTypeFallback(r);
}

function rowName(r, ligneBudgetaireFallback) {
  const obj = String(
    r['Objet de la dépense'] ?? r['Objet de la depense'] ?? '',
  ).trim();
  const base = obj || String(ligneBudgetaireFallback ?? '').trim() || '—';
  const kind = rowKindLabel(r);
  const ref = String(r['Référence'] ?? '').trim().replace(/\s+/g, ' ');
  const extra = [kind, ref].filter(Boolean);
  const suffix = extra.length ? ` — ${extra.join(' ')}` : '';
  return (base + suffix).slice(0, 500);
}

/** Référence CD/FA + fournisseur + montants. */
function rowDescription(r, supplierInfo) {
  const ref = String(r['Référence'] ?? '').trim();
  const refUpper = ref.toUpperCase();
  let refLine = '';
  if (refUpper.startsWith('CD')) {
    refLine = `Référence ${ref} (commande)`;
  } else if (refUpper.startsWith('FA')) {
    refLine = `Référence ${ref} (facture)`;
  } else if (ref) {
    refLine = `Référence ${ref}`;
  }

  const codeMov = String(r['Code mouvement'] ?? '').trim();
  const nPiece = String(r['N°piece'] ?? r['N°piece'] ?? '').trim();
  const ligne = String(r['Ligne budgetaire'] ?? '').trim();

  const headParts = [];
  if (refLine) headParts.push(refLine);
  if (codeMov) headParts.push(`Mouvement : ${codeMov}`);
  if (nPiece) headParts.push(`N° pièce ${nPiece}`);
  if (ligne) headParts.push(ligne);
  if (supplierInfo) {
    const c = supplierInfo.code != null ? String(supplierInfo.code) : '—';
    headParts.push(`Fournisseur : ${supplierInfo.name} (code ${c})`);
  }

  const facture = toDecimalString(r['Montant facture']);
  const consomme = toDecimalString(r['Montant qui consomme']);
  const amounts = `Montant facture (col.) ${facture} € · Montant consommé ${consomme} €`;

  const head = headParts.length ? `${headParts.join(' · ')} · ` : '';
  return (head + amounts).slice(0, 2000);
}

/**
 * `Supplier.code` = Excel « Fournisseur », `Supplier.name` = « Nom du fournisseur ».
 * @param {Map<string, { id: string, name: string, code: string | null }>} cache
 */
async function ensureSupplier(prisma, clientId, cache, fournisseurRaw, nomRaw) {
  const codeStr = String(fournisseurRaw ?? '').trim();
  const nameStr = String(nomRaw ?? '').trim();
  if (!codeStr && !nameStr) return null;

  const cacheKey = codeStr || `name:${nameStr}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const name = nameStr || `Fournisseur ${codeStr}`;

  let s = codeStr
    ? await prisma.supplier.findFirst({ where: { clientId, code: codeStr } })
    : null;
  if (!s && nameStr) {
    s = await prisma.supplier.findFirst({ where: { clientId, name: nameStr } });
  }
  if (!s) {
    s = await prisma.supplier.create({
      data: {
        clientId,
        code: codeStr || null,
        name,
        status: 'ACTIVE',
      },
    });
  } else {
    s = await prisma.supplier.update({
      where: { id: s.id },
      data: {
        name,
        ...(codeStr ? { code: codeStr } : {}),
      },
    });
  }

  const info = { id: s.id, name: s.name, code: s.code };
  cache.set(cacheKey, info);
  if (codeStr) cache.set(codeStr, info);
  return info;
}

/**
 * Ordre : d’abord tous les comptes de l’onglet « Compte », puis feuilles non listées (sans doublon).
 * @returns {string[]}
 */
function getOrderedAccountCodes(compteRows, sheetNames) {
  const accountSheets = sheetNames.filter((n) => n !== 'Compte');
  const seen = new Set();
  const ordered = [];
  for (const r of compteRows) {
    const c = String(r.compte).trim();
    if (!c || seen.has(c)) continue;
    seen.add(c);
    ordered.push(c);
  }
  for (const name of accountSheets) {
    const c = String(name).trim();
    if (!c || seen.has(c)) continue;
    seen.add(c);
    ordered.push(c);
  }
  return ordered;
}

/**
 * @returns {Promise<{ wb: import('exceljs').Workbook, compteRows: Array<{ metier: string, compte: string, libelle: string }> }>}
 */
async function parseWorkbook(xlsxPath) {
  if (!fs.existsSync(xlsxPath)) {
    throw new Error(`Fichier introuvable : ${xlsxPath}`);
  }
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(xlsxPath);
  const compteSheet = wb.getWorksheet('Compte');
  if (!compteSheet) {
    throw new Error('Onglet « Compte » manquant dans le classeur.');
  }

  const raw = sheetToJsonRecords(compteSheet);
  const compteRows = [];
  for (const row of raw) {
    const compte = String(row['Compte'] ?? row['compte'] ?? '').trim();
    if (!compte || compte === 'Compte') continue;
    compteRows.push({
      metier: String(row['Metier'] ?? row['Métier'] ?? '').trim(),
      compte,
      libelle: String(row['Libellé compte'] ?? row['Libelle compte'] ?? '').trim(),
    });
  }

  return { wb, compteRows };
}

async function main() {
  const xlsxPath = DEFAULT_XLSX;
  console.log('Fichier :', xlsxPath);

  const { wb, compteRows } = await parseWorkbook(xlsxPath);
  const sheetNames = wb.worksheets.map((w) => w.name);
  const libelleByCompte = new Map(
    compteRows.map((r) => [r.compte, r.libelle || r.compte]),
  );
  const orderedAccounts = getOrderedAccountCodes(compteRows, sheetNames);
  console.log(
    'Comptes à traiter :',
    orderedAccounts.length,
    '(onglet Compte + feuilles orphelines)',
  );

  const client = await prisma.client.findUnique({
    where: { slug: CLIENT_SLUG },
  });
  if (!client) {
    throw new Error(
      `Client introuvable (slug=${CLIENT_SLUG}). Crée le client ou ajuste SEED_CLIENT_SLUG.`,
    );
  }
  const clientId = client.id;

  const existingBudget = await prisma.budget.findUnique({
    where: {
      clientId_code: { clientId, code: BUDGET_CODE },
    },
  });
  if (existingBudget) {
    await prisma.budget.delete({
      where: { id: existingBudget.id },
    });
    console.log('Ancien budget supprimé :', BUDGET_CODE);
  }

  const start2025 = new Date(Date.UTC(2025, 0, 1));
  const end2025 = new Date(Date.UTC(2025, 11, 31, 23, 59, 59, 999));

  const exercise = await prisma.budgetExercise.upsert({
    where: {
      clientId_code: { clientId, code: EXERCISE_CODE },
    },
    update: {
      name: 'Exercice 2025 (Aravis)',
      startDate: start2025,
      endDate: end2025,
      status: 'ACTIVE',
    },
    create: {
      clientId,
      code: EXERCISE_CODE,
      name: 'Exercice 2025 (Aravis)',
      startDate: start2025,
      endDate: end2025,
      status: 'ACTIVE',
    },
  });

  const budget = await prisma.budget.create({
    data: {
      clientId,
      exerciseId: exercise.id,
      name: 'Budget Aravis 2025 (import)',
      code: BUDGET_CODE,
      description: `Import seed depuis fichier Excel (${path.basename(xlsxPath)})`,
      currency: 'EUR',
      status: 'ACTIVE',
      taxMode: 'HT',
    },
  });

  let envelopeOrder = 0;
  let lineTotal = 0;
  /** @type {Map<string, { id: string, name: string, code: string | null }>} */
  const supplierCache = new Map();
  const supplierIds = new Set();

  for (const accountCode of orderedAccounts) {
    const sh = wb.getWorksheet(accountCode);
    const rows = sh ? sheetToJsonRecords(sh) : [];

    const glName =
      libelleByCompte.get(accountCode) || `Compte ${accountCode}`;

    const gl = await prisma.generalLedgerAccount.upsert({
      where: {
        clientId_code: { clientId, code: accountCode },
      },
      update: {
        name: glName.slice(0, 500),
        isActive: true,
      },
      create: {
        clientId,
        code: accountCode,
        name: glName.slice(0, 500),
        isActive: true,
        sortOrder: envelopeOrder,
      },
    });

    const envelope = await prisma.budgetEnvelope.create({
      data: {
        clientId,
        budgetId: budget.id,
        code: accountCode,
        name: glName.slice(0, 500),
        type: envelopeTypeForAccount(accountCode),
        status: 'ACTIVE',
        sortOrder: envelopeOrder++,
        description: null,
      },
    });

    let rowInSheet = 0;
    for (const r of rows) {
      const ligneBudgetaire = String(r['Ligne budgetaire'] ?? '').trim();
      if (!ligneBudgetaire) continue;

      rowInSheet += 1;
      const code = lineCodeForRow(accountCode, rowInSheet);
      const name = rowName(r, ligneBudgetaire);
      const initial = toDecimalString(r['Montant initial']);
      const facture = toDecimalString(r['Montant facture']);
      const consomme = toDecimalString(r['Montant qui consomme']);
      const initNum = Number(initial);
      const consNum = Number(consomme);
      const remaining = toDecimalString(initNum - consNum);

      const supplierInfo = await ensureSupplier(
        prisma,
        clientId,
        supplierCache,
        r['Fournisseur'],
        r['Nom du fournisseur'],
      );
      if (supplierInfo) supplierIds.add(supplierInfo.id);

      await prisma.budgetLine.create({
        data: {
          clientId,
          budgetId: budget.id,
          envelopeId: envelope.id,
          code,
          name,
          description: rowDescription(r, supplierInfo),
          expenseType: expenseTypeForAccount(accountCode),
          status: 'ACTIVE',
          currency: 'EUR',
          initialAmount: initial,
          revisedAmount: initial,
          forecastAmount: '0',
          committedAmount: facture,
          consumedAmount: consomme,
          remainingAmount: remaining,
          generalLedgerAccountId: gl.id,
          allocationScope: 'ENTERPRISE',
        },
      });
      lineTotal += 1;
    }
    const note = !sh
      ? 'pas de feuille'
      : rows.length === 0
        ? 'feuille vide'
        : 'OK';
    console.log(
      `  ${accountCode} : ${rowInSheet} mouvement(s) [${note}]`,
    );
  }

  console.log('OK — client :', CLIENT_SLUG);
  console.log('  Exercice :', exercise.code, exercise.id);
  console.log('  Budget  :', budget.code, budget.id);
  console.log('  Lignes  :', lineTotal);
  console.log('  Fournisseurs uniques :', supplierIds.size);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
