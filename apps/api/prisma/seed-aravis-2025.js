/**
 * Seed autonome : import Excel « Export aravis 2025 » (ou équivalent).
 *
 * Structure attendue :
 * - Onglet « Compte » : colonnes Metier, Compte, Libellé compte
 * - Une feuille par numéro de compte (61561600, …) : mouvements avec « Ligne budgetaire »
 *
 * Crée / remplace : exercice budgétaire, budget, comptes GL (upsert), enveloppes (1 par compte),
 * lignes budgétaires (agrégées par Ligne budgetaire unique) — libellé ligne = colonne « Objet de la dépense ».
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

const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');

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

function lineCodeFromLigneBudgetaire(ligne) {
  const s = String(ligne).trim();
  if (s.length <= 200) return s;
  return s.slice(0, 197) + '...';
}

/** Nom affiché BudgetLine : toujours « Objet de la dépense » (1er non vide du groupe), sinon clé ligne budgétaire. */
function pickLineName(group, ligneBudgetaire) {
  const obj = group.objetDepense?.trim();
  if (obj) return obj.slice(0, 500);
  return ligneBudgetaire.slice(0, 500);
}

/**
 * @returns {{ compteRows: Array<{ metier: string, compte: string, libelle: string }>, accountSheets: string[] }}
 */
function parseWorkbook(xlsxPath) {
  if (!fs.existsSync(xlsxPath)) {
    throw new Error(`Fichier introuvable : ${xlsxPath}`);
  }
  const wb = XLSX.readFile(xlsxPath, { cellDates: true });
  const compteSheet = wb.Sheets['Compte'];
  if (!compteSheet) {
    throw new Error('Onglet « Compte » manquant dans le classeur.');
  }

  const raw = XLSX.utils.sheet_to_json(compteSheet, { defval: '' });
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

  const accountSheets = wb.SheetNames.filter((n) => n !== 'Compte');
  return { wb, compteRows, accountSheets };
}

function aggregateSheetRows(rows, accountCode) {
  /** @type {Map<string, { sumInit: number, sumCons: number, sumFacture: number, sumEngagementFacture: number, objetDepense: string }>} */
  const byLine = new Map();

  for (const r of rows) {
    const lb = String(r['Ligne budgetaire'] ?? '').trim();
    if (!lb) continue;

    if (!byLine.has(lb)) {
      byLine.set(lb, {
        sumInit: 0,
        sumCons: 0,
        sumFacture: 0,
        sumEngagementFacture: 0,
        objetDepense: '',
      });
    }
    const g = byLine.get(lb);
    g.sumInit += Number(r['Montant initial']) || 0;
    g.sumCons += Number(r['Montant qui consomme']) || 0;
    g.sumFacture += Number(r['Montant facture']) || 0;
    const mov = String(r['Code mouvement'] ?? '').trim();
    if (mov === 'Engagement') {
      g.sumEngagementFacture += Number(r['Montant facture']) || 0;
    }
    const obj = String(
      r['Objet de la dépense'] ?? r['Objet de la depense'] ?? '',
    ).trim();
    if (obj && !g.objetDepense) g.objetDepense = obj;
  }

  return { accountCode, byLine };
}

async function main() {
  const xlsxPath = DEFAULT_XLSX;
  console.log('Fichier :', xlsxPath);

  const { wb, compteRows, accountSheets } = parseWorkbook(xlsxPath);
  const libelleByCompte = new Map(
    compteRows.map((r) => [r.compte, r.libelle || r.compte]),
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

  for (const sheetName of accountSheets) {
    const sh = wb.Sheets[sheetName];
    if (!sh) continue;

    const rows = XLSX.utils.sheet_to_json(sh, { defval: '' });
    if (!rows.length) continue;

    const accountCode = sheetName.trim();
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

    const { byLine } = aggregateSheetRows(rows, accountCode);

    for (const [ligneBudgetaire, group] of byLine) {
      const code = lineCodeFromLigneBudgetaire(ligneBudgetaire);
      const name = pickLineName(group, ligneBudgetaire);
      const initial = toDecimalString(group.sumInit);
      const consumed = toDecimalString(group.sumCons);
      const initNum = Number(initial);
      const consNum = Number(consumed);
      const remaining = toDecimalString(initNum - consNum);

      await prisma.budgetLine.create({
        data: {
          clientId,
          budgetId: budget.id,
          envelopeId: envelope.id,
          code,
          name,
          description: `Ligne export : ${ligneBudgetaire}`,
          expenseType: expenseTypeForAccount(accountCode),
          status: 'ACTIVE',
          currency: 'EUR',
          initialAmount: initial,
          revisedAmount: initial,
          forecastAmount: '0',
          committedAmount: toDecimalString(group.sumEngagementFacture),
          consumedAmount: consumed,
          remainingAmount: remaining,
          generalLedgerAccountId: gl.id,
          allocationScope: 'ENTERPRISE',
        },
      });
      lineTotal += 1;
    }
  }

  console.log('OK — client :', CLIENT_SLUG);
  console.log('  Exercice :', exercise.code, exercise.id);
  console.log('  Budget  :', budget.code, budget.id);
  console.log('  Lignes  :', lineTotal);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
