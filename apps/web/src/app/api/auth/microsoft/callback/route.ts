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

async function proxyToApi(
  request: NextRequest,
  init: {
    method: 'GET' | 'POST';
    body?: string;
    contentType?: string | null;
  },
): Promise<NextResponse> {
  const target = `${internalApiBase()}/api/auth/microsoft/callback${
    init.method === 'GET' ? request.nextUrl.search : ''
  }`;

  let upstream: Response;
  try {
    const ctrl = new AbortController();
    const kill = setTimeout(() => ctrl.abort(), 120_000);
    const headers: Record<string, string> = {
      'x-forwarded-for': request.headers.get('x-forwarded-for') ?? '',
      'x-forwarded-proto': request.headers.get('x-forwarded-proto') ?? 'http',
      'x-request-id': request.headers.get('x-request-id') ?? '',
    };
    if (init.contentType) {
      headers['content-type'] = init.contentType;
    }
    upstream = await fetch(target, {
      method: init.method,
      redirect: 'manual',
      signal: ctrl.signal,
      headers,
      body: init.body,
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

/**
 * Legacy `response_mode=query` : Microsoft redirige en GET avec `?code=…`.
 * Chrome Safe Browsing flague souvent cette URL (code MSA type `M.…` en query).
 * Flux nominal = POST form_post (voir ci-dessous).
 */
export async function GET(request: NextRequest) {
  return proxyToApi(request, { method: 'GET' });
}

/**
 * `response_mode=form_post` : Microsoft POSTe `code`/`state` en
 * `application/x-www-form-urlencoded`. Barre d’adresse = `/callback` sans secret.
 * On proxifie vers Nest et on renvoie la **302** finale (`/login?handoff=…`).
 */
export async function POST(request: NextRequest) {
  const contentType =
    request.headers.get('content-type') ??
    'application/x-www-form-urlencoded';
  const body = await request.text();
  return proxyToApi(request, { method: 'POST', body, contentType });
}
