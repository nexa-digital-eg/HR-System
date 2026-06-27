'use client';

import { useEffect, useState, useCallback } from 'react';
import { useLanguage } from '@/lib/i18n';
import { Plus, X, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface LeaveType { id: string; name_ar: string; name_en: string; }
interface LeaveBalance { leave_type_id: string; leave_types: { name_ar: string; name_en: string }; total_days: number; used_days: number; }
interface LeaveRequest {
  id: string;
  leave_types: { name_ar: string; name_en: string };
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
  status: string;
  created_at: string;
  rejection_reason?: string;
}

export default function EmployeeLeavesPage() {
  const { t, lang } = useLanguage();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ leave_type_id: '', start_date: '', end_date: '', reason: '' });
  const [saving, setSaving] = useState(false);

  const fetchLeaves = useCallback(() => {
    setLoading(true);
    fetch('/api/leaves?limit=50')
      .then(r => r.json())
      .then(d => {
        if (d.error) console.error('Leaves API error:', d.error);
        setLeaves(d.data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Leaves fetch error:', err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchLeaves();
    fetch('/api/leaves/balances').then(r => r.json()).then(d => setBalances(d.data || [])).catch(() => {});
    fetch('/api/leave-types').then(r => r.json()).then(d => setLeaveTypes(d.data || d || []));
  }, [fetchLeaves]);

  const handleSubmit = async () => {
    if (!form.leave_type_id || !form.start_date || !form.end_date) {
      toast.error(t('fillRequired'));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(t('requestSubmitted'));
      setShowModal(false);
      setForm({ leave_type_id: '', start_date: '', end_date: '', reason: '' });
      fetchLeaves();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
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
    const key = status.toLowerCase() as Parameters<typeof t>[0];
    return t(key);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('myLeaves')}</h1>
          <p className="text-slate-500 text-sm mt-0.5">{leaves.length} {t('requests')}</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm shadow-blue-600/30">
          <Plus size={16} />
          {t('requestLeave')}
        </button>
      </div>

      {/* Balances */}
      {balances.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {balances.map((bal, i) => {
            const remaining = bal.total_days - bal.used_days;
            const pct = Math.min(100, (bal.used_days / bal.total_days) * 100) || 0;
            return (
              <div key={i} className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-600 truncate">{lang === 'ar' ? bal.leave_types.name_ar : bal.leave_types.name_en}</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{remaining}</p>
                <p className="text-xs text-slate-400">{t('remainingDays')}</p>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Requests list */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('leaveType')}</th>
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('period')}</th>
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('days')}</th>
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('reason')}</th>
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('requestDate')}</th>
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={6} className="py-12 text-center"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
              ) : leaves.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <Calendar size={32} className="text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-400">{t('noLeaveRequests')}</p>
                  </td>
                </tr>
              ) : (
                leaves.map(leave => (
                  <tr key={leave.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-slate-800">{lang === 'ar' ? leave.leave_types.name_ar : leave.leave_types.name_en}</td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">
                      {new Date(leave.start_date).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB')} → {new Date(leave.end_date).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB')}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-700">{leave.days}</td>
                    <td className="px-5 py-3.5 text-slate-500 max-w-xs">
                      <p className="truncate">{leave.reason || '-'}</p>
                      {leave.rejection_reason && (
                        <p className="text-xs text-red-500 mt-0.5 truncate">{leave.rejection_reason}</p>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">{new Date(leave.created_at).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB')}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusBadge(leave.status)}`}>
                        {statusLabel(leave.status)}
                      </span>
                      {leave.status === 'MANAGER_APPROVED' && (
                        <p className="text-[10px] text-blue-500 mt-0.5">{lang === 'ar' ? 'ينتظر موافقة الإدارة' : 'Awaiting HR approval'}</p>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Request modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">{t('requestLeave')}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t('leaveType')}</label>
                <select value={form.leave_type_id} onChange={e => setForm(p => ({ ...p, leave_type_id: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400">
                  <option value="">{t('selectLeaveType')}</option>
                  {leaveTypes.map(lt => <option key={lt.id} value={lt.id}>{lang === 'ar' ? lt.name_ar : lt.name_en}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t('startDate')}</label>
                  <input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t('endDate')}</label>
                  <input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t('reason')}</label>
                <textarea value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} rows={3}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none"
                  placeholder={t('optional')} />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 pt-0">
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">{t('cancel')}</button>
              <button onClick={handleSubmit} disabled={saving} className="px-5 py-2.5 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors disabled:opacity-60 shadow-sm shadow-blue-600/30">
                {saving ? t('submitting') : t('submit')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
