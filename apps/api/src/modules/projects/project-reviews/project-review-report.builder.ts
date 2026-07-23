import type { ProjectReviewSnapshotPayload } from './project-reviews-snapshot.builder';
import {
  resolveReportClientLogoUrl,
  resolveStariumReportLogoUrl,
  STARIUM_REPORT_COLORS,
  STARIUM_REPORT_LINK_STYLE,
} from './project-review-report-branding.helpers';

const REVIEW_TYPE_LABEL: Record<string, string> = {
  COPIL: 'Point COPIL',
  COPRO: 'Point COPRO',
  CODIR_REVIEW: 'Point CODIR',
  RISK_REVIEW: 'Point risques',
  MILESTONE_REVIEW: 'Point jalons',
  AD_HOC: 'Point ad hoc',
  POST_MORTEM: "Retour d'expérience",
  PROJECT_REVIEW: 'Revue projet',
  BUDGET_REVIEW: 'Revue budget',
  ARBITRATION: 'Arbitrage',
  CRISIS_POINT: 'Point de crise',
  OTHER: 'Autre',
};

const MEETING_MODE_LABEL: Record<string, string> = {
  REMOTE: 'Visio',
  ONSITE: 'Présentiel',
  HYBRID: 'Hybride',
};

const PROJECT_STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Brouillon',
  PLANNED: 'Planifié',
  IN_PROGRESS: 'En cours',
  ON_HOLD: 'En pause',
  COMPLETED: 'Terminé',
  CANCELLED: 'Annulé',
  ARCHIVED: 'Archivé',
};

const PROJECT_PRIORITY_LABEL: Record<string, string> = {
  LOW: 'Basse',
  MEDIUM: 'Moyenne',
  HIGH: 'Haute',
};

const COMMITTEE_MOOD_LABEL: Record<string, string> = {
  GREEN: 'Ensoleillé',
  ORANGE: 'Mitigé',
  RED: 'Difficile',
};

/** Libellés météo unifiés (point ou repli santé projet). */
const METEO_WEATHER_LABEL = COMMITTEE_MOOD_LABEL;

const HEALTH_COLOR: Record<string, { bg: string; text: string }> = {
  GREEN: { bg: STARIUM_REPORT_COLORS.successBg, text: STARIUM_REPORT_COLORS.success },
  ORANGE: { bg: STARIUM_REPORT_COLORS.warningBg, text: STARIUM_REPORT_COLORS.warning },
  RED: { bg: STARIUM_REPORT_COLORS.dangerBg, text: STARIUM_REPORT_COLORS.danger },
  UNKNOWN: { bg: STARIUM_REPORT_COLORS.surfaceMuted, text: STARIUM_REPORT_COLORS.inkMuted },
};

const DECISION_TYPE_LABEL: Record<string, string> = {
  GO: 'Go',
  NO_GO: 'No go',
  ARBITRATION: 'Arbitrage',
  BUDGET_VALIDATION: 'Validation budget',
  SCOPE_CHANGE: 'Changement de périmètre',
  DEFER: 'Report',
  ESCALATION: 'Escalade',
  OTHER: 'Autre',
};

const DECISION_STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Brouillon',
  PROPOSED: 'Proposée',
  VALIDATED: 'Validée',
  REJECTED: 'Rejetée',
  REFUSED: 'Refusée',
  DEFERRED: 'Reportée',
  SUPERSEDED: 'Remplacée',
};

const AGENDA_STATUS_LABEL: Record<string, string> = {
  TODO: 'À traiter',
  IN_PROGRESS: 'En cours',
  DONE: 'Traité',
  SKIPPED: 'Non traité',
};

const ATTENDANCE_LABEL: Record<string, string> = {
  EXPECTED: 'Attendu',
  PRESENT: 'Présent',
  ABSENT: 'Absent',
  EXCUSED: 'Excusé',
};

const TASK_PRIORITY_LABEL: Record<string, string> = {
  LOW: 'Basse',
  MEDIUM: 'Moyenne',
  HIGH: 'Haute',
  CRITICAL: 'Critique',
};

const RISK_CRITICALITY_LABEL: Record<string, string> = {
  LOW: 'Faible',
  MEDIUM: 'Moyenne',
  HIGH: 'Haute',
  CRITICAL: 'Critique',
};

const RISK_STATUS_LABEL: Record<string, string> = {
  OPEN: 'Ouvert',
  MONITORED: 'Sous surveillance',
  MITIGATED: 'Atténué',
  CLOSED: 'Clôturé',
};

const MILESTONE_STATUS_LABEL: Record<string, string> = {
  PLANNED: 'Planifié',
  ACHIEVED: 'Atteint',
  DELAYED: 'En retard',
  CANCELLED: 'Annulé',
};

const ATTACHMENT_TYPE_LABEL: Record<string, string> = {
  URL: 'Lien web',
  DOCUMENT_REFERENCE: 'Document projet',
  POWERBI_LINK: 'Power BI',
  SHAREPOINT_LINK: 'SharePoint',
  FILE: 'Fichier',
  OTHER: 'Autre',
};

/** Paliers (métier / comité / CODIR) + statut global legacy. */
const ARBITRATION_STATUS_LABEL: Record<string, string> = {
  BROUILLON: 'Proposition',
  EN_COURS: 'En préparation',
  SOUMIS_VALIDATION: 'Soumis à validation',
  VALIDE: 'Validé',
  REFUSE: 'Refusé',
  // Global (`arbitrationStatus`)
  DRAFT: 'Brouillon',
  TO_REVIEW: 'À arbitrer',
  VALIDATED: 'Arbitrage validé',
  REJECTED: 'Arbitrage refusé',
};

/** Aligné UI fiche budget (`ALLOCATION_MODE_LABELS`). */
const ALLOCATION_TYPE_LABEL: Record<string, string> = {
  FULL: 'Intégral (100 % de la ligne)',
  PERCENTAGE: 'Pourcentage de la ligne',
  BUDGET_PERCENTAGE: 'Pourcentage du budget',
  FIXED: 'Montant fixe',
};

/* ── Utils ──────────────────────────────────────────────────────────────── */

function label(map: Record<string, string>, key: string | null | undefined, fallback = '—'): string {
  if (!key) return fallback;
  return map[key] ?? key;
}

function formatDateFr(iso: string | null | undefined): string {
  if (!iso?.trim()) return '—';
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'full',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatShortDateFr(iso: string | null | undefined): string {
  if (!iso?.trim()) return '—';
  try {
    return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildAppLink(path: string, baseUrl?: string | null): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const base = baseUrl?.trim().replace(/\/$/, '');
  return base ? `${base}${normalized}` : normalized;
}

function projectRoutes(projectId: string, reviewId: string) {
  return {
    review: `/projects/${projectId}?openReview=${reviewId}`,
    project: `/projects/${projectId}`,
    sheet: `/projects/${projectId}/sheet`,
    points: `/projects/${projectId}?tab=points`,
    tasks: `/projects/${projectId}/tasks`,
    risks: `/projects/${projectId}/risks`,
    milestones: `/projects/${projectId}/planning?sub=milestones`,
    budget: `/projects/${projectId}/budget`,
    planning: `/projects/${projectId}/planning`,
  };
}

/* ── HTML building blocks (inline styles — compatible e-mail) ─────────── */

const C = STARIUM_REPORT_COLORS;

const HTML_STYLES = {
  body: `font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:${C.text};line-height:1.5;max-width:760px;margin:0 auto;`,
  header: `background:${C.headerBg};color:${C.textOnDark};padding:24px 28px;border-radius:12px 12px 0 0;border-bottom:3px solid ${C.gold};`,
  headerSub: `margin:6px 0 0;font-size:14px;color:${C.headerTextSoft};`,
  nav: `background:${C.surfaceMuted};padding:12px 16px;border-bottom:1px solid ${C.border};`,
  navLink: `display:inline-block;margin:4px 6px 4px 0;padding:6px 12px;background:${C.surface};border:1px solid ${C.gold100};border-radius:999px;color:${C.gold700};font-size:13px;text-decoration:none;font-weight:600;`,
  kpiRow: 'width:100%;border-collapse:separate;border-spacing:8px;margin:16px 0;',
  kpiCell: `background:${C.surface};border:1px solid ${C.border};border-radius:10px;padding:14px 16px;text-align:center;vertical-align:top;width:25%;`,
  kpiValue: `font-size:22px;font-weight:700;color:${C.text};margin:0;`,
  kpiLabel: `font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:${C.textMuted};margin:4px 0 0;`,
  section: 'margin:20px 0;padding:0 4px;',
  sectionTitle: `font-size:15px;font-weight:700;color:${C.text};border-bottom:2px solid ${C.gold100};padding-bottom:8px;margin:0 0 12px;`,
  card: `background:${C.surface};border:1px solid ${C.border};border-radius:10px;padding:14px 16px;margin-bottom:10px;`,
  badge: (bg: string, color: string) =>
    `display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600;background:${bg};color:${color};`,
  table: 'width:100%;border-collapse:collapse;font-size:13px;',
  th: `text-align:left;padding:8px 10px;background:${C.surfaceMuted};border-bottom:1px solid ${C.border};font-size:11px;text-transform:uppercase;letter-spacing:0.04em;color:${C.textMuted};`,
  td: `padding:8px 10px;border-bottom:1px solid ${C.paper};vertical-align:top;`,
  progressTrack: `background:${C.border};border-radius:999px;height:8px;overflow:hidden;margin-top:6px;`,
  progressBar: (pct: number, color: string) =>
    `<div style="width:${Math.min(100, Math.max(0, pct))}%;background:${color};height:8px;border-radius:999px;"></div>`,
  footer: `margin-top:24px;padding:16px;text-align:center;font-size:12px;color:${C.textMuted};border-top:1px solid ${C.border};`,
  muted: `color:${C.textMuted};font-size:13px;`,
  inlineLink: STARIUM_REPORT_LINK_STYLE,
};

function htmlSection(id: string, title: string, body: string): string {
  return `<section id="${id}" style="${HTML_STYLES.section}"><h3 style="${HTML_STYLES.sectionTitle}">${escapeHtml(title)}</h3>${body}</section>`;
}

function htmlLink(href: string, label: string, style = HTML_STYLES.navLink): string {
  return `<a href="${escapeHtml(href)}" style="${style}">${escapeHtml(label)}</a>`;
}

function htmlBadge(text: string, bg: string, color: string): string {
  return `<span style="${HTML_STYLES.badge(bg, color)}">${escapeHtml(text)}</span>`;
}

function htmlMeteoWeatherIcon(healthKey: string, stroke: string): string {
  const common = `xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"`;
  if (healthKey === 'UNKNOWN') {
    return `<svg ${common}><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>`;
  }
  if (healthKey === 'RED') {
    return `<svg ${common}><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M16 14v6"/><path d="M8 14v6"/><path d="M12 16v6"/></svg>`;
  }
  if (healthKey === 'ORANGE') {
    return `<svg ${common}><path d="M12 2v2"/><path d="M4.93 4.93l1.41 1.41"/><path d="M20 12h2"/><path d="M19.07 4.93l-1.41 1.41"/><path d="M15.947 12.65a4 4 0 0 0-5.925-4.128"/><path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z"/></svg>`;
  }
  return `<svg ${common}><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`;
}

function htmlMeteoKpiContent(meteo: {
  healthKey: string;
  sectionLabel: string;
  valueLabel: string;
  colors: { bg: string; text: string };
}): string {
  return `<div style="display:flex;flex-direction:column;align-items:center;gap:8px;" role="img" aria-label="${escapeHtml(`${meteo.sectionLabel} : ${meteo.valueLabel}`)}">
        ${htmlMeteoWeatherIcon(meteo.healthKey, meteo.colors.text)}
        <p style="${HTML_STYLES.kpiValue};margin:0;">${htmlBadge(meteo.valueLabel, meteo.colors.bg, meteo.colors.text)}</p>
        <p style="${HTML_STYLES.kpiLabel}">${escapeHtml(meteo.sectionLabel)}</p>
      </div>`;
}

function resolveReportMeteo(snapshot: ProjectReviewSnapshotPayload): {
  healthKey: string;
  sectionLabel: string;
  valueLabel: string;
} {
  const committeeMood = snapshot.review.committeeMood;
  if (!committeeMood) {
    return {
      healthKey: 'UNKNOWN',
      sectionLabel: 'Météo du comité',
      valueLabel: 'Non renseignée',
    };
  }
  return {
    healthKey: committeeMood,
    sectionLabel: 'Météo du comité',
    valueLabel: label(METEO_WEATHER_LABEL, committeeMood),
  };
}

/* ── Public API ─────────────────────────────────────────────────────────── */

export type ProjectReviewReportContent = {
  subject: string;
  title: string;
  text: string;
  html: string;
};

export function buildProjectReviewReportContent(input: {
  projectName: string;
  projectId: string;
  reviewId: string;
  snapshot: ProjectReviewSnapshotPayload;
  appBaseUrl?: string | null;
  clientOrganization: {
    name: string;
    logoUrl?: string | null;
  };
}): ProjectReviewReportContent {
  const { snapshot, projectName, projectId, reviewId, appBaseUrl, clientOrganization } = input;
  const review = snapshot.review;
  const project = snapshot.project;
  const routes = projectRoutes(projectId, reviewId);
  const link = (path: string) => buildAppLink(path, appBaseUrl);
  const clientLogoUrl = resolveReportClientLogoUrl({
    clientName: clientOrganization.name,
    clientLogoUrl: clientOrganization.logoUrl,
    appBaseUrl,
  });
  const stariumLogoUrl = resolveStariumReportLogoUrl(appBaseUrl);

  const typeLabel = label(REVIEW_TYPE_LABEL, review.type, 'Point projet');
  const reviewTitle = review.title?.trim() || typeLabel;
  const subject = `Compte rendu — ${typeLabel} — ${projectName}`;
  const title = `Compte rendu — ${projectName}`;

  const meteo = resolveReportMeteo(snapshot);
  const healthColors = HEALTH_COLOR[meteo.healthKey] ?? HEALTH_COLOR.GREEN;
  const progressPct = snapshot.progress.globalProgress ?? 0;
  const progressColor =
    progressPct >= 75 ? C.success : progressPct >= 40 ? C.warning : C.danger;

  /* ── Text version ─────────────────────────────────────────────────────── */

  const textLines: string[] = [
    title,
    '═'.repeat(40),
    '',
    `Organisation : ${clientOrganization.name}`,
    `Projet : ${projectName}`,
    `Type : ${typeLabel}`,
    `Objet : ${reviewTitle}`,
    `Statut projet : ${label(PROJECT_STATUS_LABEL, project.status)}`,
    `${meteo.sectionLabel} : ${meteo.valueLabel}`,
    `Priorité : ${label(PROJECT_PRIORITY_LABEL, project.priority)}`,
    `Avancement : ${progressPct}%`,
  ];

  if (review.reviewDate) textLines.push(`Date du point : ${formatDateFr(review.reviewDate)}`);
  if (review.facilitatorDisplayName?.trim()) {
    textLines.push(`Animateur : ${review.facilitatorDisplayName.trim()}`);
  }
  if (review.periodStart || review.periodEnd) {
    textLines.push(
      `Période couverte : ${formatShortDateFr(review.periodStart)} → ${formatShortDateFr(review.periodEnd)}`,
    );
  }

  textLines.push('', '— Accès rapide —');
  textLines.push(`Point : ${link(routes.review)}`);
  textLines.push(`Projet : ${link(routes.project)}`);
  textLines.push(`Fiche projet : ${link(routes.sheet)}`);
  textLines.push(`Tâches : ${link(routes.tasks)}`);
  textLines.push(`Risques : ${link(routes.risks)}`);
  textLines.push(`Jalons : ${link(routes.milestones)}`);
  textLines.push(`Budget : ${link(routes.budget)}`);

  textLines.push('', '— Pilotage —');
  textLines.push(
    `Tâches : ${snapshot.tasks.open} ouvertes · ${snapshot.tasks.inProgress} en cours · ${snapshot.tasks.done} terminées · ${snapshot.tasks.late} en retard`,
  );
  textLines.push(
    `Risques : ${snapshot.risks.open} ouverts · ${snapshot.risks.monitored} surveillés · ${snapshot.risks.mitigated} atténués · ${snapshot.risks.closed} clôturés`,
  );

  if (review.objective?.trim()) {
    textLines.push('', 'Objectif', review.objective.trim());
  }

  const arbEntries = [
    ['Métier', snapshot.arbitration.arbitrationMetierStatus],
    ['Comité', snapshot.arbitration.arbitrationComiteStatus],
    ['CODIR', snapshot.arbitration.arbitrationCodirStatus],
    ['Global', snapshot.arbitration.arbitrationStatus],
  ].filter(([, v]) => v);
  if (arbEntries.length > 0) {
    textLines.push('', 'Arbitrages');
    for (const [level, status] of arbEntries) {
      textLines.push(`  ${level} : ${label(ARBITRATION_STATUS_LABEL, status as string)}`);
    }
  }

  if (snapshot.milestones.length > 0) {
    textLines.push('', `Jalons à venir (${snapshot.milestones.length})`);
    for (const m of snapshot.milestones) {
      textLines.push(
        `  • ${m.name} — ${formatShortDateFr(m.targetDate)} (${label(MILESTONE_STATUS_LABEL, m.status)})`,
      );
    }
  }

  if (snapshot.risks.topRisks.length > 0) {
    textLines.push('', `Top risques (${snapshot.risks.topRisks.length})`);
    for (const r of snapshot.risks.topRisks) {
      textLines.push(
        `  • ${r.title} — ${label(RISK_CRITICALITY_LABEL, r.criticality)} (${label(RISK_STATUS_LABEL, r.status)})`,
      );
    }
  }

  if (snapshot.budget?.links.length) {
    textLines.push('', `Liaisons budget (${snapshot.budget.links.length})`);
    for (const b of snapshot.budget.links) {
      const amt = b.amount ? `${b.amount} €` : b.percentage ? `${b.percentage} %` : '—';
      textLines.push(
        `  • ${b.label} (${label(ALLOCATION_TYPE_LABEL, b.allocationType)}) : ${amt}`,
      );
    }
  }

  if (snapshot.meeting?.meetingMode || snapshot.meeting?.location) {
    textLines.push('', 'Réunion');
    if (snapshot.meeting.meetingMode) {
      textLines.push(`Mode : ${label(MEETING_MODE_LABEL, snapshot.meeting.meetingMode)}`);
    }
    if (snapshot.meeting.location?.trim()) {
      textLines.push(`Lieu : ${snapshot.meeting.location.trim()}`);
    }
  }

  if (snapshot.participants.length > 0) {
    textLines.push('', `Participants (${snapshot.participants.length})`);
    for (const p of snapshot.participants) {
      const parts = [p.displayName?.trim() || 'Participant'];
      if (p.roleLabel?.trim()) parts.push(p.roleLabel.trim());
      if (p.attendanceStatus) parts.push(label(ATTENDANCE_LABEL, p.attendanceStatus));
      textLines.push(`  • ${parts.join(' · ')}`);
    }
  }

  if (snapshot.agenda.length > 0) {
    textLines.push('', `Ordre du jour (${snapshot.agenda.length})`);
    for (const item of snapshot.agenda) {
      textLines.push(
        '',
        `${item.orderIndex + 1}. ${item.title} (${label(AGENDA_STATUS_LABEL, item.status)})`,
      );
      if (item.notes?.trim()) textLines.push(`   Notes : ${item.notes.trim()}`);
      if (item.decisionSummary?.trim()) {
        textLines.push(`   Synthèse : ${item.decisionSummary.trim()}`);
      }
      for (const d of item.decisions) {
        textLines.push(
          `   ▸ Décision : ${d.title} (${label(DECISION_TYPE_LABEL, d.decisionType)} · ${label(DECISION_STATUS_LABEL, d.status)})`,
        );
        if (d.description?.trim()) textLines.push(`     ${d.description.trim()}`);
        if (d.impact?.trim()) textLines.push(`     Impact : ${d.impact.trim()}`);
      }
      for (const a of item.actionItems) {
        const parts = [a.title];
        if (a.responsibleDisplayName?.trim()) parts.push(a.responsibleDisplayName.trim());
        if (a.dueDate) parts.push(formatShortDateFr(a.dueDate));
        if (a.priority) parts.push(label(TASK_PRIORITY_LABEL, a.priority));
        textLines.push(`   ▸ Action : ${parts.join(' · ')}`);
      }
    }
  }

  if (snapshot.untreatedAgendaItems.length > 0) {
    textLines.push('', `Points ODJ non traités (${snapshot.untreatedAgendaItems.length})`);
    for (const item of snapshot.untreatedAgendaItems) {
      textLines.push(`  • ${item.title} (${label(AGENDA_STATUS_LABEL, item.status)})`);
    }
  }

  if (snapshot.decisions.length > 0) {
    textLines.push('', `Décisions hors ODJ (${snapshot.decisions.length})`);
    for (const d of snapshot.decisions) {
      textLines.push(
        `  • ${d.title} (${label(DECISION_TYPE_LABEL, d.decisionType)} · ${label(DECISION_STATUS_LABEL, d.status)})`,
      );
      if (d.impact?.trim()) textLines.push(`    Impact : ${d.impact.trim()}`);
    }
  }

  if (snapshot.actions.length > 0) {
    textLines.push('', `Actions de suivi (${snapshot.actions.length})`);
    for (const a of snapshot.actions) {
      const parts = [a.title];
      if (a.responsibleDisplayName?.trim()) parts.push(a.responsibleDisplayName.trim());
      if (a.dueDate) parts.push(formatShortDateFr(a.dueDate));
      textLines.push(`  • ${parts.join(' · ')}`);
    }
  }

  if (snapshot.attachments.length > 0) {
    textLines.push('', `Documents & liens (${snapshot.attachments.length})`);
    for (const att of snapshot.attachments) {
      textLines.push(
        `  • ${att.title} (${label(ATTACHMENT_TYPE_LABEL, att.attachmentType)})`,
      );
    }
  }

  if (snapshot.nextSteps) {
    textLines.push('', 'Prochain point', formatShortDateFr(snapshot.nextSteps));
  }

  textLines.push('', '—', 'Document généré par Starium Orchestra', link(routes.review));

  const text = textLines.join('\n');

  /* ── HTML version ─────────────────────────────────────────────────────── */

  const quickLinks = [
    { href: link(routes.review), label: 'Ouvrir le point' },
    { href: link(routes.project), label: 'Projet' },
    { href: link(routes.sheet), label: 'Fiche projet' },
    { href: link(routes.tasks), label: 'Tâches' },
    { href: link(routes.risks), label: 'Risques' },
    { href: link(routes.milestones), label: 'Jalons' },
    { href: link(routes.budget), label: 'Budget' },
    { href: link(routes.planning), label: 'Planning' },
  ];

  const kpiHtml = `
    <table role="presentation" style="${HTML_STYLES.kpiRow}"><tr>
      <td style="${HTML_STYLES.kpiCell}">
        ${htmlMeteoKpiContent({ ...meteo, colors: healthColors })}
      </td>
      <td style="${HTML_STYLES.kpiCell}">
        <p style="${HTML_STYLES.kpiValue}">${progressPct}%</p>
        <div style="${HTML_STYLES.progressTrack}">${HTML_STYLES.progressBar(progressPct, progressColor)}</div>
        <p style="${HTML_STYLES.kpiLabel}">Avancement</p>
      </td>
      <td style="${HTML_STYLES.kpiCell}">
        <p style="${HTML_STYLES.kpiValue}">${snapshot.tasks.late > 0 ? `<span style="color:${C.danger};">${snapshot.tasks.late}</span>` : '0'}</p>
        <p style="${HTML_STYLES.muted}">${snapshot.tasks.open} ouv. · ${snapshot.tasks.inProgress} enc.</p>
        <p style="${HTML_STYLES.kpiLabel}">Tâches</p>
      </td>
      <td style="${HTML_STYLES.kpiCell}">
        <p style="${HTML_STYLES.kpiValue}">${snapshot.risks.open}</p>
        <p style="${HTML_STYLES.muted}">${snapshot.risks.topRisks.length} top · ${snapshot.risks.monitored} surv.</p>
        <p style="${HTML_STYLES.kpiLabel}">Risques ouverts</p>
      </td>
    </tr></table>`;

  const headerHtml = `
    <div style="${HTML_STYLES.header}">
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="width:72px;vertical-align:top;padding-right:16px;">
            <img src="${escapeHtml(clientLogoUrl)}" alt="Logo ${escapeHtml(clientOrganization.name)}" width="56" height="56" style="display:block;width:56px;height:56px;border-radius:14px;border:2px solid ${C.gold};object-fit:cover;background:${C.headerBg};" />
          </td>
          <td style="vertical-align:top;">
            <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:${C.textOnDark};letter-spacing:0.02em;">${escapeHtml(clientOrganization.name)}</p>
            <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:${C.headerTextSoft};">Compte rendu de point projet</p>
            <h1 style="margin:8px 0 0;font-size:22px;font-weight:700;line-height:1.25;">${escapeHtml(projectName)}</h1>
            <p style="${HTML_STYLES.headerSub}">${escapeHtml(typeLabel)} · ${escapeHtml(reviewTitle)}</p>
            ${review.reviewDate ? `<p style="${HTML_STYLES.headerSub}">${escapeHtml(formatDateFr(review.reviewDate))}${review.facilitatorDisplayName?.trim() ? ` · Animateur : ${escapeHtml(review.facilitatorDisplayName.trim())}` : ''}</p>` : ''}
          </td>
          <td style="width:148px;vertical-align:top;text-align:right;padding-left:12px;">
            <img src="${escapeHtml(stariumLogoUrl)}" alt="Starium Orchestra" width="132" height="28" style="display:inline-block;max-width:132px;height:auto;opacity:0.92;" />
          </td>
        </tr>
      </table>
    </div>`;

  const navHtml = `
    <nav style="${HTML_STYLES.nav}" aria-label="Accès rapide">
      <strong style="font-size:12px;color:${C.textMuted};margin-right:8px;">Accès rapide :</strong>
      ${quickLinks.map((l) => htmlLink(l.href, l.label)).join('')}
    </nav>`;

  const metaHtml = `
    <div style="padding:16px 20px;background:${C.surface};border-bottom:1px solid ${C.border};">
      <table style="${HTML_STYLES.table}"><tr>
        <td style="${HTML_STYLES.td}"><strong>Statut</strong><br/><span style="${HTML_STYLES.muted}">${escapeHtml(label(PROJECT_STATUS_LABEL, project.status))}</span></td>
        <td style="${HTML_STYLES.td}"><strong>Priorité</strong><br/><span style="${HTML_STYLES.muted}">${escapeHtml(label(PROJECT_PRIORITY_LABEL, project.priority))}</span></td>
        ${review.periodStart || review.periodEnd ? `<td style="${HTML_STYLES.td}"><strong>Période</strong><br/><span style="${HTML_STYLES.muted}">${escapeHtml(formatShortDateFr(review.periodStart))} → ${escapeHtml(formatShortDateFr(review.periodEnd))}</span></td>` : ''}
        ${review.durationMinutes ? `<td style="${HTML_STYLES.td}"><strong>Durée</strong><br/><span style="${HTML_STYLES.muted}">${review.durationMinutes} min</span></td>` : ''}
      </tr></table>
    </div>`;

  let bodySections = '';

  bodySections += kpiHtml;

  if (review.objective?.trim()) {
    bodySections += htmlSection(
      'objectif',
      'Objectif du point',
      `<div style="${HTML_STYLES.card}"><p style="margin:0;">${escapeHtml(review.objective.trim())}</p></div>`,
    );
  }

  if (arbEntries.length > 0) {
    const rows = arbEntries
      .map(
        ([level, status]) =>
          `<tr><td style="${HTML_STYLES.td}"><strong>${escapeHtml(level as string)}</strong></td><td style="${HTML_STYLES.td}">${htmlBadge(label(ARBITRATION_STATUS_LABEL, status as string), C.surfaceMuted, C.inkMuted)}</td></tr>`,
      )
      .join('');
    bodySections += htmlSection(
      'arbitrages',
      'Arbitrages',
      `<table style="${HTML_STYLES.table}">${rows}</table>`,
    );
  }

  if (snapshot.milestones.length > 0) {
    const rows = snapshot.milestones
      .map(
        (m) =>
          `<tr><td style="${HTML_STYLES.td}"><strong>${escapeHtml(m.name)}</strong></td><td style="${HTML_STYLES.td}">${escapeHtml(formatShortDateFr(m.targetDate))}</td><td style="${HTML_STYLES.td}">${htmlBadge(label(MILESTONE_STATUS_LABEL, m.status), C.surfaceMuted, C.inkMuted)}</td></tr>`,
      )
      .join('');
    bodySections += htmlSection(
      'jalons',
      `Jalons à venir (${snapshot.milestones.length})`,
      `<table style="${HTML_STYLES.table}"><thead><tr><th style="${HTML_STYLES.th}">Jalon</th><th style="${HTML_STYLES.th}">Échéance</th><th style="${HTML_STYLES.th}">Statut</th></tr></thead><tbody>${rows}</tbody></table>
      <p style="margin:8px 0 0;">${htmlLink(link(routes.milestones), 'Voir le planning →', HTML_STYLES.inlineLink)}</p>`,
    );
  }

  if (snapshot.risks.topRisks.length > 0) {
    const critColors: Record<string, { bg: string; text: string }> = {
      LOW: { bg: C.successBg, text: C.success },
      MEDIUM: { bg: C.warningBg, text: C.warning },
      HIGH: { bg: C.dangerBg, text: C.danger },
      CRITICAL: { bg: C.dangerBg, text: C.danger },
    };
    const rows = snapshot.risks.topRisks
      .map((r) => {
        const c = critColors[r.criticality] ?? critColors.MEDIUM;
        return `<tr><td style="${HTML_STYLES.td}"><strong>${escapeHtml(r.title)}</strong></td><td style="${HTML_STYLES.td}">${htmlBadge(label(RISK_CRITICALITY_LABEL, r.criticality), c.bg, c.text)}</td><td style="${HTML_STYLES.td}">${escapeHtml(label(RISK_STATUS_LABEL, r.status))}</td></tr>`;
      })
      .join('');
    bodySections += htmlSection(
      'risques',
      `Top risques (${snapshot.risks.topRisks.length})`,
      `<table style="${HTML_STYLES.table}"><thead><tr><th style="${HTML_STYLES.th}">Risque</th><th style="${HTML_STYLES.th}">Criticité</th><th style="${HTML_STYLES.th}">Statut</th></tr></thead><tbody>${rows}</tbody></table>
      <p style="margin:8px 0 0;">${htmlLink(link(routes.risks), 'Registre des risques →', HTML_STYLES.inlineLink)}</p>`,
    );
  }

  if (snapshot.budget?.links.length) {
    const rows = snapshot.budget.links
      .map((b) => {
        const amt = b.amount ? `${b.amount} €` : b.percentage ? `${b.percentage} %` : '—';
        const typeLabel = label(ALLOCATION_TYPE_LABEL, b.allocationType);
        return `<tr><td style="${HTML_STYLES.td}">${escapeHtml(b.label)}</td><td style="${HTML_STYLES.td}">${escapeHtml(typeLabel)}</td><td style="${HTML_STYLES.td}">${escapeHtml(amt)}</td></tr>`;
      })
      .join('');
    bodySections += htmlSection(
      'budget',
      `Budget projet (${snapshot.budget.links.length})`,
      `<table style="${HTML_STYLES.table}"><thead><tr><th style="${HTML_STYLES.th}">Ligne</th><th style="${HTML_STYLES.th}">Type</th><th style="${HTML_STYLES.th}">Montant</th></tr></thead><tbody>${rows}</tbody></table>
      <p style="margin:8px 0 0;">${htmlLink(link(routes.budget), 'Cockpit budget →', HTML_STYLES.inlineLink)}</p>`,
    );
  }

  if (snapshot.participants.length > 0) {
    const chips = snapshot.participants
      .map((p) => {
        const name = p.displayName?.trim() || 'Participant';
        const meta = [p.roleLabel?.trim(), p.attendanceStatus ? label(ATTENDANCE_LABEL, p.attendanceStatus) : null]
          .filter(Boolean)
          .join(' · ');
        return `<div style="${HTML_STYLES.card}"><strong>${escapeHtml(name)}</strong>${meta ? `<br/><span style="${HTML_STYLES.muted}">${escapeHtml(meta)}</span>` : ''}</div>`;
      })
      .join('');
    bodySections += htmlSection('participants', `Participants (${snapshot.participants.length})`, chips);
  }

  if (snapshot.agenda.length > 0) {
    let agendaBody = '';
    for (const item of snapshot.agenda) {
      const statusColors: Record<string, { bg: string; text: string }> = {
        DONE: { bg: C.successBg, text: C.success },
        IN_PROGRESS: { bg: C.gold050, text: C.gold700 },
        TODO: { bg: C.surfaceMuted, text: C.textMuted },
        SKIPPED: { bg: C.dangerBg, text: C.danger },
      };
      const st = statusColors[item.status] ?? statusColors.TODO;
      agendaBody += `<div style="${HTML_STYLES.card}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
          <strong>${item.orderIndex + 1}. ${escapeHtml(item.title)}</strong>
          ${htmlBadge(label(AGENDA_STATUS_LABEL, item.status), st.bg, st.text)}
        </div>`;
      if (item.notes?.trim()) {
        agendaBody += `<p style="margin:10px 0 0;"><strong>Notes :</strong> ${escapeHtml(item.notes.trim())}</p>`;
      }
      if (item.decisionSummary?.trim()) {
        agendaBody += `<p style="margin:6px 0 0;background:${C.successBg};border-left:3px solid ${C.success};padding:8px 12px;border-radius:0 6px 6px 0;"><strong>Synthèse :</strong> ${escapeHtml(item.decisionSummary.trim())}</p>`;
      }
      if (item.decisions.length > 0 || item.actionItems.length > 0) {
        agendaBody += '<ul style="margin:10px 0 0;padding-left:18px;">';
        for (const d of item.decisions) {
          agendaBody += `<li style="margin-bottom:6px;"><strong>Décision :</strong> ${escapeHtml(d.title)} <span style="${HTML_STYLES.muted}">(${escapeHtml(label(DECISION_TYPE_LABEL, d.decisionType))} · ${escapeHtml(label(DECISION_STATUS_LABEL, d.status))})</span>${d.impact?.trim() ? `<br/><span style="${HTML_STYLES.muted}">Impact : ${escapeHtml(d.impact.trim())}</span>` : ''}</li>`;
        }
        for (const a of item.actionItems) {
          const meta = [
            a.responsibleDisplayName?.trim(),
            a.dueDate ? formatShortDateFr(a.dueDate) : null,
            a.priority ? label(TASK_PRIORITY_LABEL, a.priority) : null,
          ]
            .filter(Boolean)
            .join(' · ');
          agendaBody += `<li style="margin-bottom:6px;"><strong>Action :</strong> ${escapeHtml(a.title)}${meta ? ` <span style="${HTML_STYLES.muted}">(${escapeHtml(meta)})</span>` : ''}</li>`;
        }
        agendaBody += '</ul>';
      }
      agendaBody += '</div>';
    }
    bodySections += htmlSection('odj', `Ordre du jour (${snapshot.agenda.length})`, agendaBody);
  }

  if (snapshot.untreatedAgendaItems.length > 0) {
    const list = snapshot.untreatedAgendaItems
      .map(
        (item) =>
          `<li style="margin-bottom:4px;">${escapeHtml(item.title)} (${escapeHtml(label(AGENDA_STATUS_LABEL, item.status))})</li>`,
      )
      .join('');
    bodySections += htmlSection(
      'odj-non-traites',
      `Points ODJ non traités (${snapshot.untreatedAgendaItems.length})`,
      `<ul style="margin:0;padding-left:18px;color:${C.danger};">${list}</ul>`,
    );
  }

  if (snapshot.decisions.length > 0) {
    const cards = snapshot.decisions
      .map(
        (d) =>
          `<div style="${HTML_STYLES.card}"><strong>${escapeHtml(d.title)}</strong> ${htmlBadge(label(DECISION_STATUS_LABEL, d.status), C.gold050, C.gold700)}<br/><span style="${HTML_STYLES.muted}">${escapeHtml(label(DECISION_TYPE_LABEL, d.decisionType))}${d.agendaItemTitle ? ` · ${escapeHtml(d.agendaItemTitle)}` : ''}</span>${d.impact?.trim() ? `<p style="margin:8px 0 0;">Impact : ${escapeHtml(d.impact.trim())}</p>` : ''}</div>`,
      )
      .join('');
    bodySections += htmlSection('decisions', `Décisions (${snapshot.decisions.length})`, cards);
  }

  if (snapshot.actions.length > 0) {
    const rows = snapshot.actions
      .map((a) => {
        const meta = [
          a.responsibleDisplayName?.trim(),
          a.dueDate ? formatShortDateFr(a.dueDate) : null,
          a.priority ? label(TASK_PRIORITY_LABEL, a.priority) : null,
        ]
          .filter(Boolean)
          .join(' · ');
        return `<tr><td style="${HTML_STYLES.td}"><strong>${escapeHtml(a.title)}</strong></td><td style="${HTML_STYLES.td}">${escapeHtml(meta || '—')}</td></tr>`;
      })
      .join('');
    bodySections += htmlSection(
      'actions',
      `Actions de suivi (${snapshot.actions.length})`,
      `<table style="${HTML_STYLES.table}"><thead><tr><th style="${HTML_STYLES.th}">Action</th><th style="${HTML_STYLES.th}">Responsable · Échéance</th></tr></thead><tbody>${rows}</tbody></table>
      <p style="margin:8px 0 0;">${htmlLink(link(routes.tasks), 'Voir les tâches →', HTML_STYLES.inlineLink)}</p>`,
    );
  }

  if (snapshot.attachments.length > 0) {
    const rows = snapshot.attachments
      .map(
        (att) =>
          `<tr><td style="${HTML_STYLES.td}"><strong>${escapeHtml(att.title)}</strong></td><td style="${HTML_STYLES.td}">${escapeHtml(label(ATTACHMENT_TYPE_LABEL, att.attachmentType))}</td><td style="${HTML_STYLES.td}">${att.agendaItemTitle ? escapeHtml(att.agendaItemTitle) : '—'}</td></tr>`,
      )
      .join('');
    bodySections += htmlSection(
      'pieces-jointes',
      `Documents & liens (${snapshot.attachments.length})`,
      `<table style="${HTML_STYLES.table}"><thead><tr><th style="${HTML_STYLES.th}">Titre</th><th style="${HTML_STYLES.th}">Type</th><th style="${HTML_STYLES.th}">Point ODJ</th></tr></thead><tbody>${rows}</tbody></table>`,
    );
  }

  if (snapshot.nextSteps) {
    bodySections += htmlSection(
      'prochain-point',
      'Prochain point',
      `<div style="${HTML_STYLES.card}"><strong>${escapeHtml(formatShortDateFr(snapshot.nextSteps))}</strong></div>`,
    );
  }

  const html = `
    <div style="${HTML_STYLES.body}">
      ${headerHtml}
      ${navHtml}
      ${metaHtml}
      <div style="padding:8px 16px 24px;background:${C.paper};border-radius:0 0 12px 12px;border:1px solid ${C.border};border-top:none;">
        ${bodySections}
        <div style="${HTML_STYLES.footer}">
          Document généré par Starium Orchestra · ${htmlLink(link(routes.review), 'Ouvrir le point dans Starium', `color:${C.gold600};font-size:12px;text-decoration:underline;font-weight:600;`)}
        </div>
      </div>
    </div>`;

  return { subject, title, text, html };
}

export function parseProjectReviewSnapshotPayload(
  payload: unknown,
): ProjectReviewSnapshotPayload | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }
  const row = payload as Record<string, unknown>;
  if (row.schemaVersion !== 2) return null;
  return payload as ProjectReviewSnapshotPayload;
}

export function resolveProjectReviewReportAppBaseUrl(): string | null {
  const fromEnv =
    process.env.APP_PUBLIC_URL?.trim() ||
    process.env.WEB_ORIGIN?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    null;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if ((process.env.NODE_ENV ?? 'development') !== 'production') {
    return 'http://localhost:3000';
  }
  // Docker dev (MailHog) : liens absolus même si NODE_ENV=production dans .env local.
  if (process.env.SMTP_HOST?.trim().toLowerCase() === 'mailhog') {
    return 'http://localhost:3000';
  }
  return null;
}
