import { NextRequest, NextResponse } from 'next/server';

/**
 * URL atteignable **depuis le serveur Next** (fetch interne) : conteneur `api-dev` ou localhost.
 */
function internalApiBase(): string {
  const raw =
    process.env.INTERNAL_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    'http://localhost:3001';
  return raw.replace(/\/$/, '');
}

/**
 * Le rewrite `/api/*` → Nest peut casser sur une query OAuth énorme (`code`).
 * Une 307 vers l’API duplique l’URL dans `Location` (souvent trop long → « invalid response »).
 * On **proxifie** vers l’API et on renvoie au navigateur la **302** finale (URL courte vers /login).
 */
export async function GET(request: NextRequest) {
  const target = `${internalApiBase()}/api/auth/microsoft/callback${request.nextUrl.search}`;

  let upstream: Response;
  try {
    const ctrl = new AbortController();
    const kill = setTimeout(() => ctrl.abort(), 120_000);
    upstream = await fetch(target, {
      method: 'GET',
      redirect: 'manual',
      signal: ctrl.signal,
      headers: {
        'x-forwarded-for': request.headers.get('x-forwarded-for') ?? '',
        'x-forwarded-proto': request.headers.get('x-forwarded-proto') ?? 'http',
        'x-request-id': request.headers.get('x-request-id') ?? '',
      },
    });
    clearTimeout(kill);
  } catch {
    return new NextResponse('Service API indisponible (callback Microsoft).', {
      status: 502,
    });
  }

  const loc = upstream.headers.get('Location');
  if (loc && upstream.status >= 300 && upstream.status < 400) {
    const res = NextResponse.redirect(loc, upstream.status);
    const cookies = upstream.headers.getSetCookie?.() ?? [];
    for (const c of cookies) {
      res.headers.append('set-cookie', c);
    }
    return res;
  }

  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      'content-type':
        upstream.headers.get('content-type') ?? 'text/plain; charset=utf-8',
    },
  });
}
