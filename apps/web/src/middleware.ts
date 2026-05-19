import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isServerActionProbe, NEXT_ACTION_HEADER } from '@/lib/reject-server-action-probe';

export function middleware(request: NextRequest) {
  if (isServerActionProbe(request.method, request.headers.get(NEXT_ACTION_HEADER))) {
    return new NextResponse(null, { status: 400 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
