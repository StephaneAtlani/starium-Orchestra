/**
 * Seed démo Procédures — fidélité mock handoff (docs/design_handoff_procedures).
 * Idempotent : upsert par code DEMO-PROC-* pour chaque client avec utilisateur actif.
 */
import {
  Prisma,
  ProcedureStatus,
  ProcedureVersionLifecycle,
  type PrismaClient,
} from '@prisma/client';

const DEFAULT_CATEGORIES = [
  { code: 'PILOTAGE', label: 'Pilotage', sortOrder: 0 },
  { code: 'COMPLIANCE', label: 'Conformité', sortOrder: 1 },
  { code: 'FINANCE', label: 'Finance', sortOrder: 2 },
  { code: 'ORGANISATION', label: 'Organisation', sortOrder: 3 },
  { code: 'SECURITY', label: 'Sécurité', sortOrder: 4 },
] as const;

const DIAG_DEMO = {
  nodes: [
    { id: 'n1', k: 'start', x: 60, y: 150, label: 'Demande reçue' },
    { id: 'n2', k: 'step', x: 230, y: 150, label: 'Qualification PMO' },
    { id: 'n3', k: 'dec', x: 430, y: 150, label: 'Budget > 50 k€ ?' },
    { id: 'n4', k: 'step', x: 630, y: 70, label: 'Passage COPIL' },
    { id: 'n5', k: 'step', x: 630, y: 230, label: 'Validation N+1' },
    { id: 'n6', k: 'end', x: 830, y: 150, label: 'Projet créé' },
  ],
  edges: [
    { from: 'n1', to: 'n2' },
    { from: 'n2', to: 'n3' },
    { from: 'n3', to: 'n4', label: 'Oui' },
    { from: 'n3', to: 'n5', label: 'Non' },
    { from: 'n4', to: 'n6' },
    { from: 'n5', to: 'n6' },
  ],
};

type DemoProc = {
  code: string;
  title: string;
  description: string;
  categoryCode: (typeof DEFAULT_CATEGORIES)[number]['code'];
  status: ProcedureStatus;
  versionNumber: number;
  contentJson: Prisma.InputJsonValue;
};

const DEMO_PROCS: DemoProc[] = [
  {
    code: 'DEMO-PROC-01',
    title: "Instruction d'une demande de projet",
    description:
      "Du dépôt de la demande à la création du projet : qualification PMO, passage en instance, décision.",
    categoryCode: 'PILOTAGE',
    status: ProcedureStatus.PUBLISHED,
    versionNumber: 2,
    contentJson: {
      schemaVersion: 2,
      blocks: [
        { t: 'h1', html: 'Objet et périmètre' },
        {
          t: 'p',
          html: "Cette procédure décrit le <b>circuit d'instruction</b> d'une demande de projet, depuis son dépôt dans le portail jusqu'à la <u>décision de l'instance</u> compétente. Elle s'applique à toutes les entités du groupe.",
        },
        {
          t: 'callout',
          kind: 'warn',
          html: 'Les demandes de catégorie <b>Réglementaire</b> suivent un circuit accéléré : elles ne passent pas en comité et sont validées directement par le N+1.',
        },
        { t: 'h1', html: 'Déroulé' },
        { t: 'h2', html: '1. Dépôt de la demande' },
        {
          t: 'step',
          html: 'Le demandeur renseigne les 4 sections du formulaire : <i>Votre demande</i>, <i>Pourquoi maintenant ?</i>, <i>Première estimation</i>, <i>Gouvernance</i>.',
        },
        {
          t: 'step',
          html: 'La demande peut rester en <b>brouillon</b> ; seuls les champs obligatoires sont contrôlés à la soumission.',
        },
        {
          t: 'step',
          html: 'À la soumission, le N+1 du demandeur reçoit une notification de validation.',
        },
        { t: 'h2', html: '2. Qualification PMO' },
        {
          t: 'p',
          html: "Le PMO vérifie la complétude, rattache la demande à un axe stratégique et estime la charge. Il propose l'instance de décision selon les seuils budgétaires définis dans les Cycles de pilotage.",
        },
        {
          t: 'diag',
          title: 'Circuit de décision',
          nodes: DIAG_DEMO.nodes,
          edges: DIAG_DEMO.edges,
          cap: "Schéma 1 — Circuit de décision d'une demande",
        },
      ],
    },
  },
  {
    code: 'DEMO-PROC-02',
    title: 'Revue de conformité trimestrielle',
    description:
      'Campagne de réévaluation des exigences par domaine, consolidation des écarts et plan de remédiation.',
    categoryCode: 'COMPLIANCE',
    status: ProcedureStatus.IN_REVIEW,
    versionNumber: 1,
    contentJson: {
      schemaVersion: 2,
      blocks: [
        { t: 'h1', html: 'Objectif' },
        {
          t: 'p',
          html: 'Organiser la <b>revue trimestrielle</b> des exigences de conformité et produire le plan de remédiation.',
        },
        { t: 'h2', html: 'Périmètre' },
        {
          t: 'ul',
          html: '<li>Référentiels actifs du client</li><li>Exigences à réévaluer</li><li>Écarts ouverts</li>',
        },
      ],
    },
  },
  {
    code: 'DEMO-PROC-03',
    title: 'Réaffectation budgétaire entre lignes',
    description:
      "Demande, validation et journalisation d'un transfert entre lignes budgétaires d'un même budget.",
    categoryCode: 'FINANCE',
    status: ProcedureStatus.PUBLISHED,
    versionNumber: 3,
    contentJson: {
      schemaVersion: 2,
      blocks: [
        { t: 'h1', html: 'Objet' },
        {
          t: 'p',
          html: 'Encadrer les transferts de crédits entre lignes.',
        },
        {
          t: 'callout',
          kind: 'info',
          html: 'Tout transfert doit être <b>tracé</b> dans le journal budgétaire avant exécution.',
        },
        { t: 'step', html: 'Le demandeur ouvre une demande de réaffectation.' },
        { t: 'step', html: 'Le responsable budget valide ou refuse.' },
      ],
    },
  },
  {
    code: 'DEMO-PROC-04',
    title: "Onboarding d'un chef de projet",
    description:
      'Accès, équipes, rituels et premiers livrables attendus le premier mois.',
    categoryCode: 'ORGANISATION',
    status: ProcedureStatus.DRAFT,
    versionNumber: 1,
    contentJson: {
      schemaVersion: 2,
      blocks: [
        { t: 'h1', html: 'Semaine 1' },
        {
          t: 'ul',
          html: '<li>Accès au portail</li><li>Présentation des cycles</li>',
        },
      ],
    },
  },
];

async function ensureCategories(
  prisma: PrismaClient,
  clientId: string,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const cat of DEFAULT_CATEGORIES) {
    const row = await prisma.procedureCategory.upsert({
      where: { clientId_code: { clientId, code: cat.code } },
      create: {
        clientId,
        code: cat.code,
        label: cat.label,
        sortOrder: cat.sortOrder,
        isActive: true,
      },
      update: { label: cat.label, sortOrder: cat.sortOrder, isActive: true },
      select: { id: true, code: true },
    });
    map.set(row.code, row.id);
  }
  return map;
}

async function seedOneProcedure(
  prisma: PrismaClient,
  clientId: string,
  ownerUserId: string | null,
  categoryIdByCode: Map<string, string>,
  demo: DemoProc,
): Promise<'created' | 'updated' | 'skipped'> {
  const categoryId = categoryIdByCode.get(demo.categoryCode);
  if (!categoryId) return 'skipped';

  const existing = await prisma.procedure.findUnique({
    where: { clientId_code: { clientId, code: demo.code } },
    select: {
      id: true,
      currentDraftVersionId: true,
      currentPublishedVersionId: true,
    },
  });

  if (existing) {
    // Idempotent : rafraîchir métadonnées + contenu du draft (et published si besoin)
    await prisma.procedure.update({
      where: { id: existing.id },
      data: {
        title: demo.title,
        description: demo.description,
        categoryId,
        status: demo.status,
        ownerUserId,
      },
    });

    if (existing.currentDraftVersionId) {
      await prisma.procedureVersion.update({
        where: { id: existing.currentDraftVersionId },
        data: {
          title: demo.title,
          contentJson: demo.contentJson,
        },
      });
    }

    if (
      demo.status === ProcedureStatus.PUBLISHED &&
      existing.currentPublishedVersionId
    ) {
      await prisma.procedureVersion.update({
        where: { id: existing.currentPublishedVersionId },
        data: {
          title: demo.title,
          contentJson: demo.contentJson,
          lifecycle: ProcedureVersionLifecycle.PUBLISHED,
          publishedAt: new Date(),
        },
      });
    } else if (
      demo.status === ProcedureStatus.PUBLISHED &&
      !existing.currentPublishedVersionId &&
      existing.currentDraftVersionId
    ) {
      // Passage draft → published pour une fiche démo déjà créée sans snapshot
      const draft = await prisma.procedureVersion.findUnique({
        where: { id: existing.currentDraftVersionId },
      });
      if (draft) {
        const published = await prisma.procedureVersion.create({
          data: {
            clientId,
            procedureId: existing.id,
            versionNumber: demo.versionNumber,
            lifecycle: ProcedureVersionLifecycle.PUBLISHED,
            title: demo.title,
            contentJson: demo.contentJson,
            changeSummary: 'Version démo seed',
            publishedAt: new Date(),
            publishedByUserId: ownerUserId,
          },
        });
        await prisma.procedure.update({
          where: { id: existing.id },
          data: { currentPublishedVersionId: published.id },
        });
      }
    }

    return 'updated';
  }

  const procedure = await prisma.procedure.create({
    data: {
      clientId,
      code: demo.code,
      title: demo.title,
      description: demo.description,
      categoryId,
      status: demo.status,
      ownerUserId,
      createdByUserId: ownerUserId,
    },
  });

  if (demo.status === ProcedureStatus.PUBLISHED) {
    const published = await prisma.procedureVersion.create({
      data: {
        clientId,
        procedureId: procedure.id,
        versionNumber: demo.versionNumber,
        lifecycle: ProcedureVersionLifecycle.PUBLISHED,
        title: demo.title,
        contentJson: demo.contentJson,
        changeSummary: 'Version démo seed',
        publishedAt: new Date(),
        publishedByUserId: ownerUserId,
      },
    });
    const draft = await prisma.procedureVersion.create({
      data: {
        clientId,
        procedureId: procedure.id,
        versionNumber: demo.versionNumber + 1,
        lifecycle: ProcedureVersionLifecycle.DRAFT,
        title: demo.title,
        contentJson: demo.contentJson,
      },
    });
    await prisma.procedure.update({
      where: { id: procedure.id },
      data: {
        currentPublishedVersionId: published.id,
        currentDraftVersionId: draft.id,
      },
    });
  } else {
    const draft = await prisma.procedureVersion.create({
      data: {
        clientId,
        procedureId: procedure.id,
        versionNumber: demo.versionNumber,
        lifecycle: ProcedureVersionLifecycle.DRAFT,
        title: demo.title,
        contentJson: demo.contentJson,
      },
    });
    await prisma.procedure.update({
      where: { id: procedure.id },
      data: { currentDraftVersionId: draft.id },
    });
  }

  return 'created';
}

export async function ensureDemoProceduresForAllClients(
  prisma: PrismaClient,
): Promise<void> {
  const clients = await prisma.client.findMany({
    select: { id: true, slug: true, name: true },
    orderBy: { createdAt: 'asc' },
  });

  let created = 0;
  let updated = 0;
  let clientsDone = 0;

  for (const client of clients) {
    const member = await prisma.clientUser.findFirst({
      where: { clientId: client.id, status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' },
      select: { userId: true },
    });
    if (!member) {
      console.log(
        `⚠️  [${client.slug}] « ${client.name} » : aucun utilisateur actif — procédures démo ignorées.`,
      );
      continue;
    }

    const cats = await ensureCategories(prisma, client.id);
    for (const demo of DEMO_PROCS) {
      const res = await seedOneProcedure(
        prisma,
        client.id,
        member.userId,
        cats,
        demo,
      );
      if (res === 'created') created += 1;
      else if (res === 'updated') updated += 1;
    }
    clientsDone += 1;
  }

  console.log(
    `✅ Procédures démo mock : ${clientsDone} client(s), ${created} créée(s), ${updated} mise(s) à jour (${DEMO_PROCS.length} modèles).`,
  );
}
