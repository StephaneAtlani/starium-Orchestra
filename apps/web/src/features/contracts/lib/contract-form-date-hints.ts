/** Aperçus de dates pour le formulaire contrat (indicatif, même logique que GLPI : flèches sous les durées). */

function parseDateInputUtcNoon(s: string): Date | null {
  const t = s.trim();
  if (!t) return null;
  const d = new Date(`${t}T12:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatFr(d: Date): string {
  return d.toLocaleDateString('fr-FR');
}

function addCalendarMonthsUtc(date: Date, months: number): Date {
  const r = new Date(date.getTime());
  const day = r.getUTCDate();
  r.setUTCMonth(r.getUTCMonth() + months);
  if (r.getUTCDate() < day) {
    r.setUTCDate(0);
  }
  return r;
}

/** Fin théorique = début d'effet + durée initiale (mois), si les deux sont renseignés. */
export function previewTermEndLabel(effectiveStart: string, renewalTermMonthsStr: string): string | null {
  const months = Number(renewalTermMonthsStr);
  if (!Number.isFinite(months) || months < 1) return null;
  const start = parseDateInputUtcNoon(effectiveStart);
  if (!start) return null;
  return `→ ${formatFr(addCalendarMonthsUtc(start, months))}`;
}

/** Date limite pour notifier en préavis = fin d'effet − N jours. */
export function previewNoticeDeadlineLabel(effectiveEnd: string, noticeDaysStr: string): string | null {
  const days = Number(noticeDaysStr);
  if (!Number.isFinite(days) || days < 1) return null;
  const end = parseDateInputUtcNoon(effectiveEnd);
  if (!end) return null;
  const limit = new Date(end.getTime() - days * 86_400_000);
  return `→ ${formatFr(limit)}`;
}
