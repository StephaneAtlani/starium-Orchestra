import type SMTPTransport from 'nodemailer/lib/smtp-transport';

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
  const pass = (
    process.env.SMTP_PASSWORD ??
    process.env.SMTP_PASS ??
    ''
  ).trim();

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
