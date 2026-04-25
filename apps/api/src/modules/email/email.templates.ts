export type EmailTemplateKey = 'critical_alert' | 'generic_notification';

export type EmailTemplateInput = {
  title: string;
  message: string;
  actionUrl?: string | null;
};

export function renderTemplate(
  templateKey: EmailTemplateKey,
  input: EmailTemplateInput,
): { subject: string; text: string; html: string } {
  const prefix = templateKey === 'critical_alert' ? '[Alerte critique]' : '[Notification]';
  const subject = `${prefix} ${input.title}`;
  const actionLine = input.actionUrl ? `\nAction: ${input.actionUrl}` : '';
  const text = `${input.message}${actionLine}`;
  const htmlAction = input.actionUrl
    ? `<p><a href="${input.actionUrl}">Ouvrir dans Starium</a></p>`
    : '';
  const html = `<h3>${input.title}</h3><p>${input.message}</p>${htmlAction}`;
  return { subject, text, html };
}
