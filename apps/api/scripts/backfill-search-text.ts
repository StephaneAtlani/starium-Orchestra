/**
 * Backfill `searchText` (et `indexedAt` pour ChatbotKnowledgeEntry) après migration RFC-CORE-SEARCH-001.
 * Usage : depuis `apps/api` → `pnpm exec ts-node --transpile-only scripts/backfill-search-text.ts`
 */
import { PrismaClient } from '@prisma/client';
import {
  buildBudgetSearchText,
  buildChatbotKnowledgeSearchText,
  buildProjectSearchText,
} from '../src/modules/search/search-text-build.util';

const prisma = new PrismaClient();
const BATCH = 250;

async function backfillProjects(): Promise<void> {
  let skip = 0;
  for (;;) {
    const rows = await prisma.project.findMany({
      skip,
      take: BATCH,
      select: { id: true, name: true, code: true, description: true },
    });
    if (!rows.length) break;
    for (const r of rows) {
      await prisma.project.update({
        where: { id: r.id },
        data: {
          searchText: buildProjectSearchText({
            name: r.name,
            code: r.code,
            description: r.description,
          }),
        },
      });
    }
    skip += rows.length;
    console.log(`[search backfill] projects: ${skip}`);
  }
}

async function backfillBudgets(): Promise<void> {
  let skip = 0;
  for (;;) {
    const rows = await prisma.budget.findMany({
      skip,
      take: BATCH,
      select: { id: true, name: true, code: true, description: true },
    });
    if (!rows.length) break;
    for (const r of rows) {
      await prisma.budget.update({
        where: { id: r.id },
        data: {
          searchText: buildBudgetSearchText({
            name: r.name,
            code: r.code,
            description: r.description,
          }),
        },
      });
    }
    skip += rows.length;
    console.log(`[search backfill] budgets: ${skip}`);
  }
}

async function backfillChatbotEntries(): Promise<void> {
  const now = new Date();
  let skip = 0;
  for (;;) {
    const rows = await prisma.chatbotKnowledgeEntry.findMany({
      skip,
      take: BATCH,
      select: {
        id: true,
        title: true,
        question: true,
        answer: true,
        content: true,
        keywords: true,
        tags: true,
        slug: true,
      },
    });
    if (!rows.length) break;
    for (const r of rows) {
      await prisma.chatbotKnowledgeEntry.update({
        where: { id: r.id },
        data: {
          searchText: buildChatbotKnowledgeSearchText(r),
          indexedAt: now,
        },
      });
    }
    skip += rows.length;
    console.log(`[search backfill] chatbot entries: ${skip}`);
  }
}

async function main(): Promise<void> {
  console.log('[search backfill] start');
  await backfillProjects();
  await backfillBudgets();
  await backfillChatbotEntries();
  console.log('[search backfill] done');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
