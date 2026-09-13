/**
 * Invitation calendrier (.ics) jointe au mail — METHOD:REQUEST.
 * Pas de création d’événement Graph Microsoft.
 */

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Format UTC `YYYYMMDDTHHMMSSZ` pour VEVENT. */
export function formatIcsUtc(date: Date): string {
  return (
    `${date.getUTCFullYear()}${pad2(date.getUTCMonth() + 1)}${pad2(date.getUTCDate())}` +
    `T${pad2(date.getUTCHours())}${pad2(date.getUTCMinutes())}${pad2(date.getUTCSeconds())}Z`
  );
}

export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\n|\r/g, '\\n');
}

export type BuildProjectReviewIcsInput = {
  reviewId: string;
  uidDomain?: string;
  summary: string;
  description?: string | null;
  location?: string | null;
  meetingUrl?: string | null;
  startsAt: Date;
  durationMinutes: number | null;
  organizerEmail?: string | null;
  organizerName?: string | null;
};

export function buildProjectReviewInvitationIcs(
  input: BuildProjectReviewIcsInput,
): string {
  const duration =
    input.durationMinutes && input.durationMinutes > 0
      ? input.durationMinutes
      : 60;
  const endsAt = new Date(input.startsAt.getTime() + duration * 60_000);
  const domain = (input.uidDomain ?? 'starium.orchestra').replace(/[^\w.-]/g, '');
  const uid = `${input.reviewId}@${domain}`;
  const now = formatIcsUtc(new Date());
  const dtStart = formatIcsUtc(input.startsAt);
  const dtEnd = formatIcsUtc(endsAt);

  const descParts = [
    input.description?.trim() || null,
    input.meetingUrl?.trim()
      ? `Visio : ${input.meetingUrl.trim()}`
      : null,
  ].filter(Boolean);

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Starium Orchestra//Point projet//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcsText(input.summary)}`,
  ];

  if (descParts.length) {
    lines.push(`DESCRIPTION:${escapeIcsText(descParts.join('\n'))}`);
  }
  if (input.location?.trim()) {
    lines.push(`LOCATION:${escapeIcsText(input.location.trim())}`);
  }
  if (input.meetingUrl?.trim()) {
    lines.push(`URL:${escapeIcsText(input.meetingUrl.trim())}`);
  }
  if (input.organizerEmail?.trim()) {
    const cn = input.organizerName?.trim()
      ? `;CN=${escapeIcsText(input.organizerName.trim())}`
      : '';
    lines.push(
      `ORGANIZER${cn}:mailto:${input.organizerEmail.trim().toLowerCase()}`,
    );
  }
  lines.push('STATUS:CONFIRMED', 'SEQUENCE:0', 'END:VEVENT', 'END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
}

export function icsAttachmentFilename(reviewTypeLabel: string): string {
  const slug = reviewTypeLabel
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return `invitation-${slug || 'point'}.ics`;
}

/** Durée ICS : durée revue, sinon somme ODJ, sinon 60 min. */
export function resolveInvitationDurationMinutes(input: {
  durationMinutes?: number | null;
  agendaItems?: { plannedDurationMinutes: number | null }[];
}): number {
  if (input.durationMinutes && input.durationMinutes > 0) {
    return input.durationMinutes;
  }
  if (input.agendaItems?.length) {
    const sum = input.agendaItems.reduce(
      (acc, item) => acc + (item.plannedDurationMinutes ?? 0),
      0,
    );
    if (sum > 0) return sum;
  }
  return 60;
}
