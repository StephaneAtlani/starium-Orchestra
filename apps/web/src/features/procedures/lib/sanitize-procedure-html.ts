/** Miroir FE de la allowlist API (sanitize avant affichage / avant PATCH). */
const ALLOWED = new Set([
  'b',
  'strong',
  'i',
  'em',
  'u',
  's',
  'a',
  'mark',
  'br',
  'li',
]);

export function sanitizeProcedureHtml(html: string): string {
  let out = html;
  out = out.replace(/<!--[\s\S]*?-->/g, '');
  out = out.replace(
    /<(script|style|iframe|object|embed)[^>]*>[\s\S]*?<\/\1>/gi,
    '',
  );
  out = out.replace(/<\/?(script|style|iframe|object|embed)[^>]*>/gi, '');
  out = out.replace(/<br\s*\/?>/gi, '<br>');
  out = out.replace(/<\/?([a-z0-9]+)(\s[^>]*)?>/gi, (full, tag: string) => {
    const t = tag.toLowerCase();
    if (!ALLOWED.has(t)) return '';
    if (t === 'br') return '<br>';
    if (full.startsWith('</')) return `</${t}>`;
    if (t === 'a') {
      const hrefMatch = full.match(
        /\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i,
      );
      const href = hrefMatch
        ? (hrefMatch[2] ?? hrefMatch[3] ?? hrefMatch[4] ?? '').trim()
        : '';
      if (!/^https:\/\//i.test(href)) return '';
      return `<a href="${href.replace(/"/g, '&quot;')}">`;
    }
    return `<${t}>`;
  });
  return out;
}
