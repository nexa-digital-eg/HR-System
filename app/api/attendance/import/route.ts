import { NextResponse } from 'next/server';
import { getAuthPayload } from '@/lib/auth';
import { createServerSupabase } from '@/lib/supabase';

const LATE_HOUR = 9;
const LATE_MINUTE = 15;

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

  // Parse each line: employee_number  datetime  verify_mode  in_out  work_code  reserved
  type Punch = { datetime: Date };
  const punches = new Map<string, Map<string, Punch[]>>(); // empNum -> date -> punches[]

  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 2) continue;

    const empNum = parts[0].trim();
    const datetimeStr = `${parts[1]} ${parts[2]}`;
    const dt = new Date(datetimeStr);
    if (isNaN(dt.getTime())) continue;

    const dateKey = datetimeStr.split(' ')[0]; // YYYY-MM-DD

    if (!punches.has(empNum)) punches.set(empNum, new Map());
    const empMap = punches.get(empNum)!;
    if (!empMap.has(dateKey)) empMap.set(dateKey, []);
    empMap.get(dateKey)!.push({ datetime: dt });
  }

  const supabase = createServerSupabase();

  // Fetch all employees to map employee_number -> id
  const { data: employees } = await supabase
    .from('employees')
    .select('id, employee_number')
    .eq('status', 'ACTIVE');

  const empMap = new Map<string, string>(
    (employees || []).map(e => [e.employee_number.trim(), e.id])
  );

  let created = 0;
  let updated = 0;
  let unmatched = 0;
  const unmatchedNums: string[] = [];

  for (const [empNum, dateMap] of punches) {
    const employeeId = empMap.get(empNum);
    if (!employeeId) {
      unmatched++;
      if (!unmatchedNums.includes(empNum)) unmatchedNums.push(empNum);
      continue;
    }

    for (const [dateKey, dayPunches] of dateMap) {
      dayPunches.sort((a, b) => a.datetime.getTime() - b.datetime.getTime());
      const first = dayPunches[0].datetime;
      const last = dayPunches[dayPunches.length - 1].datetime;

      const checkIn = first.toISOString();
      const checkOut = dayPunches.length > 1 ? last.toISOString() : null;

      const workHours = checkOut
        ? Math.round(((last.getTime() - first.getTime()) / 3600000) * 100) / 100
        : null;

      const h = first.getHours();
      const m = first.getMinutes();
      const isLate = h > LATE_HOUR || (h === LATE_HOUR && m > LATE_MINUTE);
      const status = isLate ? 'LATE' : 'PRESENT';

      const { error, data } = await supabase
        .from('attendance')
        .upsert({
          employee_id: employeeId,
          date: dateKey,
          check_in: checkIn,
          check_out: checkOut,
          work_hours: workHours,
          status,
          source: 'fingerprint',
        }, { onConflict: 'employee_id,date' })
        .select('id')
        .single();

      if (!error) {
        if (data) created++;
      }
    }
  }

  return NextResponse.json({
    success: true,
    created,
    updated,
    unmatched,
    unmatchedNums: unmatchedNums.slice(0, 20),
    totalLines: lines.length,
  });
}
