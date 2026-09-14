/**
 * Seed ciblé RFC-STRAT-011 — schémas directeurs DSI/DAF (mock strategie.js).
 * Usage: pnpm exec ts-node --transpile-only prisma/scripts/seed-strategic-direction-strategy-demo.ts
 */
import { PrismaClient } from "@prisma/client";
import { ensureDemoStrategicDirectionStrategies } from "../seed-strategic-direction-strategy-demo";

async function main() {
  const prisma = new PrismaClient();
  try {
    const clients = await prisma.client.findMany({
      select: { id: true, slug: true, name: true },
      orderBy: { createdAt: "asc" },
    });
    console.log(`🧭 Seed schémas directeurs — ${clients.length} client(s)`);
    for (const c of clients) {
      const link = await prisma.clientUser.findFirst({
        where: { clientId: c.id, status: "ACTIVE" },
        select: { userId: true },
        orderBy: { createdAt: "asc" },
      });
      await ensureDemoStrategicDirectionStrategies(
        prisma,
        c.slug,
        c.id,
        link?.userId ?? null,
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
