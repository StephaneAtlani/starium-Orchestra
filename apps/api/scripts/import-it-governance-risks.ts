/**
 * Import du registre risques SI / gouvernance IT (hors projet) pour un client.
 *
 * Usage :
 *   pnpm --filter @starium-orchestra/api run import:it-governance-risks -- \
 *     --client-id <clientId> [--dry-run] [--force]
 *
 * Options :
 *   --client-id <id>   (obligatoire) client cible
 *   --dry-run          affiche le plan sans écrire en base
 *   --force            recrée même si un risque identique existe déjà (titre + catégorie)
 *
 * Prérequis : DATABASE_URL pointant sur l’environnement cible (prod ou staging).
 */
import { PrismaClient, ProjectRiskTreatmentStrategy } from '@prisma/client';
import { ensureRiskTaxonomyForClient } from '../src/modules/risk-taxonomy/risk-taxonomy-defaults';
import { applyCriticalityFromProbabilityImpact } from '../src/modules/projects/lib/project-risk-criticality.util';
import { IT_GOVERNANCE_RISKS_REGISTER } from './data/it-governance-risks-register';

const prisma = new PrismaClient();

const DOMAIN_FALLBACK_TYPE: Record<string, string> = {
  DATA: 'OTHER_DATA_RISK',
  IT: 'OTHER_IT_RISK',
  CYBERSECURITY: 'OTHER_CYBER_RISK',
  LEGAL_COMPLIANCE: 'OTHER_LEGAL_COMPLIANCE_RISK',
  CONTINUITY: 'OTHER_CONTINUITY_RISK',
  SUPPLIERS: 'OTHER_SUPPLIER_RISK',
  HUMAN_RESOURCES: 'OTHER_HR_RISK',
  GOVERNANCE: 'OTHER_GOVERNANCE_RISK',
  ENVIRONMENTAL: 'NON_COMPLIANCE_ENVIRONMENT',
  OPERATIONS: 'OTHER_OPERATIONAL_RISK',
  GENERAL: 'UNCLASSIFIED',
};

function parseArgs(argv: string[]): {
  clientId: string;
  dryRun: boolean;
  force: boolean;
} {
  const map = new Map<string, string>();
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    if (a === '--dry-run') {
      map.set('dry-run', 'true');
      continue;
    }
    if (a === '--force') {
      map.set('force', 'true');
      continue;
    }
    if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
      map.set(a.slice(2), argv[i + 1]);
      i += 1;
    }
  }
  const clientId = map.get('client-id')?.trim();
  if (!clientId) {
    throw new Error('Argument obligatoire manquant : --client-id <id>');
  }
  return {
    clientId,
    dryRun: map.get('dry-run') === 'true',
    force: map.get('force') === 'true',
  };
}

async function resolveRiskTypeId(
  clientId: string,
  domainCode: string,
  typeCode: string,
): Promise<string> {
  const direct = await prisma.riskType.findFirst({
    where: {
      clientId,
      code: typeCode,
      isActive: true,
      domain: { code: domainCode, isActive: true },
    },
    select: { id: true, code: true, domain: { select: { code: true } } },
  });
  if (direct) return direct.id;

  const fallbackCode = DOMAIN_FALLBACK_TYPE[domainCode] ?? 'UNCLASSIFIED';
  const fallbackDomain = fallbackCode === 'UNCLASSIFIED' ? 'GENERAL' : domainCode;
  const fallback = await prisma.riskType.findFirst({
    where: {
      clientId,
      code: fallbackCode,
      domain: { code: fallbackDomain },
    },
    select: { id: true },
  });
  if (!fallback) {
    throw new Error(
      `Type risque introuvable pour ${domainCode}/${typeCode} (fallback ${fallbackDomain}/${fallbackCode})`,
    );
  }
  console.warn(
    `  ⚠ type ${domainCode}/${typeCode} absent — fallback ${fallbackDomain}/${fallbackCode}`,
  );
  return fallback.id;
}

async function nextRiskCode(clientId: string): Promise<string> {
  const existing = await prisma.projectRisk.findMany({
    where: { clientId, projectId: null },
    select: { code: true },
  });
  let maxN = 0;
  for (const r of existing) {
    const m = /^R-(\d+)$/.exec(r.code);
    if (m) maxN = Math.max(maxN, parseInt(m[1]!, 10));
  }
  return `R-${String(maxN + 1).padStart(3, '0')}`;
}

async function main(): Promise<void> {
  const { clientId, dryRun, force } = parseArgs(process.argv);

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, name: true },
  });
  if (!client) {
    throw new Error(`Client introuvable : ${clientId}`);
  }

  console.log(`Client : ${client.name} (${client.id})`);
  console.log(`Lignes à importer : ${IT_GOVERNANCE_RISKS_REGISTER.length}`);
  if (dryRun) console.log('Mode : DRY-RUN (aucune écriture)');
  if (force) console.log('Mode : FORCE (ignore les doublons titre+catégorie)');

  if (!dryRun) {
    await ensureRiskTaxonomyForClient(prisma, clientId);
    console.log('Taxonomie risques : OK');
  }

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < IT_GOVERNANCE_RISKS_REGISTER.length; i += 1) {
    const row = IT_GOVERNANCE_RISKS_REGISTER[i]!;
    const label = `[${i + 1}/${IT_GOVERNANCE_RISKS_REGISTER.length}] ${row.fearedEvent}`;

    if (!force) {
      const dup = await prisma.projectRisk.findFirst({
        where: {
          clientId,
          projectId: null,
          title: row.fearedEvent,
          category: row.category,
        },
        select: { id: true, code: true },
      });
      if (dup) {
        console.log(`${label} — SKIP (existe : ${dup.code})`);
        skipped += 1;
        continue;
      }
    }

    try {
      const riskTypeId = dryRun
        ? '(dry-run)'
        : await resolveRiskTypeId(clientId, row.domainCode, row.typeCode);

      const { criticalityScore, criticalityLevel } = applyCriticalityFromProbabilityImpact(
        row.probability,
        row.impact,
      );

      const mitigationPlan = `${row.mitigationPlan} [Effort estimé : ${row.effort}]`;

      if (dryRun) {
        console.log(
          `${label} — OK (dry-run) P=${row.probability} I=${row.impact} score=${criticalityScore} ${criticalityLevel} type=${row.domainCode}/${row.typeCode}`,
        );
        created += 1;
        continue;
      }

      const code = await nextRiskCode(clientId);

      await prisma.projectRisk.create({
        data: {
          clientId,
          projectId: null,
          riskTypeId: riskTypeId as string,
          code,
          title: row.fearedEvent,
          description: row.description,
          category: row.category,
          fearedEvent: row.fearedEvent,
          threatSource: row.threatSource,
          businessImpact: row.businessImpact,
          probability: row.probability,
          impact: row.impact,
          criticalityScore,
          criticalityLevel,
          existingSecurityMeasures: row.existingSecurityMeasures,
          mitigationPlan,
          status: 'OPEN',
          sortOrder: i,
          treatmentStrategy: ProjectRiskTreatmentStrategy.REDUCE,
        },
      });

      console.log(`${label} — CREATED ${code} (${criticalityLevel})`);
      created += 1;
    } catch (err) {
      errors += 1;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`${label} — ERROR : ${msg}`);
    }
  }

  console.log('\n--- Résumé ---');
  console.log(`Créés  : ${created}`);
  console.log(`Ignorés: ${skipped}`);
  console.log(`Erreurs: ${errors}`);

  if (errors > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
