'use client';

import { useEffect, useState, useCallback } from 'react';
import { useLanguage } from '@/lib/i18n';
import { Plus, X, CreditCard, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Advance {
  id: string;
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

const BLANK = { amount: '', reason: '', installments: '1' };

export default function EmployeeAdvancesPage() {
  const { t, lang } = useLanguage();
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchAdvances = useCallback(() => {
    setLoading(true);
    fetch('/api/advances?limit=50')
      .then(r => r.json())
      .then(d => {
        if (d.error) console.error('Advances API error:', d.error);
        setAdvances(d.data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Advances fetch error:', err);
        setLoading(false);
      });
  }, []);

  useEffect(() => { fetchAdvances(); }, [fetchAdvances]);

  const openCreate = () => { setEditingId(null); setForm(BLANK); setShowModal(true); };
  const openEdit = (adv: Advance) => {
    setEditingId(adv.id);
    setForm({ amount: String(adv.amount), reason: adv.reason || '', installments: String(adv.installments) });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.amount) { toast.error(t('fillRequired')); return; }
    setSaving(true);
    try {
      const url = editingId ? `/api/advances/${editingId}` : '/api/advances';
      const method = editingId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(form.amount), reason: form.reason, installments: Number(form.installments) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(editingId ? t('savedSuccessfully') : t('requestSubmitted'));
      setShowModal(false);
      setForm(BLANK);
      setEditingId(null);
      fetchAdvances();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/advances/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(t('deletedSuccessfully'));
      setConfirmDeleteId(null);
      fetchAdvances();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      PENDING: 'bg-amber-100 text-amber-700 border border-amber-200',
      MANAGER_APPROVED: 'bg-blue-100 text-blue-700 border border-blue-200',
      APPROVED: 'bg-green-100 text-green-700 border border-green-200',
      REJECTED: 'bg-red-100 text-red-700 border border-red-200',
      PAID: 'bg-purple-100 text-purple-700 border border-purple-200',
    };
    return map[status] || 'bg-slate-100 text-slate-600';
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(v);

  const installmentPreview = form.amount && form.installments
    ? formatCurrency(Number(form.amount) / Number(form.installments))
    : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('myAdvances')}</h1>
          <p className="text-slate-500 text-sm mt-0.5">{advances.length} {t('requests')}</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm shadow-blue-600/30">
          <Plus size={16} />
          {t('requestAdvance')}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('amount')}</th>
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('installments')}</th>
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('paid')}</th>
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('remaining')}</th>
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('reason')}</th>
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('date')}</th>
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('status')}</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={8} className="py-12 text-center"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
              ) : advances.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <CreditCard size={32} className="text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-400">{t('noAdvanceRequests')}</p>
                  </td>
                </tr>
              ) : (
                advances.map(adv => (
                  <tr key={adv.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-900">{formatCurrency(adv.amount)}</td>
                    <td className="px-5 py-3.5 text-slate-600">{adv.installments}x {formatCurrency(adv.installment_amount)}</td>
                    <td className="px-5 py-3.5 text-green-600 font-medium">{formatCurrency(adv.paid_amount)}</td>
                    <td className="px-5 py-3.5 text-orange-600 font-medium">{formatCurrency(adv.remaining_amount)}</td>
                    <td className="px-5 py-3.5 text-slate-500 max-w-xs">
                      <p className="truncate">{adv.reason || '-'}</p>
                      {adv.rejection_reason && <p className="text-xs text-red-500 mt-0.5 truncate">{adv.rejection_reason}</p>}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">{new Date(adv.created_at).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB')}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusBadge(adv.status)}`}>
                        {t(adv.status.toLowerCase() as Parameters<typeof t>[0])}
                      </span>
                      {adv.status === 'MANAGER_APPROVED' && (
                        <p className="text-[10px] text-blue-500 mt-0.5">{lang === 'ar' ? 'ينتظر موافقة الإدارة' : 'Awaiting HR approval'}</p>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {adv.status === 'PENDING' && (
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => openEdit(adv)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors" title={t('edit')}>
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => setConfirmDeleteId(adv.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors" title={t('delete')}>
                            <Trash2 size={14} />
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

      {/* Create / Edit modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">{editingId ? t('edit') : t('requestAdvance')}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t('amount')} (EGP)</label>
                <input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                  placeholder="5000" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t('installments')}</label>
                <select value={form.installments} onChange={e => setForm(p => ({ ...p, installments: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400">
                  {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} {t('months')}</option>)}
                </select>
                {installmentPreview && (
                  <p className="text-xs text-blue-600 mt-1.5 font-medium">{t('perMonth')}: {installmentPreview}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t('reason')}</label>
                <textarea value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} rows={3}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none"
                  placeholder={t('advanceReasonPlaceholder')} />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 pt-0">
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">{t('cancel')}</button>
              <button onClick={handleSubmit} disabled={saving} className="px-5 py-2.5 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors disabled:opacity-60 shadow-sm shadow-blue-600/30">
                {saving ? t('saving') : editingId ? t('save') : t('submit')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-500" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">{t('delete')} {lang === 'ar' ? 'الطلب' : 'Request'}</h3>
            <p className="text-sm text-slate-500 mb-5">{t('confirmDelete')}</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setConfirmDeleteId(null)} className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">{t('cancel')}</button>
              <button onClick={() => handleDelete(confirmDeleteId)} className="px-5 py-2.5 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors shadow-sm shadow-red-600/30">{t('delete')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
