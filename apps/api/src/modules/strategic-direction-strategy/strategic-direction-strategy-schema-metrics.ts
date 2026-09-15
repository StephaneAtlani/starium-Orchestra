/**
 * RFC-STRAT-011 — score / maturité / alertes / recouvrements (port mock strategie.js).
 */

import type {
  NormalizedInitiative,
  NormalizedOutcome,
  NormalizedRisk,
  NormalizedStrategySchema,
} from './strategic-direction-strategy-schema-normalize';

export type VisionAxisRef = { id: string; name: string };

export type SchemaMaturity = {
  Ambition: number;
  Objectifs: number;
  Chantiers: number;
  Budget: number;
  Risques: number;
  Revue: number;
};

export type SchemaAlert = {
  level: 'danger' | 'warning' | 'info';
  title: string;
  detail: string;
};

export type SchemaMetricsInput = {
  schema: NormalizedStrategySchema;
  ambition: string | null | undefined;
  visionAxes: VisionAxisRef[];
  /** Dernière revue (approvedAt ou updatedAt) */
  lastReviewAt: Date | null;
  /** Mois « maintenant » relatif à horizonStartYear (0 = janv année 0) */
  nowMonthOffset: number;
};

export function computeNowMonthOffset(horizonStartYear: number, now = new Date()): number {
  return (now.getFullYear() - horizonStartYear) * 12 + now.getMonth();
}

export function computeAlignmentScore(
  schema: NormalizedStrategySchema,
  visionAxes: VisionAxisRef[],
): number {
  const axes = visionAxes.length > 0 ? visionAxes : [];
  if (axes.length === 0) return 0;
  let tot = 0;
  for (const a of axes) {
    const linked = schema.majorInitiatives.filter((c) =>
      c.strategicAxisIds.includes(a.id),
    );
    const cov = Math.min(100, linked.length * 34);
    const prog =
      linked.length > 0
        ? linked.reduce((s, c) => s + c.progressPct, 0) / linked.length
        : 0;
    const contrib = schema.axisContributions[a.id] ?? 0;
    tot += 0.5 * contrib + 0.3 * cov + 0.2 * prog;
  }
  return Math.round(tot / axes.length);
}

export function computeMaturity(input: SchemaMetricsInput): SchemaMaturity {
  const { schema, ambition, lastReviewAt, nowMonthOffset } = input;
  const plain = (ambition ?? '').replace(/<[^>]+>/g, '');
  const amb = plain ? Math.min(100, Math.round(plain.length / 1.8)) : 0;
  const okrAvg =
    schema.expectedOutcomes.length > 0
      ? schema.expectedOutcomes.reduce((s, o) => s + o.progressPct, 0) /
        schema.expectedOutcomes.length
      : 0;
  const obj = Math.round(
    0.5 * Math.min(100, schema.expectedOutcomes.length * 25) + 0.5 * okrAvg,
  );
  const chAvg =
    schema.majorInitiatives.length > 0
      ? schema.majorInitiatives.reduce((s, c) => s + c.progressPct, 0) /
        schema.majorInitiatives.length
      : 0;
  const cha = Math.round(
    0.5 * Math.min(100, schema.majorInitiatives.length * 15) + 0.5 * chAvg,
  );
  const bTot = Object.values(schema.budgetsByYear).reduce((a, b) => a + b, 0);
  const cTot = schema.majorInitiatives.reduce((s, c) => s + c.budgetCents, 0);
  const bud = cTot ? Math.round(Math.min(100, (bTot / cTot) * 100)) : bTot ? 100 : 0;
  const ris = Math.min(100, schema.risks.length * 30);
  let rev = 0;
  if (lastReviewAt) {
    const days = Math.round((Date.now() - lastReviewAt.getTime()) / 864e5);
    rev = Math.max(0, Math.min(100, 100 - Math.max(0, days - 90) / 3.65));
  }
  void nowMonthOffset;
  return {
    Ambition: amb,
    Objectifs: obj,
    Chantiers: cha,
    Budget: bud,
    Risques: ris,
    Revue: Math.round(rev),
  };
}

export function computeSchemaAlerts(input: SchemaMetricsInput): SchemaAlert[] {
  const { schema, visionAxes, lastReviewAt, nowMonthOffset } = input;
  const alerts: SchemaAlert[] = [];
  const add = (level: SchemaAlert['level'], title: string, detail: string) =>
    alerts.push({ level, title, detail });

  const qlbl = (m: number) => {
    const y = schema.horizonStartYear + Math.floor(m / 12);
    const t = Math.floor((m % 12) / 3) + 1;
    return `T${t} ${y}`;
  };

  for (const a of visionAxes) {
    const n = schema.majorInitiatives.filter((c) => c.strategicAxisIds.includes(a.id)).length;
    const v = schema.axisContributions[a.id] ?? 0;
    if (!n) {
      add(
        v > 0 ? 'warning' : 'danger',
        `Axe groupe non couvert — ${a.name}`,
        v > 0
          ? `Contribution déclarée à ${v} % mais aucun chantier rattaché à cet axe.`
          : 'Aucune contribution déclarée et aucun chantier rattaché.',
      );
    } else if (v < 45) {
      add(
        'warning',
        `Contribution faible — ${a.name}`,
        `${v} % déclarés pour ${n} chantier${n > 1 ? 's' : ''} rattaché${n > 1 ? 's' : ''}.`,
      );
    }
  }

  if (visionAxes.length === 0) {
    add(
      'info',
      'Aucun axe du groupe retenu',
      'Sélectionnez les axes concernés dans Alignement — les alertes de couverture ne portent que sur ces axes.',
    );
  }

  const retainedIds = new Set(visionAxes.map((a) => a.id));

  for (const c of schema.majorInitiatives) {
    if (c.endMonthOffset <= nowMonthOffset && c.progressPct < 100) {
      add(
        'danger',
        `Chantier en retard — ${c.title}`,
        `Fin prévue ${qlbl(Math.max(0, c.endMonthOffset - 1))}, avancement ${c.progressPct} %. Pilote ${c.ownerLabel}.`,
      );
    } else if (c.startMonthOffset <= nowMonthOffset && c.progressPct === 0) {
      add(
        'warning',
        `Chantier non démarré — ${c.title}`,
        `Fenêtre ouverte depuis ${qlbl(c.startMonthOffset)} sans avancement déclaré.`,
      );
    }
    if (!c.strategicAxisIds.length) {
      add(
        'warning',
        `Chantier non aligné — ${c.title}`,
        'Aucun rattachement à un axe du groupe : il ne remonte pas dans la consolidation.',
      );
    } else if (
      retainedIds.size > 0 &&
      !c.strategicAxisIds.some((id) => retainedIds.has(id))
    ) {
      add(
        'warning',
        `Chantier hors axes retenus — ${c.title}`,
        'Rattaché à des axes non retenus pour cette direction — cochez l’axe dans Alignement ou changez le chantier.',
      );
    }
  }

  schema.ownAxes.forEach((x, i) => {
    if (!schema.majorInitiatives.filter((c) => c.lane === i).length) {
      add(
        'info',
        `Axe propre sans chantier — ${x.name}`,
        'Axe déclaré mais aucune ligne du schéma directeur ne le porte.',
      );
    }
  });

  const bTot = Object.values(schema.budgetsByYear).reduce((a, b) => a + b, 0);
  const cTot = schema.majorInitiatives.reduce((s, c) => s + c.budgetCents, 0);
  if (cTot > bTot) {
    add(
      'danger',
      'Budget non couvert',
      `${formatEur(cTot)} de charge chantiers pour ${formatEur(bTot)} budgétés sur l’horizon — écart de ${formatEur(cTot - bTot)}.`,
    );
  }

  if (lastReviewAt) {
    const days = Math.round((Date.now() - lastReviewAt.getTime()) / 864e5);
    if (days > 180) {
      add(
        'warning',
        'Revue stratégique périmée',
        `Dernière revue il y a ${days} jours. Le cycle attendu est semestriel.`,
      );
    }
  }

  if (!schema.expectedOutcomes.length) {
    add(
      'danger',
      'Aucun objectif mesurable',
      'Le schéma directeur n’a pas d’OKR : l’avancement ne peut pas être évalué.',
    );
  }
  if (!schema.risks.length) {
    add('info', 'Aucun risque déclaré', 'La dimension Risques de la maturité reste à 0 %.');
  }

  const order = { danger: 0, warning: 1, info: 2 };
  return alerts.sort((x, y) => order[x.level] - order[y.level]);
}

export function formatEur(cents: number): string {
  if (!cents) return '—';
  const n = cents / 100;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.', ',')} M€`;
  return `${Math.round(n / 1000)} k€`;
}

const STOP = new Set([
  'refonte',
  'pilotage',
  'strategique',
  'interne',
  'projet',
  'projets',
  'gestion',
  'nouvelle',
  'nouveau',
  'cycle',
  'direction',
  'plan',
  'mise',
  'tous',
  'pour',
  'avec',
  'dans',
  'leur',
]);

export function tokenizeTitle(s: string): string[] {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP.has(w));
}

export type OverlapPair = {
  a: { directionId: string; directionCode: string; initiative: NormalizedInitiative };
  b: { directionId: string; directionCode: string; initiative: NormalizedInitiative };
  shared: string[];
  overlapMonths: number;
  severity: 'high' | 'mid' | 'low';
};

export function detectInitiativeOverlaps(
  items: Array<{
    directionId: string;
    directionCode: string;
    initiatives: NormalizedInitiative[];
  }>,
  horizonMonths: number,
): OverlapPair[] {
  const all: Array<{
    directionId: string;
    directionCode: string;
    initiative: NormalizedInitiative;
    tk: string[];
  }> = [];
  for (const d of items) {
    for (const c of d.initiatives) {
      all.push({
        directionId: d.directionId,
        directionCode: d.directionCode,
        initiative: c,
        tk: tokenizeTitle(c.title),
      });
    }
  }
  const out: OverlapPair[] = [];
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      if (all[i].directionId === all[j].directionId) continue;
      const shared = all[i].tk.filter((t) => all[j].tk.includes(t));
      if (!shared.length) continue;
      const os = Math.max(all[i].initiative.startMonthOffset, all[j].initiative.startMonthOffset);
      const oe = Math.min(all[i].initiative.endMonthOffset, all[j].initiative.endMonthOffset);
      const ov = Math.max(0, oe - os);
      const sev: OverlapPair['severity'] = ov >= 12 ? 'high' : ov >= 6 ? 'mid' : 'low';
      out.push({
        a: {
          directionId: all[i].directionId,
          directionCode: all[i].directionCode,
          initiative: all[i].initiative,
        },
        b: {
          directionId: all[j].directionId,
          directionCode: all[j].directionCode,
          initiative: all[j].initiative,
        },
        shared,
        overlapMonths: ov,
        severity: sev,
      });
    }
  }
  void horizonMonths;
  return out.sort((x, y) => y.shared.length - x.shared.length).slice(0, 6);
}

export function computeSchemaMetrics(input: SchemaMetricsInput) {
  return {
    score: computeAlignmentScore(input.schema, input.visionAxes),
    maturity: computeMaturity(input),
    alerts: computeSchemaAlerts(input),
  };
}

export type { NormalizedOutcome, NormalizedRisk };
