import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';

// This endpoint is called by fingerprint devices to sync attendance
// Fingerprint devices can call: POST /api/attendance/fingerprint
// Body: { employee_number: string, timestamp: string, type: 'in' | 'out', device_id?: string }
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { employee_number, timestamp, type, device_id } = body;

    if (!employee_number || !timestamp || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createServerSupabase();
    const punchTime = new Date(timestamp);
    const dateStr = punchTime.toISOString().split('T')[0];

    const { data: employee } = await supabase
      .from('employees')
      .select('id')
      .eq('employee_number', employee_number)
      .eq('status', 'ACTIVE')
      .single();

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found or inactive' }, { status: 404 });
    }

    const { data: existing } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', employee.id)
      .eq('date', dateStr)
      .single();

    const workStartHour = 9;
    const lateThresholdMinutes = 15;
    const punchHour = punchTime.getHours();
    const punchMinute = punchTime.getMinutes();
    const isLate = type === 'in' && (punchHour > workStartHour || (punchHour === workStartHour && punchMinute > lateThresholdMinutes));

    if (existing) {
      const updateData: Record<string, unknown> = {};
      if (type === 'in' && !existing.check_in) {
        updateData.check_in = punchTime.toISOString();
        updateData.status = isLate ? 'LATE' : 'PRESENT';
      } else if (type === 'out') {
        updateData.check_out = punchTime.toISOString();
        if (existing.check_in) {
          const hours = (punchTime.getTime() - new Date(existing.check_in).getTime()) / 3600000;
          updateData.work_hours = Math.round(hours * 100) / 100;
        }
      }
      await supabase.from('attendance').update(updateData).eq('id', existing.id);
    } else {
      await supabase.from('attendance').insert({
        employee_id: employee.id,
        date: dateStr,
        check_in: type === 'in' ? punchTime.toISOString() : null,
        check_out: type === 'out' ? punchTime.toISOString() : null,
        status: type === 'in' ? (isLate ? 'LATE' : 'PRESENT') : 'PRESENT',
        source: device_id ? `fingerprint:${device_id}` : 'fingerprint',
      });
    }

    return NextResponse.json({ success: true, employee_id: employee.id, date: dateStr });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
