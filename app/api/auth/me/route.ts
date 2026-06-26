import { NextResponse } from 'next/server';
import { getAuthPayload } from '@/lib/auth';

export async function GET(request: Request) {
  const payload = await getAuthPayload(request);
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(payload);
}
