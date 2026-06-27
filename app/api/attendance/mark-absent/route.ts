import { NextResponse } from 'next/server';
import { getAuthPayload } from '@/lib/auth';
import { createServerSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// POST /api/attendance/mark-absent
// Body: { date: string }
// Marks all active employees with no attendance record as ABSENT,
// unless they have an APPROVED leave covering that date (→ LEAVE).
export async function POST(request: Request) {
  const payload = await getAuthPayload(request);
  if (!payload || !['HR_MANAGER', 'SUPER_ADMIN', 'FINANCE'].includes(payload.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { date } = await request.json();
  if (!date) return NextResponse.json({ error: 'Date required' }, { status: 400 });

  const supabase = createServerSupabase();

  // All active employees
  const { data: employees } = await supabase
    .from('employees')
    .select('id')
    .eq('status', 'ACTIVE');

  if (!employees?.length) return NextResponse.json({ marked: 0 });

  // Employees who already have a record for this date
  const { data: existing } = await supabase
    .from('attendance')
    .select('employee_id')
    .eq('date', date);

  const presentIds = new Set((existing || []).map((r: { employee_id: string }) => r.employee_id));
  const missing = employees.filter(e => !presentIds.has(e.id));

  if (!missing.length) {
    return NextResponse.json({ marked: 0, absent: 0, onLeave: 0 });
  }

  const missingIds = missing.map(e => e.id);

  // Employees with approved leave covering this date
  const { data: leaves } = await supabase
    .from('leave_requests')
    .select('employee_id')
    .in('employee_id', missingIds)
    .eq('status', 'APPROVED')
    .lte('start_date', date)
    .gte('end_date', date);

  const onLeaveIds = new Set((leaves || []).map((l: { employee_id: string }) => l.employee_id));

  const records = missingIds.map(empId => ({
    employee_id: empId,
    date,
    check_in: null,
    check_out: null,
    work_hours: null,
    night_allowance: 0,
    status: onLeaveIds.has(empId) ? 'LEAVE' : 'ABSENT',
    source: 'auto',
    notes: onLeaveIds.has(empId) ? 'إجازة معتمدة' : null,
  }));

  const { error } = await supabase
    .from('attendance')
    .upsert(records, { onConflict: 'employee_id,date' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const absentCount = records.filter(r => r.status === 'ABSENT').length;
  const leaveCount = records.filter(r => r.status === 'LEAVE').length;

  return NextResponse.json({ marked: records.length, absent: absentCount, onLeave: leaveCount });
}
