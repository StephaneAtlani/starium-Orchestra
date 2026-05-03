/**
 * Vérifie la config SMTP comme l’API (Brevo, MailHog, etc.) : `transporter.verify()` puis optionnellement un envoi test.
 *
 * Usage (racine monorepo ou `apps/api`) :
 *   pnpm --filter @starium-orchestra/api verify:smtp -- --strict
 *
 * Les fichiers `.env`, `../.env`, `../../.env` (premiers trouvés) sont chargés si la variable n’existe pas déjà dans l’environnement.
 *
 * Options :
 *   --strict          Même garde-fous auth que la prod Brevo/Gmail/365 (SMTP_USER + SMTP_PASS + SMTP_FROM).
 *   --send=email@x.y  Après verify(), envoie un e-mail minimal (attention quota / spam).
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import nodemailer from 'nodemailer';
import {
  buildSmtpTransportOptions,
  formatSmtpSendResultLogLine,
  resolveSmtpPasswordEnv,
} from '../src/modules/email/smtp-transport.util';

function parseSendTo(): string | null {
  const arg = process.argv.find((a) => a.startsWith('--send='));
  if (!arg) return null;
  const v = arg.slice('--send='.length).trim();
  return v || null;
}

/** Charge `.env` sans dépendre du package `dotenv` (ne remplace pas une var déjà exportée). */
function loadDotEnvFiles(): void {
  for (const rel of ['.env', '../.env', '../../.env']) {
    const p = resolve(process.cwd(), rel);
    if (!existsSync(p)) continue;
    const raw = readFileSync(p, 'utf8');
    for (const line of raw.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq <= 0) continue;
      const key = t.slice(0, eq).trim();
      if (!key || process.env[key] !== undefined) continue;
      let val = t.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

async function main(): Promise<void> {
  loadDotEnvFiles();

  const host = process.env.SMTP_HOST?.trim() ?? '';
  if (!host) {
    console.error(
      '[verify-smtp] SMTP_HOST absent. Exporte les variables ou utilise node --env-file=…',
    );
    process.exit(1);
  }

  const strict =
    process.argv.includes('--strict') ||
    process.env.VERIFY_SMTP_STRICT === '1' ||
    process.env.NODE_ENV === 'production';

  if (strict) {
    const from = process.env.SMTP_FROM?.trim() ?? '';
    if (!from) {
      console.error('[verify-smtp] SMTP_FROM requis (mode strict).');
      process.exit(1);
    }
    const user = process.env.SMTP_USER?.trim() ?? '';
    const pass = resolveSmtpPasswordEnv();
    const h = host.toLowerCase();
    const authMandatory =
      h.includes('brevo.com') ||
      h.includes('sendinblue.com') ||
      h.includes('smtp.gmail.com') ||
      h.includes('smtp.office365.com');
    if (authMandatory && (!user || !pass)) {
      console.error(
        '[verify-smtp] Fournisseur SMTP exige SMTP_USER + SMTP_PASS non vides (mode strict).',
      );
      process.exit(1);
    }
  }

  const opts = buildSmtpTransportOptions();
  const transport = nodemailer.createTransport(opts);

  await transport.verify();
  const hasAuth = Boolean(opts.auth);
  console.log(
    `[verify-smtp] verify() OK — host=${opts.host} port=${opts.port} secure=${opts.secure} auth=${hasAuth}`,
  );

  const sendTo = parseSendTo();
  if (sendTo) {
    const from = process.env.SMTP_FROM?.trim();
    if (!from) {
      console.error('[verify-smtp] SMTP_FROM requis pour --send=');
      process.exit(1);
    }
    const sent = await transport.sendMail({
      from,
      to: sendTo,
      subject: 'Starium Orchestra — probe SMTP',
      text: 'Si tu lis ce message, la chaîne SMTP jusqu’au fournisseur fonctionne.',
    });
    console.log(formatSmtpSendResultLogLine(`verify-smtp probe to=${sendTo}`, sent));
  }
}

void main().catch((e: unknown) => {
  const msg = e instanceof Error ? e.message : String(e ?? e);
  console.error(`[verify-smtp] échec: ${msg}`);
  if (e instanceof Error && e.stack) console.error(e.stack);
  process.exit(1);
});
