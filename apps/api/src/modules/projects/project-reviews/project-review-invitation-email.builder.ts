/**
 * HTML convocation point projet — aligné mock « Envoyer les convocations »
 * (bandeau type · titre · quand · message · ODJ · PJ · RSVP).
 */
import { STARIUM_REPORT_COLORS as C } from './project-review-report-branding.helpers';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/'/g, '&#39;');
}

function nl2br(value: string): string {
  return escapeHtml(value).replace(/\r\n|\n|\r/g, '<br/>');
}

export type InvitationAgendaLine = {
  title: string;
  durationMinutes?: number | null;
};

export type InvitationBriefLine = {
  title: string;
  ownerLabel?: string | null;
  prepNote?: string | null;
};

export type InvitationAttachmentLine = {
  filename: string;
  hint?: string | null;
  url?: string | null;
};

export type BuildProjectReviewInvitationEmailInput = {
  kickLabel: string;
  meetingTitle: string;
  whenLine: string;
  message: string;
  agendaItems?: InvitationAgendaLine[];
  briefItems?: InvitationBriefLine[];
  attachments?: InvitationAttachmentLine[];
  includeRsvp?: boolean;
  actionUrl?: string | null;
  meetingJoinUrl?: string | null;
  footerNote?: string | null;
};

export function buildProjectReviewInvitationEmailHtml(
  input: BuildProjectReviewInvitationEmailInput,
): string {
  const kick = escapeHtml(input.kickLabel.trim() || 'Point projet · convocation');
  const title = escapeHtml(input.meetingTitle.trim() || 'Point projet');
  const when = escapeHtml(input.whenLine.trim());
  const body = nl2br(input.message.trim() || '');

  const agenda =
    input.agendaItems && input.agendaItems.length > 0
      ? `<div style="margin:20px 0 0;">
          <div style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${C.textMuted};margin:0 0 10px;">Ordre du jour</div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            ${input.agendaItems
              .map((item, i) => {
                const dur =
                  item.durationMinutes && item.durationMinutes > 0
                    ? `${item.durationMinutes} min`
                    : '';
                return `<tr>
                  <td style="padding:8px 0;border-bottom:1px solid ${C.border};width:28px;vertical-align:top;">
                    <span style="display:inline-block;width:22px;height:22px;border-radius:999px;background:${C.surfaceMuted};color:${C.ink};font-size:11px;font-weight:700;line-height:22px;text-align:center;">${i + 1}</span>
                  </td>
                  <td style="padding:8px 8px;border-bottom:1px solid ${C.border};font-size:14px;color:${C.text};font-weight:600;">${escapeHtml(item.title)}</td>
                  <td style="padding:8px 0;border-bottom:1px solid ${C.border};font-size:12px;color:${C.textMuted};text-align:right;white-space:nowrap;">${escapeHtml(dur)}</td>
                </tr>`;
              })
              .join('')}
          </table>
        </div>`
      : '';

  const brief =
    input.briefItems && input.briefItems.length > 0
      ? `<div style="margin:20px 0 0;">
          <div style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${C.textMuted};margin:0 0 10px;">Brief de préparation</div>
          ${input.briefItems
            .map((item) => {
              const owner = item.ownerLabel?.trim() || 'Porteur à définir';
              const prep =
                item.prepNote?.trim() ||
                'Préparer ce point avant la séance.';
              return `<div style="padding:10px 12px;margin:0 0 8px;border:1px solid ${C.border};border-radius:10px;background:${C.surfaceMuted};">
                  <div style="font-size:13px;font-weight:700;color:${C.text};">${escapeHtml(item.title)} <span style="font-weight:600;color:${C.textMuted};">· ${escapeHtml(owner)}</span></div>
                  <div style="margin-top:4px;font-size:12px;line-height:1.45;color:${C.textMuted};">${escapeHtml(prep)}</div>
                </div>`;
            })
            .join('')}
        </div>`
      : '';

  const attachments =
    input.attachments && input.attachments.length > 0
      ? `<div style="margin:20px 0 0;">
          <div style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${C.textMuted};margin:0 0 10px;">Pièces jointes (${input.attachments.length})</div>
          ${input.attachments
            .map((a) => {
              const label = escapeHtml(a.filename);
              const linked =
                a.url?.trim() && /^https?:\/\//i.test(a.url.trim())
                  ? `<a href="${escapeAttr(a.url.trim())}" style="color:${C.gold600};font-weight:700;text-decoration:none;">${label}</a>`
                  : `<strong>${label}</strong>`;
              return `<div style="padding:8px 12px;margin:0 0 6px;border:1px solid ${C.border};border-radius:10px;background:${C.surfaceMuted};font-size:13px;color:${C.text};">
                  ${linked}${
                    a.hint?.trim()
                      ? ` <span style="color:${C.textMuted};font-weight:400;">· ${escapeHtml(a.hint.trim())}</span>`
                      : ''
                  }
                </div>`;
            })
            .join('')}
        </div>`
      : '';

  const join =
    input.meetingJoinUrl?.trim()
      ? `<p style="margin:18px 0 0;text-align:center;">
          <a href="${escapeAttr(input.meetingJoinUrl.trim())}" style="display:inline-block;padding:11px 18px;background:${C.ink};color:${C.textOnDark};text-decoration:none;border-radius:999px;font-weight:700;font-size:13px;">Rejoindre la réunion</a>
        </p>`
      : '';

  const open =
    input.actionUrl?.trim()
      ? `<p style="margin:12px 0 0;text-align:center;">
          <a href="${escapeAttr(input.actionUrl.trim())}" style="display:inline-block;padding:11px 18px;background:${C.gold};color:${C.ink};text-decoration:none;border-radius:999px;font-weight:700;font-size:13px;border:1px solid ${C.gold600};">Ouvrir dans Starium</a>
        </p>`
      : '';

  const rsvp =
    input.includeRsvp && input.actionUrl?.trim()
      ? `<div style="margin:22px 0 0;text-align:center;">
          <a href="${escapeAttr(`${input.actionUrl.trim()}${input.actionUrl.includes('?') ? '&' : '?'}rsvp=accept`)}" style="display:inline-block;margin:0 6px 8px;padding:11px 16px;background:${C.successBg};color:${C.success};text-decoration:none;border-radius:999px;font-weight:700;font-size:13px;border:1px solid ${C.success};">Je serai présent</a>
          <a href="${escapeAttr(`${input.actionUrl.trim()}${input.actionUrl.includes('?') ? '&' : '?'}rsvp=decline`)}" style="display:inline-block;margin:0 6px 8px;padding:11px 16px;background:${C.dangerBg};color:${C.danger};text-decoration:none;border-radius:999px;font-weight:700;font-size:13px;border:1px solid ${C.danger};">Je décline</a>
        </div>`
      : '';

  const footer = escapeHtml(
    input.footerNote?.trim() ||
      'Envoyé depuis Starium Orchestra. Les réponses sont enregistrées dans la préparation de la séance.',
  );

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:${C.paper};color:${C.text};font-family:Manrope,system-ui,-apple-system,Segoe UI,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.paper};padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${C.surface};border:1px solid ${C.border};border-radius:16px;overflow:hidden;">
        <tr><td style="background:${C.headerBg};padding:22px 24px;color:${C.textOnDark};">
          <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${C.gold100};margin:0 0 8px;">${kick}</div>
          <div style="font-size:22px;line-height:1.25;font-weight:700;margin:0 0 10px;">${title}</div>
          ${when ? `<div style="font-size:13px;color:${C.headerTextSoft};">${when}</div>` : ''}
        </td></tr>
        <tr><td style="padding:22px 24px;">
          <p style="margin:0;font-size:14px;line-height:1.55;color:${C.text};">${body}</p>
          ${agenda}
          ${brief}
          ${attachments}
          ${join}
          ${open}
          ${rsvp}
        </td></tr>
        <tr><td style="padding:14px 24px 18px;border-top:1px solid ${C.border};font-size:11px;line-height:1.45;color:${C.textMuted};">
          ${footer}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function buildProjectReviewInvitationEmailText(input: {
  meetingTitle: string;
  whenLine: string;
  message: string;
  actionUrl?: string | null;
  meetingJoinUrl?: string | null;
  agendaItems?: InvitationAgendaLine[];
}): string {
  const lines = [
    input.meetingTitle.trim(),
    input.whenLine.trim(),
    '',
    input.message.trim(),
  ];
  if (input.agendaItems?.length) {
    lines.push('', 'Ordre du jour :');
    input.agendaItems.forEach((item, i) => {
      const dur =
        item.durationMinutes && item.durationMinutes > 0
          ? ` (${item.durationMinutes} min)`
          : '';
      lines.push(`${i + 1}. ${item.title}${dur}`);
    });
  }
  if (input.meetingJoinUrl?.trim()) {
    lines.push('', `Rejoindre la réunion : ${input.meetingJoinUrl.trim()}`);
  }
  if (input.actionUrl?.trim()) {
    lines.push('', `Ouvrir dans Starium : ${input.actionUrl.trim()}`);
  }
  return lines.filter((l, i, arr) => !(l === '' && arr[i - 1] === '')).join('\n');
}
