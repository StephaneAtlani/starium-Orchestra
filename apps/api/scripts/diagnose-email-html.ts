/**
 * Vérifie que sendProjectReviewReportEmail persiste bien emailBodyHtml.
 * Usage : pnpm run diagnose:email-html
 */
import { PrismaClient } from '@prisma/client';
import { EmailService } from '../src/modules/email/email.service';
import { buildProjectReviewReportContent } from '../src/modules/projects/project-reviews/project-review-report.builder';

async function main(): Promise<void> {
  const baseSnapshot = {
    schemaVersion: 2,
    review: {
      type: 'COPIL',
      title: 'Point COPIL',
      reviewDate: '2026-07-14T19:00:00.000Z',
      facilitatorDisplayName: null,
      periodStart: null,
      periodEnd: null,
    },
    project: {
      id: 'p1',
      name: 'Telephonie',
      status: 'IN_PROGRESS',
      health: 'RED',
      priority: 'MEDIUM',
    },
    meeting: { meetingMode: 'REMOTE', location: null },
    participants: [],
    agenda: [],
    attachments: [],
    decisions: [],
    actions: [],
    untreatedAgendaItems: [],
    nextSteps: null,
    progress: { globalProgress: 78 },
    arbitration: {
      arbitrationMetierStatus: 'SOUMIS_VALIDATION',
      arbitrationComiteStatus: null,
      arbitrationCodirStatus: null,
      arbitrationStatus: 'TO_REVIEW',
    },
    tasks: { open: 16, inProgress: 7, done: 5, late: 14 },
    risks: { open: 3, mitigated: 0, closed: 0, monitored: 0, topRisks: [] },
    milestones: [],
    budget: { links: [] },
    generatedAt: new Date().toISOString(),
  };

  const report = buildProjectReviewReportContent({
    projectName: 'Telephonie — migration operateur',
    projectId: 'p1',
    reviewId: 'r1',
    snapshot: baseSnapshot as never,
    appBaseUrl: 'http://localhost:3000',
    clientOrganization: { name: 'Industria Group' },
  });

  console.log(`report.html length: ${report.html.length}`);

  const prisma = new PrismaClient();
  const service = new EmailService(
    prisma as never,
    { enqueueSendEmail: async () => undefined } as never,
    { create: async () => undefined } as never,
  );

  const client = await prisma.client.findFirst({ select: { id: true } });
  if (!client) throw new Error('Aucun client en base');

  process.env.EMAIL_DELIVERIES_INLINE = 'true';
  delete process.env.SMTP_HOST;

  const recipient = `diag-${Date.now()}@test.local`;
  await service.sendProjectReviewReportEmail({
    clientId: client.id,
    recipient,
    templateKey: 'project_review_report',
    title: report.title,
    message: report.text,
    htmlBody: report.html,
    actionUrl: 'http://localhost:3000/x',
  });

  const rows = await prisma.$queryRaw<
    Array<{ html_len: bigint; msg_len: bigint; msg: string | null }>
  >`
    SELECT
      length(COALESCE("emailBodyHtml", '')) as html_len,
      length(COALESCE("emailBodyMessage", '')) as msg_len,
      left("emailBodyMessage", 80) as msg
    FROM "EmailDelivery"
    WHERE recipient = ${recipient}
    LIMIT 1
  `;

  const row = rows[0];
  console.log('DB row:', row);
  const htmlLen = Number(row?.html_len ?? 0);
  const msgHasEquals = (row?.msg ?? '').includes('═');

  await prisma.emailDelivery.deleteMany({ where: { recipient } });
  await prisma.$disconnect();

  if (htmlLen < 500) {
    console.error('ÉCHEC : emailBodyHtml non persisté (html_len < 500)');
    process.exit(1);
  }
  if (msgHasEquals) {
    console.error('ÉCHEC : emailBodyMessage contient encore le texte brut long');
    process.exit(1);
  }
  console.log('OK : HTML persisté correctement');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
