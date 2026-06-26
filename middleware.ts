import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || '7f3a9b2e1c4d8f6a0e5b7c9d2f1a4e8b3c6d9f2'
);

const PUBLIC = ['/login', '/api/auth/login', '/api/setup', '/api/attendance/fingerprint'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC.some(p => pathname.startsWith(p))) return NextResponse.next();

  const token = request.cookies.get('hr_token')?.value;

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const { payload } = await jwtVerify(token, secret);
    const role = payload.role as string;

    if (pathname === '/') {
      return NextResponse.redirect(
        new URL(role === 'EMPLOYEE' ? '/employee' : '/admin', request.url)
      );
    }

    if (pathname.startsWith('/admin') && role === 'EMPLOYEE') {
      return NextResponse.redirect(new URL('/employee', request.url));
    }

    if (pathname.startsWith('/employee') && role !== 'EMPLOYEE') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }

    return NextResponse.next();
  } catch {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    const res = NextResponse.redirect(new URL('/login', request.url));
    res.cookies.delete('hr_token');
    return res;
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
