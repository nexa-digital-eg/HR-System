import { NextResponse } from 'next/server';
import { getAuthPayload } from '@/lib/auth';
import { createServerSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const payload = await getAuthPayload(request);
  if (!payload || !payload.employee_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerSupabase();

  const { data: reports } = await supabase
    .from('employees')
    .select('id')
    .eq('manager_id', payload.employee_id);

  if (!reports || reports.length === 0) {
    return NextResponse.json({ leaves: [], advances: [] });
  }

  const reportIds = reports.map((r: { id: string }) => r.id);

  const [leavesResult, advancesResult] = await Promise.all([
    supabase
      .from('leave_requests')
      .select('*, employees!employee_id(name_ar,name_en,employee_number), leave_types(name_ar,name_en)')
      .in('employee_id', reportIds)
      .in('status', ['PENDING', 'MANAGER_APPROVED'])
      .order('created_at', { ascending: false }),
    supabase
      .from('advances')
      .select('*, employees!employee_id(name_ar,name_en,employee_number)')
      .in('employee_id', reportIds)
      .in('status', ['PENDING', 'MANAGER_APPROVED'])
      .order('created_at', { ascending: false }),
  ]);

  return NextResponse.json({
    leaves: leavesResult.data || [],
    advances: advancesResult.data || [],
  });
}
