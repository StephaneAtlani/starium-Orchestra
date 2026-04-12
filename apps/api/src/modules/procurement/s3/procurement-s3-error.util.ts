/**
 * Le SDK AWS v3 renvoie souvent name: "UnknownError" avec un message peu utile ;
 * les détails sont dans $metadata, Code, ou la chaîne error.cause (réseau, TLS, etc.).
 */
export function formatAwsSdkErrorDetail(e: unknown, maxLen = 420): string {
  if (e == null) {
    return '';
  }
  if (typeof e !== 'object') {
    return String(e).slice(0, maxLen);
  }

  const parts: string[] = [];
  const seen = new Set<string>();
  const push = (s: string | undefined | null) => {
    const t = s?.trim();
    if (!t || seen.has(t)) return;
    seen.add(t);
    parts.push(t);
  };

  const x = e as Record<string, unknown>;
  const name = typeof x.name === 'string' ? x.name : '';
  const message = typeof x.message === 'string' ? x.message : '';
  push(name);
  if (message && message !== name) {
    push(message);
  }

  const meta = x.$metadata as
    | { httpStatusCode?: number; requestId?: string; extendedRequestId?: string }
    | undefined;
  if (meta?.httpStatusCode != null) {
    push(`HTTP ${meta.httpStatusCode}`);
  }
  if (meta?.requestId) {
    push(`RequestId ${meta.requestId}`);
  }
  if (meta?.extendedRequestId) {
    push(`ExtRequestId ${meta.extendedRequestId}`);
  }

  const code = x.Code ?? x.code;
  if (typeof code === 'string') {
    push(code);
  }

  const errXml = x.Error as Record<string, unknown> | undefined;
  if (errXml) {
    if (typeof errXml.Code === 'string') push(errXml.Code);
    if (typeof errXml.Message === 'string') push(errXml.Message);
  }

  // Chaîne Error.cause (fetch, TLS, DNS…)
  let depth = 0;
  let cur: unknown = (x as { cause?: unknown }).cause;
  while (cur != null && depth < 6) {
    depth += 1;
    if (cur instanceof Error) {
      push(cur.name && cur.name !== 'Error' ? `${cur.name}: ${cur.message}` : cur.message);
      cur = cur.cause;
    } else if (typeof cur === 'object' && cur !== null && 'message' in cur) {
      push(String((cur as { message: unknown }).message));
      cur = (cur as { cause?: unknown }).cause;
    } else {
      push(String(cur));
      break;
    }
  }

  const hasAwsMetadata = parts.some(
    (p) =>
      p.startsWith('HTTP ') ||
      p.startsWith('RequestId ') ||
      p.startsWith('ExtRequestId '),
  );
  const cleaned = hasAwsMetadata
    ? parts.filter((p) => p !== 'Unknown' && p !== 'UnknownError')
    : parts;

  let out = cleaned.join(' — ');
  const onlyUnknown =
    cleaned.length === 1 &&
    (cleaned[0] === 'UnknownError' || cleaned[0] === 'Error');
  if (!out || onlyUnknown) {
    out =
      'UnknownError (cause peu exposée par le SDK ; vérifier les logs serveur, IAM s3:HeadBucket sur le bucket, région alignée avec le bucket, et connectivité HTTPS depuis l’API)';
  }

  return out.slice(0, maxLen);
}
