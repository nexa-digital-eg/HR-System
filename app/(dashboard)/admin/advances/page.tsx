'use client';

import { useEffect, useState, useCallback } from 'react';
import { useLanguage } from '@/lib/i18n';
import { CheckCircle, XCircle, Eye, X } from 'lucide-react';
import { toast } from 'sonner';

interface Advance {
  id: string;
  employees: { name_ar: string; name_en: string; employee_number: string };
  amount: number;
  reason: string;
  installments: number;
  installment_amount: number;
  remaining_amount: number;
  paid_amount: number;
  status: string;
  created_at: string;
  rejection_reason?: string;
}

export default function AdminAdvancesPage() {
  const { t, lang } = useLanguage();
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [count, setCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Advance | null>(null);
  const [rejReason, setRejReason] = useState('');
  const [acting, setActing] = useState(false);

  const fetchAdvances = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: '50' });
    if (statusFilter) params.set('status', statusFilter);
    fetch(`/api/advances?${params}`)
      .then(r => r.json())
      .then(d => { setAdvances(d.data || []); setCount(d.count || 0); setLoading(false); });
  }, [statusFilter]);

  useEffect(() => { fetchAdvances(); }, [fetchAdvances]);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setActing(true);
    try {
      const res = await fetch(`/api/advances/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, rejection_reason: rejReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(action === 'approve' ? t('approved') : t('rejected'));
      setSelected(null);
      setRejReason('');
      fetchAdvances();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setActing(false);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      PENDING: 'bg-amber-100 text-amber-700 border border-amber-200',
      APPROVED: 'bg-green-100 text-green-700 border border-green-200',
      REJECTED: 'bg-red-100 text-red-700 border border-red-200',
      PAID: 'bg-blue-100 text-blue-700 border border-blue-200',
    };
    return map[status] || 'bg-slate-100 text-slate-600';
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(v);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t('advances')}</h1>
        <p className="text-slate-500 text-sm mt-0.5">{count} {t('requests')}</p>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {['', 'PENDING', 'APPROVED', 'REJECTED', 'PAID'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${statusFilter === s ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {s === '' ? t('all') : t(s.toLowerCase() as Parameters<typeof t>[0])}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('employee')}</th>
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('amount')}</th>
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('installments')}</th>
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('remaining')}</th>
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('date')}</th>
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('status')}</th>
                <th className="text-end px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={7} className="py-12 text-center"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
              ) : advances.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-slate-400">{t('noData')}</td></tr>
              ) : (
                advances.map(adv => (
                  <tr key={adv.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shrink-0 shadow-sm">
                          <span className="text-white text-xs font-bold">
                            {(lang === 'ar' ? adv.employees.name_ar : adv.employees.name_en)?.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{lang === 'ar' ? adv.employees.name_ar : adv.employees.name_en}</p>
                          <p className="text-xs text-slate-400">{adv.employees.employee_number}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-800">{formatCurrency(adv.amount)}</td>
                    <td className="px-5 py-3.5 text-slate-600">{adv.installments}x {formatCurrency(adv.installment_amount)}</td>
                    <td className="px-5 py-3.5 text-slate-600">{formatCurrency(adv.remaining_amount)}</td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">{new Date(adv.created_at).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB')}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusBadge(adv.status)}`}>
                        {t(adv.status.toLowerCase() as Parameters<typeof t>[0])}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => { setSelected(adv); setRejReason(''); }} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                          <Eye size={15} />
                        </button>
                        {adv.status === 'PENDING' && (
                          <>
                            <button onClick={() => { setSelected(adv); setRejReason(''); }} className="p-1.5 rounded-lg hover:bg-green-50 text-slate-400 hover:text-green-600 transition-colors">
                              <CheckCircle size={15} />
                            </button>
                            <button onClick={() => { setSelected(adv); setRejReason(''); }} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                              <XCircle size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
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
              <h2 className="text-lg font-bold text-slate-900">{t('advanceDetails')}</h2>
              <button onClick={() => setSelected(null)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-400 mb-0.5">{t('employee')}</p>
                  <p className="font-semibold text-slate-800">{lang === 'ar' ? selected.employees.name_ar : selected.employees.name_en}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-400 mb-0.5">{t('amount')}</p>
                  <p className="font-semibold text-slate-800">{formatCurrency(selected.amount)}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-400 mb-0.5">{t('installments')}</p>
                  <p className="font-semibold text-slate-800">{selected.installments} × {formatCurrency(selected.installment_amount)}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-400 mb-0.5">{t('remaining')}</p>
                  <p className="font-semibold text-slate-800">{formatCurrency(selected.remaining_amount)}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 col-span-2">
                  <p className="text-xs text-slate-400 mb-0.5">{t('reason')}</p>
                  <p className="font-medium text-slate-700">{selected.reason || '-'}</p>
                </div>
              </div>
              {selected.status === 'PENDING' && (
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
            {selected.status === 'PENDING' && (
              <div className="flex items-center gap-3 p-6 pt-0">
                <button onClick={() => handleAction(selected.id, 'reject')} disabled={acting}
                  className="flex-1 py-2.5 text-sm font-semibold bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors disabled:opacity-60">
                  {t('reject')}
                </button>
                <button onClick={() => handleAction(selected.id, 'approve')} disabled={acting}
                  className="flex-1 py-2.5 text-sm font-semibold bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors disabled:opacity-60 shadow-sm shadow-green-600/30">
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
