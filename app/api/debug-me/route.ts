import { NextResponse } from 'next/server';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

export async function GET(request: Request) {
  const token = getTokenFromRequest(request);
  if (!token) return NextResponse.json({ error: 'no cookie', token: null });
  const payload = await verifyToken(token);
  return NextResponse.json({ token_first50: token.substring(0, 50), payload });
}
