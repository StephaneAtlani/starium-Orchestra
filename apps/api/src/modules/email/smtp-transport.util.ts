import type SMTPTransport from 'nodemailer/lib/smtp-transport';

function smtpAddressList(xs: readonly unknown[] | undefined): string {
  return (xs ?? [])
    .map((x) => {
      if (typeof x === 'string') return x;
      if (
        x &&
        typeof x === 'object' &&
        'address' in x &&
        typeof (x as { address: unknown }).address === 'string'
      ) {
        return (x as { address: string }).address;
      }
      return '';
    })
    .filter(Boolean)
    .join(',');
}

/**
 * Une ligne de log exploitable (réponse serveur Brevo / SMTP, destinataires acceptés/refusés).
 * Accepte le retour Nodemailer (`accepted` peut être `string | Address`).
 */
export function formatSmtpSendResultLogLine(
  context: string,
  info: {
    messageId?: string;
    response?: string;
    accepted?: readonly unknown[];
    rejected?: readonly unknown[];
    pending?: readonly unknown[];
  },
): string {
  const response = (info.response ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);
  const accepted = smtpAddressList(info.accepted);
  const rejected = smtpAddressList(info.rejected);
  const pending = smtpAddressList(info.pending);
  const parts = [
    `messageId=${info.messageId ?? ''}`,
    response ? `response=${response}` : '',
    accepted ? `accepted=${accepted}` : '',
    rejected ? `rejected=${rejected}` : '',
    pending ? `pending=${pending}` : '',
  ].filter(Boolean);
  return `[SMTP] ${context} | ${parts.join(' | ')}`;
}

/** Mot de passe SMTP : uniquement `SMTP_PASS` (ex. clé Brevo `xsmtpsib-…`). */
export function resolveSmtpPasswordEnv(): string {
  return process.env.SMTP_PASS?.trim() ?? '';
}

/**
 * Options Nodemailer pour relais SMTP (Brevo, MailHog, etc.).
 * Brevo / ex-Sendinblue sur 587 : STARTTLS explicite évite des échecs de connexion selon stacks TLS.
 */
export function buildSmtpTransportOptions(): SMTPTransport.Options {
  const host = process.env.SMTP_HOST ?? '';
  const port = Number(process.env.SMTP_PORT ?? '587');
  const secure = process.env.SMTP_SECURE === 'true';
  const hostLower = host.toLowerCase();
  const user = process.env.SMTP_USER?.trim() ?? '';
  const pass = resolveSmtpPasswordEnv();

  const requireTlsExplicit = process.env.SMTP_REQUIRE_TLS?.trim().toLowerCase();
  const requireTls =
    requireTlsExplicit === 'true' ||
    (requireTlsExplicit !== 'false' &&
      !secure &&
      (port === 587 || port === 2525) &&
      (hostLower.includes('brevo.com') ||
        hostLower.includes('sendinblue.com')));

  return {
    host,
    port,
    secure,
    ...(user || pass ? { auth: { user, pass } } : {}),
    ...(requireTls ? { requireTLS: true } : {}),
    connectionTimeout: Number(process.env.SMTP_TIMEOUT_MS ?? '10000'),
  };
}
