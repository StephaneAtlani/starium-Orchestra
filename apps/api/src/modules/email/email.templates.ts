export type EmailTemplateKey =
  | 'critical_alert'
  | 'generic_notification'
  | 'email_identity_verify'
  | 'project_review_invitation';

export type EmailTemplateInput = {
  title: string;
  message: string;
  actionUrl?: string | null;
  /** Lien Teams — autorisé en email uniquement, jamais in-app metadata. */
  meetingJoinUrl?: string | null;
};

export function renderTemplate(
  templateKey: EmailTemplateKey,
  input: EmailTemplateInput,
): { subject: string; text: string; html: string } {
  const prefix =
    templateKey === 'critical_alert'
      ? '[Alerte critique]'
      : templateKey === 'email_identity_verify'
        ? '[Vérification e-mail]'
        : templateKey === 'project_review_invitation'
          ? '[Point projet]'
          : '[Notification]';
  const subject =
    templateKey === 'project_review_invitation'
      ? input.title
      : `${prefix} ${input.title}`;
  const actionLine = input.actionUrl ? `\nAction: ${input.actionUrl}` : '';
  const joinLine = input.meetingJoinUrl
    ? `\nRejoindre la réunion: ${input.meetingJoinUrl}`
    : '';
  const text = `${input.message}${joinLine}${actionLine}`;
  const htmlJoin = input.meetingJoinUrl
    ? `<p><a href="${input.meetingJoinUrl}">Rejoindre la réunion</a></p>`
    : '';
  const htmlAction = input.actionUrl
    ? `<p><a href="${input.actionUrl}">Ouvrir dans Starium</a></p>`
    : '';
  const html = `<h3>${input.title}</h3><p>${input.message}</p>${htmlJoin}${htmlAction}`;
  return { subject, text, html };
}
