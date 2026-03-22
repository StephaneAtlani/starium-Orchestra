/**
 * Supprime l’import seed Aravis : budget ARAVIS-2025-IMPORT (+ snapshots),
 * puis l’exercice EX-2025-ARAVIS s’il n’a plus aucun budget.
 *
 * Mêmes variables que seed-aravis-2025.js : SEED_CLIENT_SLUG, ARAVIS_BUDGET_CODE, ARAVIS_EXERCISE_CODE
 *
 * Usage : node prisma/revert-aravis-import.js
 *         npm run revert:aravis --prefix apps/api
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

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CLIENT_SLUG = process.env.SEED_CLIENT_SLUG || 'sitral';
const BUDGET_CODE = process.env.ARAVIS_BUDGET_CODE || 'ARAVIS-2025-IMPORT';
const EXERCISE_CODE = process.env.ARAVIS_EXERCISE_CODE || 'EX-2025-ARAVIS';

async function main() {
  const client = await prisma.client.findUnique({
    where: { slug: CLIENT_SLUG },
    select: { id: true },
  });
  if (!client) {
    throw new Error(`Client introuvable (slug=${CLIENT_SLUG}).`);
  }
  const clientId = client.id;

  const budget = await prisma.budget.findUnique({
    where: { clientId_code: { clientId, code: BUDGET_CODE } },
    select: { id: true, exerciseId: true },
  });

  if (!budget) {
    console.log('Aucun budget à supprimer :', BUDGET_CODE);
  } else {
    const snapCount = await prisma.budgetSnapshot.deleteMany({
      where: { clientId, budgetId: budget.id },
    });
    if (snapCount.count > 0) {
      console.log('Snapshots supprimés :', snapCount.count);
    }

    await prisma.budget.delete({ where: { id: budget.id } });
    console.log('Budget supprimé :', BUDGET_CODE, budget.id);
  }

  const exercise = await prisma.budgetExercise.findUnique({
    where: { clientId_code: { clientId, code: EXERCISE_CODE } },
    select: { id: true },
  });

  if (exercise) {
    const remaining = await prisma.budget.count({
      where: { clientId, exerciseId: exercise.id },
    });
    if (remaining === 0) {
      await prisma.budgetExercise.delete({ where: { id: exercise.id } });
      console.log('Exercice supprimé (vide) :', EXERCISE_CODE);
    } else {
      console.log(
        'Exercice conservé :',
        EXERCISE_CODE,
        `(${remaining} budget(s) restant(s))`,
      );
    }
  } else {
    console.log('Aucun exercice :', EXERCISE_CODE);
  }

  console.log('OK — import Aravis annulé pour', CLIENT_SLUG);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
