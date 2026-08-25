#!/usr/bin/env node
/**
 * Smoke-test MFA decrypt dans un conteneur API (prod / préprod).
 *
 * Usage :
 *   node scripts/mfa-decrypt-smoke.cjs admin@starium.fr
 *
 * Lit JWT_SECRET + MFA_ENCRYPTION_KEY depuis process.env (comme Nest),
 * charge totpSecretEncrypted en base, tente MFA hex puis JWT-scrypt.
 */
const { createRequire } = require('node:module');
const {
  createDecipheriv,
  createHash,
  scryptSync,
} = require('node:crypto');

const email = process.argv[2];
if (!email) {
  console.error('Usage: node scripts/mfa-decrypt-smoke.cjs <email>');
  process.exit(2);
}

const SALT = 'starium-mfa-v1';
const KEY_LENGTH = 32;
const VERSION_PREFIX_RE = /^v(\d+):(.+)$/;

function md5(s) {
  return createHash('md5').update(s, 'utf8').digest('hex');
}

function deriveKey(raw) {
  return /^[0-9a-fA-F]{64}$/.test(raw)
    ? Buffer.from(raw, 'hex')
    : scryptSync(raw, SALT, KEY_LENGTH);
}

function decryptWithKey(key, payload) {
  const vMatch = payload.match(VERSION_PREFIX_RE);
  const rest = vMatch ? vMatch[2] : payload;
  const parts = rest.split(':');
  if (parts.length < 3) throw new Error(`Invalid payload parts=${parts.length}`);
  const ivHex = parts[0];
  const tagHex = parts[1];
  const dataHex = parts.slice(2).join(':');
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const data = Buffer.from(dataHex, 'hex');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    'utf8',
  );
}

function tryKey(label, raw, payload) {
  if (!raw) {
    console.log(`[${label}] SKIP (empty)`);
    return false;
  }
  try {
    const plain = decryptWithKey(deriveKey(raw), payload);
    console.log(
      `[${label}] OK secretLen=${plain.length} secretHead=${plain.slice(0, 4)}…`,
    );
    return true;
  } catch (err) {
    console.log(
      `[${label}] FAIL ${err instanceof Error ? err.message : String(err)}`,
    );
    return false;
  }
}

(async () => {
  const jwt = (process.env.JWT_SECRET || '').trim();
  const mfa = (process.env.MFA_ENCRYPTION_KEY || '').trim();
  const mfaV1 = (process.env.MFA_ENCRYPTION_KEY_V1 || '').trim();
  const auth = (process.env.AUTH_JWT_SECRET || '').trim();
  const nest = (process.env.NEST_JWT_SECRET || '').trim();

  console.log('--- env fingerprints (process.env) ---');
  console.log(`JWT_len=${jwt.length} JWT_md5=${jwt ? md5(jwt) : '∅'}`);
  console.log(`MFA_len=${mfa.length} MFA_md5=${mfa ? md5(mfa) : '∅'}`);
  console.log(`MFA_V1_len=${mfaV1.length} MFA_is_hex64=${/^[0-9a-fA-F]{64}$/.test(mfa)}`);
  console.log(`AUTH_JWT=${auth ? 'SET' : '∅'} NEST_JWT=${nest ? 'SET' : '∅'}`);
  console.log(`MFA_KEY_VERSION=${process.env.MFA_KEY_VERSION || '∅'}`);
  console.log(
    `DATABASE_URL host=${(process.env.DATABASE_URL || '').replace(/:[^:@/]+@/, ':***@')}`,
  );

  const requireFromApi = createRequire('/app/apps/api/package.json');
  const { PrismaClient } = requireFromApi('@prisma/client');
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT u.email, m."keyVersion", m."totpSecretEncrypted",
              md5(m."totpSecretEncrypted") AS enc_md5,
              length(m."totpSecretEncrypted") AS enc_len
       FROM "UserMfa" m
       JOIN "User" u ON u.id = m."userId"
       WHERE lower(u.email) = lower($1)`,
      email,
    );
    if (!rows.length) {
      console.error(`No UserMfa for ${email}`);
      process.exit(1);
    }
    const row = rows[0];
    const payload = row.totpSecretEncrypted;
    if (!payload) {
      console.error('totpSecretEncrypted is null');
      process.exit(1);
    }
    console.log('--- db row ---');
    console.log(
      `email=${row.email} keyVersion=${row.keyVersion} enc_md5=${row.enc_md5} enc_len=${row.enc_len} head=${String(payload).slice(0, 24)}`,
    );
    console.log('--- decrypt attempts ---');
    const okMfa = tryKey('MFA_ENCRYPTION_KEY', mfa, payload);
    const okV1 = tryKey('MFA_ENCRYPTION_KEY_V1', mfaV1, payload);
    const okJwt = tryKey('JWT_SECRET', jwt, payload);
    const okAuth = tryKey('AUTH_JWT_SECRET', auth, payload);
    if (!okMfa && !okV1 && !okJwt && !okAuth) {
      console.error('ALL DECRYPT ATTEMPTS FAILED');
      process.exit(1);
    }
    console.log('At least one key works — Nest should be able to decrypt.');
  } finally {
    await prisma.$disconnect();
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
