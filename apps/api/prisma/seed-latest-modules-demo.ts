import { ClientUserStatus, PrismaClient } from "@prisma/client";
import { ensureDemoOrganization } from "./seed-org-demo";
import { ensureDemoContracts } from "./seed-contracts-demo";
import { ensureDemoTeamsAndSkills } from "./seed-teams-skills-demo";
import { ensureDemoCapacity } from "./seed-capacity-demo";
import { ensureDemoStrategicVision } from "./seed-strategic-vision-demo";
import { ensureDemoMeetings } from "./seed-meetings-demo";
import { ensureDemoAlertsAndNotifications } from "./seed-alerts-notifications-demo";
import { ensureDemoSubscription } from "./seed-subscriptions-demo";

/**
 * Orchestrateur démo des modules récents (org, contrats, équipes/compétences,
 * capacité, vision stratégique, réunions, alertes, abonnements).
 *
 * À appeler **après** le portefeuille projets SEED (ressources + collaborateurs
 * déjà synchronisés).
 */
export async function ensureLatestModulesDemoForAllClients(
  prisma: PrismaClient,
): Promise<void> {
  const clients = await prisma.client.findMany({
    select: { id: true, slug: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(
    `🧩 Modules récents démo : ${clients.length} client(s) (org, contrats, équipes, capacité, vision, réunions, alertes, licences)`,
  );

  for (const c of clients) {
    const links = await prisma.clientUser.findMany({
      where: { clientId: c.id, status: ClientUserStatus.ACTIVE },
      orderBy: { createdAt: "asc" },
      take: 1,
      select: { userId: true },
    });
    if (links.length === 0) {
      console.warn(
        `⚠️  [${c.slug}] « ${c.name} » : aucun utilisateur actif — modules récents ignorés.`,
      );
      continue;
    }
    const actorUserId = links[0].userId;

    try {
      await ensureDemoSubscription(prisma, c.slug, c.id);

      const org = await ensureDemoOrganization(prisma, c.slug, c.id);

      const contractsCount = await ensureDemoContracts(
        prisma,
        c.slug,
        c.id,
        org.directionItId,
      );

      const { workTeamIds } = await ensureDemoTeamsAndSkills(
        prisma,
        c.slug,
        c.id,
      );

      await ensureDemoCapacity(prisma, c.slug, c.id, workTeamIds);

      await ensureDemoStrategicVision(
        prisma,
        c.slug,
        c.id,
        org.directionItId,
        actorUserId,
      );

      await ensureDemoMeetings(prisma, c.slug, c.id, actorUserId);

      await ensureDemoAlertsAndNotifications(prisma, c.slug, c.id);

      console.log(
        `✅ [${c.slug}] modules récents OK (contrats=${contractsCount}, équipes=${workTeamIds.length})`,
      );
    } catch (err) {
      console.error(`❌ [${c.slug}] modules récents démo en échec`, err);
      throw err;
    }
  }
}
