import { NextResponse } from 'next/server';
import { getAuthPayload } from '@/lib/auth';
import { createServerSupabase } from '@/lib/supabase';

export async function GET(request: Request) {
  const payload = await getAuthPayload(request);
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get('employee_id') || payload.employee_id;
  const year = searchParams.get('year') || new Date().getFullYear().toString();

  if (!employeeId) return NextResponse.json({ data: [] });

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('leave_balances')
    .select('*, leave_types(name_ar, name_en)')
    .eq('employee_id', employeeId)
    .eq('year', parseInt(year));

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data || [] });
}
