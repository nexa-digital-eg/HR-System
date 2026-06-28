import { NextResponse } from 'next/server';
import { getAuthPayload } from '@/lib/auth';
import { createServerSupabase } from '@/lib/supabase';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const payload = await getAuthPayload(request);
  if (!payload || !payload.employee_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { leave_type_id, start_date, end_date, reason } = body;

  if (!leave_type_id || !start_date || !end_date) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const start = new Date(start_date);
  const end = new Date(end_date);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
    return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
  }
  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const supabase = createServerSupabase();
  const { data: leave } = await supabase
    .from('leave_requests')
    .select('id, employee_id, status')
    .eq('id', id)
    .single();

  if (!leave) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (leave.employee_id !== payload.employee_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (leave.status !== 'PENDING') return NextResponse.json({ error: 'لا يمكن تعديل طلب تمت معالجته' }, { status: 400 });

  const { data, error } = await supabase
    .from('leave_requests')
    .update({ leave_type_id, start_date, end_date, days, reason })
    .eq('id', id)
    .select('*, leave_types(name_ar,name_en)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const payload = await getAuthPayload(request);
  if (!payload || !payload.employee_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const supabase = createServerSupabase();

  const { data: leave } = await supabase
    .from('leave_requests')
    .select('id, employee_id, status')
    .eq('id', id)
    .single();

  if (!leave) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (leave.employee_id !== payload.employee_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (leave.status !== 'PENDING') return NextResponse.json({ error: 'لا يمكن حذف طلب تمت معالجته' }, { status: 400 });

  const { error } = await supabase.from('leave_requests').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const payload = await getAuthPayload(request);
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { data, error } = await createServerSupabase()
    .from('leave_requests')
    .select('*, employees!employee_id(name_ar,name_en,employee_number), leave_types(name_ar,name_en)')
    .eq('id', id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const payload = await getAuthPayload(request);
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { action, rejection_reason } = await request.json();

  if (!['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const supabase = createServerSupabase();

  const { data: leave } = await supabase
    .from('leave_requests')
    .select('*, employees!employee_id(user_id, name_ar, name_en, manager_id)')
    .eq('id', id)
    .single();

  if (!leave) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const emp = leave.employees as unknown as {
    user_id: string; name_ar: string; name_en: string; manager_id?: string;
  };

  const isDirectManager = !!payload.employee_id && payload.employee_id === emp.manager_id;
  const isHRAdmin = ['HR_MANAGER', 'SUPER_ADMIN', 'FINANCE'].includes(payload.role);

  let newStatus: string;

  if (leave.status === 'PENDING') {
    if (action === 'approve') {
      if (isDirectManager) {
        newStatus = 'MANAGER_APPROVED';
      } else if (isHRAdmin && !emp.manager_id) {
        newStatus = 'APPROVED';
      } else if (isHRAdmin && emp.manager_id) {
        return NextResponse.json(
          { error: 'يجب موافقة المدير المباشر أولاً' },
          { status: 400 }
        );
      } else {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else {
      if (!isDirectManager && !isHRAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      newStatus = 'REJECTED';
    }
  } else if (leave.status === 'MANAGER_APPROVED') {
    if (!isHRAdmin) {
      return NextResponse.json(
        { error: 'يحتاج موافقة الإدارة / الموارد البشرية' },
        { status: 403 }
      );
    }
    newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';
  } else {
    return NextResponse.json({ error: 'Already processed' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('leave_requests')
    .update({
      status: newStatus,
      approved_by: payload.employee_id,
      approved_at: new Date().toISOString(),
      rejection_reason: action === 'reject' ? rejection_reason : null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // On final approval: deduct from leave_balance, track salary deduction days
  if (newStatus === 'APPROVED') {
    const { data: empData } = await supabase
      .from('employees')
      .select('leave_balance')
      .eq('id', leave.employee_id)
      .single();

    const currentBalance = Number(empData?.leave_balance) || 0;
    const requestedDays = leave.days || 0;
    const salaryDeductionDays = Math.max(0, requestedDays - currentBalance);
    const newBalance = Math.max(0, currentBalance - requestedDays);

    await Promise.all([
      supabase.from('employees').update({ leave_balance: newBalance }).eq('id', leave.employee_id),
      supabase.from('leave_requests').update({ salary_deduction_days: salaryDeductionDays }).eq('id', id),
    ]);
  }

  // Notify employee
  if (emp?.user_id) {
    let titleAr: string, titleEn: string, bodyAr: string, bodyEn: string;
    if (newStatus === 'MANAGER_APPROVED') {
      titleAr = 'وافق مديرك على إجازتك';
      titleEn = 'Manager Approved Your Leave';
      bodyAr = 'وافق مديرك المباشر على طلب إجازتك، في انتظار موافقة الإدارة';
      bodyEn = 'Your direct manager approved your leave request, pending HR final approval';
    } else if (newStatus === 'APPROVED') {
      titleAr = 'تمت الموافقة على إجازتك';
      titleEn = 'Leave Request Approved';
      bodyAr = 'تمت الموافقة النهائية على طلب إجازتك';
      bodyEn = 'Your leave request has been fully approved';
    } else {
      titleAr = 'تم رفض طلب إجازتك';
      titleEn = 'Leave Request Rejected';
      bodyAr = `تم رفض طلب إجازتك: ${rejection_reason || ''}`;
      bodyEn = `Your leave request was rejected: ${rejection_reason || ''}`;
    }
    await supabase.from('notifications').insert({
      user_id: emp.user_id,
      title_ar: titleAr,
      title_en: titleEn,
      body_ar: bodyAr,
      body_en: bodyEn,
      type: 'leave_update',
      reference_id: id,
      reference_type: 'leave_request',
    });
  }

  // Notify HR when manager approves (to take action)
  if (newStatus === 'MANAGER_APPROVED') {
    const { data: hrUsers } = await supabase
      .from('users')
      .select('id')
      .in('role', ['HR_MANAGER', 'SUPER_ADMIN']);
    if (hrUsers && hrUsers.length > 0) {
      await supabase.from('notifications').insert(
        hrUsers.map((u: { id: string }) => ({
          user_id: u.id,
          title_ar: 'طلب إجازة يحتاج موافقتك',
          title_en: 'Leave Request Awaiting Your Approval',
          body_ar: `وافق المدير على إجازة ${emp.name_ar}، يتطلب موافقتك النهائية`,
          body_en: `Manager approved ${emp.name_en}'s leave, your final approval is needed`,
          type: 'leave_request',
          reference_id: id,
          reference_type: 'leave_request',
        }))
      );
    }
  }

  return NextResponse.json(data);
}
