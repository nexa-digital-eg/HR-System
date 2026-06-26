import { NextResponse } from 'next/server';
import { getAuthPayload } from '@/lib/auth';
import { createServerSupabase } from '@/lib/supabase';

const LATE_HOUR = 8;
const LATE_MINUTE = 15;
const BATCH_SIZE = 500;

export const maxDuration = 60;

export async function POST(request: Request) {
  const payload = await getAuthPayload(request);
  if (!payload || payload.role === 'EMPLOYEE') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  const text = await file.text();
  const lines = text.split(/\r?\n/).filter(l => l.trim());

  // Parse: empNum -> date -> sorted timestamps
  const punches = new Map<string, Map<string, Date[]>>();

  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 3) continue;
    const empNum = parts[0].trim();
    const dt = new Date(`${parts[1]}T${parts[2]}`);
    if (isNaN(dt.getTime())) continue;
    const dateKey = parts[1];
    if (!punches.has(empNum)) punches.set(empNum, new Map());
    const dayMap = punches.get(empNum)!;
    if (!dayMap.has(dateKey)) dayMap.set(dateKey, []);
    dayMap.get(dateKey)!.push(dt);
  }

  const supabase = createServerSupabase();

  // Load all employees once
  const { data: employees } = await supabase
    .from('employees')
    .select('id, employee_number')
    .eq('status', 'ACTIVE');

  const empMap = new Map<string, string>(
    (employees || []).map(e => [e.employee_number.trim(), e.id])
  );

  const records: object[] = [];
  const unmatchedSet = new Set<string>();

  for (const [empNum, dayMap] of punches) {
    const employeeId = empMap.get(empNum);
    if (!employeeId) { unmatchedSet.add(empNum); continue; }

    for (const [dateKey, times] of dayMap) {
      times.sort((a, b) => a.getTime() - b.getTime());
      const first = times[0];
      const last = times[times.length - 1];
      const checkOut = times.length > 1 ? last.toISOString() : null;
      const workHours = checkOut
        ? Math.round(((last.getTime() - first.getTime()) / 3600000) * 100) / 100
        : null;
      const h = first.getHours(), m = first.getMinutes();
      const status = (h > LATE_HOUR || (h === LATE_HOUR && m > LATE_MINUTE)) ? 'LATE' : 'PRESENT';

      records.push({
        employee_id: employeeId,
        date: dateKey,
        check_in: first.toISOString(),
        check_out: checkOut,
        work_hours: workHours,
        status,
        source: 'fingerprint',
      });
    }
  }

  // Bulk upsert in batches
  let created = 0;
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('attendance')
      .upsert(batch as Parameters<ReturnType<typeof supabase.from>['upsert']>[0], { onConflict: 'employee_id,date' });
    if (!error) created += batch.length;
  }

  return NextResponse.json({
    success: true,
    created,
    unmatched: unmatchedSet.size,
    unmatchedNums: [...unmatchedSet].slice(0, 20),
    totalLines: lines.length,
  });
}
