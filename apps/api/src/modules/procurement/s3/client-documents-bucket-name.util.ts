/**
 * Noms de buckets S3 (DNS) : 3–63 caractères, [a-z0-9.-], début/fin alphanumérique.
 * On reste en [a-z0-9-] pour éviter les ambiguïtés SSL avec les points.
 */
export function sanitizeS3BucketNameFragment(raw: string, maxLen: number): string {
  let s = raw.trim().toLowerCase().replace(/_/g, '-');
  try {
    s = s.normalize('NFD').replace(/\p{M}+/gu, '');
  } catch {
    /* ignore si runtime sans Unicode property escapes */
  }
  s = s.replace(/[^a-z0-9-]/g, '');
  s = s.replace(/-+/g, '-').replace(/^-+|-+$/g, '');
  if (!s) {
    return '';
  }
  s = s.slice(0, Math.max(1, maxLen)).replace(/-+$/g, '').replace(/^-+/g, '');
  return s || '';
}

function joinPrefixAndId(prefix: string, id: string): string {
  const p = prefix.replace(/-+$/g, '');
  const i = id.replace(/^-+/g, '');
  if (!p) {
    return i;
  }
  if (!i) {
    return p;
  }
  return `${p}-${i}`;
}

/**
 * Bucket dédié client : `{préfixe admin}-{slug|clientId}` (tronqué à 63 caractères, conforme S3).
 * Le préfixe admin vient de `PlatformProcurementS3Settings.clientDocumentsBucketPrefix`
 * (ex. `starium-dev_` → segment `starium-dev`).
 */
export function buildClientDocumentsBucketName(input: {
  prefix: string | null | undefined;
  clientId: string;
  slug: string;
}): string {
  let prefixPart = sanitizeS3BucketNameFragment(
    (input.prefix && input.prefix.trim()) || 'starium-docs',
    40,
  );
  if (!prefixPart) {
    prefixPart = 'starium-docs';
  }

  const slugTrim = input.slug?.trim();
  let idPart = slugTrim ? sanitizeS3BucketNameFragment(slugTrim, 40) : '';
  if (!idPart) {
    idPart = sanitizeS3BucketNameFragment(input.clientId, 40);
  }
  if (!idPart) {
    idPart = 'client';
  }

  let combined = joinPrefixAndId(prefixPart, idPart).replace(/-+/g, '-');
  if (combined.length > 63) {
    const maxId = Math.max(1, 63 - prefixPart.length - 1);
    const truncatedId = idPart.slice(0, maxId).replace(/-+$/g, '');
    combined = joinPrefixAndId(prefixPart, truncatedId).replace(/-+/g, '-').slice(0, 63);
  }
  combined = combined.replace(/-+$/g, '').replace(/^-+/g, '');
  if (combined.length < 3) {
    combined =
      sanitizeS3BucketNameFragment(`${prefixPart}x${input.clientId}`, 63) || 'doc';
  }
  return combined;
}
