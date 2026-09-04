import {
  ClientSubscriptionStatus,
  ClientUserLicenseBillingMode,
  ClientUserLicenseType,
  ClientUserRole,
  PrismaClient,
  SubscriptionBillingPeriod,
} from "@prisma/client";

function addDaysUtc(base: Date, days: number): Date {
  const x = new Date(base);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

/**
 * Abonnement client ACTIVE + licences READ_WRITE sur les admins (RFC-ACL-001).
 */
export async function ensureDemoSubscription(
  prisma: PrismaClient,
  slug: string,
  clientId: string,
): Promise<void> {
  const now = new Date();
  let sub = await prisma.clientSubscription.findFirst({
    where: { clientId, status: ClientSubscriptionStatus.ACTIVE },
    orderBy: { createdAt: "asc" },
  });

  if (!sub) {
    sub = await prisma.clientSubscription.create({
      data: {
        clientId,
        status: ClientSubscriptionStatus.ACTIVE,
        billingPeriod: SubscriptionBillingPeriod.YEARLY,
        readWriteSeatsLimit: 25,
        startsAt: addDaysUtc(now, -180),
        endsAt: addDaysUtc(now, 185),
      },
    });
  } else {
    sub = await prisma.clientSubscription.update({
      where: { id: sub.id },
      data: {
        billingPeriod: SubscriptionBillingPeriod.YEARLY,
        readWriteSeatsLimit: Math.max(sub.readWriteSeatsLimit, 25),
        startsAt: sub.startsAt ?? addDaysUtc(now, -180),
        endsAt: addDaysUtc(now, 185),
      },
    });
  }

  const members = await prisma.clientUser.findMany({
    where: { clientId, status: "ACTIVE" },
    select: { id: true, role: true, userId: true },
  });

  for (const m of members) {
    const isAdmin = m.role === ClientUserRole.CLIENT_ADMIN;
    // Contrainte SQL ClientUser_billable_subscription_check :
    // subscriptionId non null ⇔ (READ_WRITE + CLIENT_BILLABLE)
    if (isAdmin) {
      await prisma.clientUser.update({
        where: { id: m.id },
        data: {
          subscriptionId: sub.id,
          licenseType: ClientUserLicenseType.READ_WRITE,
          licenseBillingMode: ClientUserLicenseBillingMode.CLIENT_BILLABLE,
          licenseStartsAt: sub.startsAt,
          licenseEndsAt: sub.endsAt,
          licenseAssignmentReason: `Seed démo [${slug}]`,
        },
      });
    } else {
      await prisma.clientUser.update({
        where: { id: m.id },
        data: {
          subscriptionId: null,
          licenseType: ClientUserLicenseType.READ_ONLY,
          licenseBillingMode: ClientUserLicenseBillingMode.NON_BILLABLE,
          licenseStartsAt: null,
          licenseEndsAt: null,
          licenseAssignmentReason: `Seed démo [${slug}] — lecteur`,
        },
      });
    }
  }
}
