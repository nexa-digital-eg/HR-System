import { NextResponse } from 'next/server';
import { getAuthPayload } from '@/lib/auth';
import { createServerSupabase } from '@/lib/supabase';

const DEFAULT_LATE_HOUR = 8;
const DEFAULT_LATE_MINUTE = 15;
const BATCH_SIZE = 500;

export const maxDuration = 60;

function isLate(timeStr: string, startTime: string, graceMinutes: number): boolean {
  const [h, m] = timeStr.split(':').map(Number);
  const [sh, sm] = startTime.split(':').map(Number);
  const punchTotal = h * 60 + m;
  const limitTotal = sh * 60 + sm + graceMinutes;
  return punchTotal > limitTotal;
}

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

  // Parse: empNum -> date -> sorted timestamps (with raw time string)
  const punches = new Map<string, Map<string, { dt: Date; timeStr: string }[]>>();

  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 3) continue;
    const empNum = parts[0].trim();
    const timeStr = parts[2].substring(0, 5); // HH:MM
    // Parse as Egypt time (UTC+2) so stored UTC is correct
    const dt = new Date(`${parts[1]}T${parts[2]}+02:00`);
    if (isNaN(dt.getTime())) continue;
    const dateKey = parts[1];
    if (!punches.has(empNum)) punches.set(empNum, new Map());
    const dayMap = punches.get(empNum)!;
    if (!dayMap.has(dateKey)) dayMap.set(dateKey, []);
    dayMap.get(dateKey)!.push({ dt, timeStr });
  }

  const supabase = createServerSupabase();

  // Load employees with their shift info
  const { data: employees } = await supabase
    .from('employees')
    .select('id, employee_number, shift_id, shifts(start_time, grace_minutes)')
    .eq('status', 'ACTIVE');

  const empMap = new Map<string, { id: string; startTime: string; grace: number }>(
    (employees || []).map(e => {
      const shift = e.shifts as unknown as { start_time: string; grace_minutes: number } | null;
      return [
        e.employee_number.trim(),
        {
          id: e.id,
          startTime: shift?.start_time?.substring(0, 5) ?? `${String(DEFAULT_LATE_HOUR).padStart(2, '0')}:${String(DEFAULT_LATE_MINUTE).padStart(2, '0')}`,
          grace: shift?.grace_minutes ?? 0,
        },
      ];
    })
  );

  const records: object[] = [];
  const unmatchedSet = new Set<string>();

  for (const [empNum, dayMap] of punches) {
    const emp = empMap.get(empNum);
    if (!emp) { unmatchedSet.add(empNum); continue; }

    for (const [dateKey, entries] of dayMap) {
      entries.sort((a, b) => a.dt.getTime() - b.dt.getTime());
      const first = entries[0];
      const last = entries[entries.length - 1];
      const checkOut = entries.length > 1 ? last.dt.toISOString() : null;
      const workHours = checkOut
        ? Math.round(((last.dt.getTime() - first.dt.getTime()) / 3600000) * 100) / 100
        : null;
      const status = isLate(first.timeStr, emp.startTime, emp.grace) ? 'LATE' : 'PRESENT';

      records.push({
        employee_id: emp.id,
        date: dateKey,
        check_in: first.dt.toISOString(),
        check_out: checkOut,
        work_hours: workHours,
        status,
        source: 'fingerprint',
      });
    }
  }

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
