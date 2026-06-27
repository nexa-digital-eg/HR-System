'use client';

import { useEffect, useState, useCallback } from 'react';
import { useLanguage } from '@/lib/i18n';
import { CheckCircle, XCircle, Eye, X } from 'lucide-react';
import { toast } from 'sonner';
import { JWTPayload } from '@/lib/types';

interface LeaveRequest {
  id: string;
  employee_id: string;
  employees: { name_ar: string; name_en: string; employee_number: string; manager_id?: string };
  leave_types: { name_ar: string; name_en: string };
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
  status: string;
  created_at: string;
  rejection_reason?: string;
}

export default function AdminLeavesPage() {
  const { t, lang } = useLanguage();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [count, setCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<LeaveRequest | null>(null);
  const [rejReason, setRejReason] = useState('');
  const [acting, setActing] = useState(false);
  const [me, setMe] = useState<JWTPayload | null>(null);

  useEffect(() => {
    fetch('/api/me').then(r => r.json()).then(d => setMe(d)).catch(() => {});
  }, []);

  const fetchLeaves = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: '50' });
    if (statusFilter) params.set('status', statusFilter);
    fetch(`/api/leaves?${params}`)
      .then(r => r.json())
      .then(d => { setLeaves(d.data || []); setCount(d.count || 0); setLoading(false); });
  }, [statusFilter]);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  const canActOn = (leave: LeaveRequest): 'first' | 'second' | null => {
    if (!me) return null;
    const isDirectManager = !!me.employee_id && me.employee_id === leave.employees.manager_id;
    const isHRAdmin = ['HR_MANAGER', 'SUPER_ADMIN', 'FINANCE'].includes(me.role);

    if (leave.status === 'PENDING') {
      if (isDirectManager) return 'first';
      if (isHRAdmin && !leave.employees.manager_id) return 'second';
      return null;
    }
    if (leave.status === 'MANAGER_APPROVED' && isHRAdmin) return 'second';
    return null;
  };

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    if (action === 'reject' && !rejReason.trim()) {
      toast.error(t('rejectionReasonRequired'));
      return;
    }
    setActing(true);
    try {
      const res = await fetch(`/api/leaves/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, rejection_reason: rejReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(action === 'approve' ? t('approved') : t('rejected'));
      setSelected(null);
      setRejReason('');
      fetchLeaves();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setActing(false);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      PENDING: 'bg-amber-100 text-amber-700 border border-amber-200',
      MANAGER_APPROVED: 'bg-blue-100 text-blue-700 border border-blue-200',
      APPROVED: 'bg-green-100 text-green-700 border border-green-200',
      REJECTED: 'bg-red-100 text-red-700 border border-red-200',
    };
    return map[status] || 'bg-slate-100 text-slate-600';
  };

  const statusLabel = (status: string) => {
    const key = status.toLowerCase().replace('_', '_') as Parameters<typeof t>[0];
    return t(key);
  };

  const filterTabs = ['', 'PENDING', 'MANAGER_APPROVED', 'APPROVED', 'REJECTED'];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t('leaves')}</h1>
        <p className="text-slate-500 text-sm mt-0.5">{count} {t('requests')}</p>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {filterTabs.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${statusFilter === s ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {s === '' ? t('all') : statusLabel(s)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('employee')}</th>
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('leaveType')}</th>
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('period')}</th>
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('days')}</th>
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('status')}</th>
                <th className="text-end px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={6} className="py-12 text-center"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
              ) : leaves.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-slate-400">{t('noData')}</td></tr>
              ) : (
                leaves.map(leave => {
                  const actionLevel = canActOn(leave);
                  return (
                    <tr key={leave.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shrink-0 shadow-sm">
                            <span className="text-white text-xs font-bold">
                              {(lang === 'ar' ? leave.employees.name_ar : leave.employees.name_en)?.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{lang === 'ar' ? leave.employees.name_ar : leave.employees.name_en}</p>
                            <p className="text-xs text-slate-400">{leave.employees.employee_number}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">{lang === 'ar' ? leave.leave_types.name_ar : leave.leave_types.name_en}</td>
                      <td className="px-5 py-3.5 text-slate-500 text-xs">
                        {new Date(leave.start_date).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB')} →{' '}
                        {new Date(leave.end_date).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB')}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-700">{leave.days}</td>
                      <td className="px-5 py-3.5">
                        <div className="space-y-1">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusBadge(leave.status)}`}>
                            {statusLabel(leave.status)}
                          </span>
                          {leave.status === 'PENDING' && leave.employees.manager_id && (
                            <p className="text-[10px] text-slate-400">{lang === 'ar' ? 'ينتظر المدير المباشر' : 'Awaiting direct manager'}</p>
                          )}
                          {leave.status === 'MANAGER_APPROVED' && (
                            <p className="text-[10px] text-blue-500">{lang === 'ar' ? 'ينتظر موافقة الإدارة' : 'Awaiting HR approval'}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => { setSelected(leave); setRejReason(''); }} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors" title={t('view')}>
                            <Eye size={15} />
                          </button>
                          {actionLevel && (
                            <>
                              <button onClick={() => handleAction(leave.id, 'approve')} className="p-1.5 rounded-lg hover:bg-green-50 text-slate-400 hover:text-green-600 transition-colors" title={t('approve')}>
                                <CheckCircle size={15} />
                              </button>
                              <button onClick={() => { setSelected(leave); setRejReason(''); }} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors" title={t('reject')}>
                                <XCircle size={15} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">{t('leaveDetails')}</h2>
              <button onClick={() => setSelected(null)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-400 mb-0.5">{t('employee')}</p>
                  <p className="font-semibold text-slate-800">{lang === 'ar' ? selected.employees.name_ar : selected.employees.name_en}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-400 mb-0.5">{t('leaveType')}</p>
                  <p className="font-semibold text-slate-800">{lang === 'ar' ? selected.leave_types.name_ar : selected.leave_types.name_en}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-400 mb-0.5">{t('startDate')}</p>
                  <p className="font-semibold text-slate-800">{new Date(selected.start_date).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB')}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-400 mb-0.5">{t('endDate')}</p>
                  <p className="font-semibold text-slate-800">{new Date(selected.end_date).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB')}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 col-span-2">
                  <p className="text-xs text-slate-400 mb-0.5">{t('status')}</p>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusBadge(selected.status)}`}>
                    {statusLabel(selected.status)}
                  </span>
                  {selected.status === 'PENDING' && selected.employees.manager_id && (
                    <p className="text-xs text-slate-400 mt-1">{lang === 'ar' ? 'ينتظر موافقة المدير المباشر' : 'Awaiting direct manager approval'}</p>
                  )}
                  {selected.status === 'MANAGER_APPROVED' && (
                    <p className="text-xs text-blue-500 mt-1">{lang === 'ar' ? 'وافق المدير المباشر — ينتظر موافقة الإدارة' : 'Manager approved — awaiting HR final approval'}</p>
                  )}
                </div>
                <div className="bg-slate-50 rounded-xl p-3 col-span-2">
                  <p className="text-xs text-slate-400 mb-0.5">{t('reason')}</p>
                  <p className="font-medium text-slate-700">{selected.reason || '-'}</p>
                </div>
              </div>

              {canActOn(selected) && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t('rejectionReason')}</label>
                  <textarea
                    value={rejReason}
                    onChange={e => setRejReason(e.target.value)}
                    rows={3}
                    placeholder={t('optional')}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none"
                  />
                </div>
              )}
            </div>
            {canActOn(selected) && (
              <div className="flex items-center gap-3 p-6 pt-0">
                <button
                  onClick={() => handleAction(selected.id, 'reject')}
                  disabled={acting}
                  className="flex-1 py-2.5 text-sm font-semibold bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors disabled:opacity-60"
                >
                  {t('reject')}
                </button>
                <button
                  onClick={() => handleAction(selected.id, 'approve')}
                  disabled={acting}
                  className="flex-1 py-2.5 text-sm font-semibold bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors disabled:opacity-60 shadow-sm shadow-green-600/30"
                >
                  {t('approve')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
