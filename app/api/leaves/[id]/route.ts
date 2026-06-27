import { NextResponse } from 'next/server';
import { getAuthPayload } from '@/lib/auth';
import { createServerSupabase } from '@/lib/supabase';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const payload = await getAuthPayload(request);
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { data, error } = await createServerSupabase()
    .from('leave_requests')
    .select('*, employees(name_ar,name_en,employee_number), leave_types(name_ar,name_en)')
    .eq('id', id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const payload = await getAuthPayload(request);
  if (!payload || payload.role === 'EMPLOYEE') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const { action, rejection_reason } = await request.json();

  if (!['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const supabase = createServerSupabase();

  const { data: leave } = await supabase
    .from('leave_requests')
    .select('*, employees(user_id, name_ar, name_en, manager_id)')
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

  // Update leave balance only on final approval
  if (newStatus === 'APPROVED') {
    const currentYear = new Date().getFullYear();
    const { data: bal } = await supabase
      .from('leave_balances')
      .select('id, used_days')
      .eq('employee_id', leave.employee_id)
      .eq('leave_type_id', leave.leave_type_id)
      .eq('year', currentYear)
      .single();
    if (bal) {
      await supabase.from('leave_balances')
        .update({ used_days: bal.used_days + leave.days })
        .eq('id', bal.id);
    }
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
