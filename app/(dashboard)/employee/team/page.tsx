'use client';

import { useEffect, useState, useCallback } from 'react';
import { useLanguage } from '@/lib/i18n';
import { Calendar, CreditCard, X, Users } from 'lucide-react';
import { toast } from 'sonner';

interface Employee { name_ar: string; name_en: string; employee_number: string; }
interface LeaveType { name_ar: string; name_en: string; }

interface TeamLeave {
  id: string;
  employees: Employee;
  leave_types: LeaveType;
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
  status: string;
  created_at: string;
}

interface TeamAdvance {
  id: string;
  employees: Employee;
  amount: number;
  installments: number;
  installment_amount: number;
  reason: string;
  status: string;
  created_at: string;
}

export default function TeamRequestsPage() {
  const { t, lang } = useLanguage();
  const [leaves, setLeaves] = useState<TeamLeave[]>([]);
  const [advances, setAdvances] = useState<TeamAdvance[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'leaves' | 'advances'>('leaves');
  const [rejectModal, setRejectModal] = useState<{ type: 'leave' | 'advance'; id: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchTeam = useCallback(() => {
    setLoading(true);
    fetch('/api/team')
      .then(r => r.json())
      .then(d => {
        setLeaves(d.leaves || []);
        setAdvances(d.advances || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { fetchTeam(); }, [fetchTeam]);

  const handleAction = async (type: 'leave' | 'advance', id: string, action: 'approve' | 'reject', reason?: string) => {
    setProcessing(id);
    try {
      const url = type === 'leave' ? `/api/leaves/${id}` : `/api/advances/${id}`;
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, rejection_reason: reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(action === 'approve' ? t('approved') : t('rejected'));
      setRejectModal(null);
      setRejectionReason('');
      fetchTeam();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setProcessing(null);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      PENDING: 'bg-amber-100 text-amber-700 border border-amber-200',
      MANAGER_APPROVED: 'bg-blue-100 text-blue-700 border border-blue-200',
    };
    return map[status] || 'bg-slate-100 text-slate-600';
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(v);

  const pendingLeaves = leaves.filter(l => l.status === 'PENDING').length;
  const pendingAdvances = advances.filter(a => a.status === 'PENDING').length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t('teamRequests')}</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {lang === 'ar' ? 'طلبات الموظفين المرتبطين بك مباشرةً' : 'Requests from your direct reports'}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('leaves')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === 'leaves' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Calendar size={15} />
          {t('leaves')}
          {pendingLeaves > 0 && (
            <span className="bg-amber-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">{pendingLeaves}</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('advances')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === 'advances' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <CreditCard size={15} />
          {t('advances')}
          {pendingAdvances > 0 && (
            <span className="bg-amber-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">{pendingAdvances}</span>
          )}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Leaves tab */}
          {activeTab === 'leaves' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('name')}</th>
                      <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('leaveType')}</th>
                      <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('period')}</th>
                      <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('days')}</th>
                      <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('reason')}</th>
                      <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('requestDate')}</th>
                      <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('status')}</th>
                      <th className="px-5 py-3.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {leaves.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center">
                          <Users size={32} className="text-slate-300 mx-auto mb-2" />
                          <p className="text-slate-400">{lang === 'ar' ? 'لا توجد طلبات إجازة معلقة' : 'No pending leave requests'}</p>
                        </td>
                      </tr>
                    ) : (
                      leaves.map(leave => (
                        <tr key={leave.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-3.5">
                            <p className="font-medium text-slate-800">{lang === 'ar' ? leave.employees.name_ar : leave.employees.name_en}</p>
                            <p className="text-[11px] text-slate-400">{leave.employees.employee_number}</p>
                          </td>
                          <td className="px-5 py-3.5 text-slate-600">{lang === 'ar' ? leave.leave_types.name_ar : leave.leave_types.name_en}</td>
                          <td className="px-5 py-3.5 text-slate-500 text-xs">
                            {new Date(leave.start_date).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB')}
                            {' → '}
                            {new Date(leave.end_date).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB')}
                          </td>
                          <td className="px-5 py-3.5 font-semibold text-slate-700">{leave.days}</td>
                          <td className="px-5 py-3.5 text-slate-500 max-w-[180px]">
                            <p className="truncate">{leave.reason || '-'}</p>
                          </td>
                          <td className="px-5 py-3.5 text-slate-500 text-xs">
                            {new Date(leave.created_at).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB')}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusBadge(leave.status)}`}>
                              {t(leave.status.toLowerCase() as Parameters<typeof t>[0])}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            {leave.status === 'PENDING' && (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleAction('leave', leave.id, 'approve')}
                                  disabled={processing === leave.id}
                                  className="px-3 py-1.5 text-xs font-semibold bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-60"
                                >
                                  {t('approve')}
                                </button>
                                <button
                                  onClick={() => { setRejectModal({ type: 'leave', id: leave.id }); setRejectionReason(''); }}
                                  disabled={processing === leave.id}
                                  className="px-3 py-1.5 text-xs font-semibold bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors disabled:opacity-60"
                                >
                                  {t('reject')}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Advances tab */}
          {activeTab === 'advances' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('name')}</th>
                      <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('amount')}</th>
                      <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('installments')}</th>
                      <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('reason')}</th>
                      <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('date')}</th>
                      <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('status')}</th>
                      <th className="px-5 py-3.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {advances.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center">
                          <Users size={32} className="text-slate-300 mx-auto mb-2" />
                          <p className="text-slate-400">{lang === 'ar' ? 'لا توجد طلبات سلف معلقة' : 'No pending advance requests'}</p>
                        </td>
                      </tr>
                    ) : (
                      advances.map(adv => (
                        <tr key={adv.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-3.5">
                            <p className="font-medium text-slate-800">{lang === 'ar' ? adv.employees.name_ar : adv.employees.name_en}</p>
                            <p className="text-[11px] text-slate-400">{adv.employees.employee_number}</p>
                          </td>
                          <td className="px-5 py-3.5 font-bold text-slate-900">{formatCurrency(adv.amount)}</td>
                          <td className="px-5 py-3.5 text-slate-600">{adv.installments}x {formatCurrency(adv.installment_amount)}</td>
                          <td className="px-5 py-3.5 text-slate-500 max-w-[180px]">
                            <p className="truncate">{adv.reason || '-'}</p>
                          </td>
                          <td className="px-5 py-3.5 text-slate-500 text-xs">
                            {new Date(adv.created_at).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB')}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusBadge(adv.status)}`}>
                              {t(adv.status.toLowerCase() as Parameters<typeof t>[0])}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            {adv.status === 'PENDING' && (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleAction('advance', adv.id, 'approve')}
                                  disabled={processing === adv.id}
                                  className="px-3 py-1.5 text-xs font-semibold bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-60"
                                >
                                  {t('approve')}
                                </button>
                                <button
                                  onClick={() => { setRejectModal({ type: 'advance', id: adv.id }); setRejectionReason(''); }}
                                  disabled={processing === adv.id}
                                  className="px-3 py-1.5 text-xs font-semibold bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors disabled:opacity-60"
                                >
                                  {t('reject')}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Rejection reason modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">{t('rejectionReason')}</h3>
              <button onClick={() => setRejectModal(null)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                <X size={18} />
              </button>
            </div>
            <textarea
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 resize-none mb-4"
              placeholder={t('enterRejectionReason')}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setRejectModal(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                onClick={() => handleAction(rejectModal.type, rejectModal.id, 'reject', rejectionReason)}
                disabled={!!processing}
                className="px-4 py-2 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors disabled:opacity-60"
              >
                {t('reject')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
