'use client';

import { useEffect, useState, useCallback } from 'react';
import { useLanguage } from '@/lib/i18n';
import { Plus, Edit2, Trash2, X, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface Shift {
  id: string;
  name_ar: string;
  name_en: string;
  start_time: string;
  end_time: string;
  grace_minutes: number;
  is_overnight: boolean;
}

const BLANK: Omit<Shift, 'id'> = { name_ar: '', name_en: '', start_time: '08:00', end_time: '17:00', grace_minutes: 15, is_overnight: false };

export default function ShiftsPage() {
  const { lang } = useLanguage();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...BLANK });
  const [saving, setSaving] = useState(false);

  const fetchShifts = useCallback(() => {
    setLoading(true);
    fetch('/api/shifts').then(r => r.json()).then(d => { setShifts(d); setLoading(false); });
  }, []);

  useEffect(() => { fetchShifts(); }, [fetchShifts]);

  const openAdd = () => { setForm({ ...BLANK }); setEditId(null); setShowModal(true); };
  const openEdit = (s: Shift) => { setForm({ name_ar: s.name_ar, name_en: s.name_en, start_time: s.start_time.substring(0, 5), end_time: s.end_time.substring(0, 5), grace_minutes: s.grace_minutes, is_overnight: s.is_overnight }); setEditId(s.id); setShowModal(true); };

  const handleSave = async () => {
    if (!form.name_ar || !form.start_time || !form.end_time) return toast.error(lang === 'ar' ? 'يرجى ملء الحقول المطلوبة' : 'Please fill required fields');
    setSaving(true);
    try {
      const url = editId ? `/api/shifts/${editId}` : '/api/shifts';
      const method = editId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(lang === 'ar' ? 'تم الحفظ' : 'Saved');
      setShowModal(false);
      fetchShifts();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(lang === 'ar' ? `حذف وردية "${name}"؟` : `Delete shift "${name}"?`)) return;
    const res = await fetch(`/api/shifts/${id}`, { method: 'DELETE' });
    if (res.ok) { toast.success(lang === 'ar' ? 'تم الحذف' : 'Deleted'); fetchShifts(); }
    else toast.error(lang === 'ar' ? 'خطأ في الحذف' : 'Delete failed');
  };

  const fmt = (t: string) => t?.substring(0, 5) ?? '-';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{lang === 'ar' ? 'الورديات' : 'Shifts'}</h1>
          <p className="text-slate-500 text-sm mt-0.5">{shifts.length} {lang === 'ar' ? 'وردية' : 'shifts'}</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm shadow-blue-600/30">
          <Plus size={16} />
          {lang === 'ar' ? 'إضافة وردية' : 'Add Shift'}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{lang === 'ar' ? 'الوردية' : 'Shift'}</th>
              <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{lang === 'ar' ? 'وقت البداية' : 'Start'}</th>
              <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{lang === 'ar' ? 'وقت النهاية' : 'End'}</th>
              <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{lang === 'ar' ? 'السماح (دقيقة)' : 'Grace (min)'}</th>
              <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{lang === 'ar' ? 'نوع' : 'Type'}</th>
              <th className="text-end px-5 py-3.5 font-semibold text-slate-600 text-xs">{lang === 'ar' ? 'إجراءات' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td colSpan={6} className="py-12 text-center"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
            ) : shifts.length === 0 ? (
              <tr><td colSpan={6} className="py-12 text-center text-slate-400">{lang === 'ar' ? 'لا توجد ورديات' : 'No shifts'}</td></tr>
            ) : shifts.map(s => (
              <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shrink-0">
                      <Clock size={14} className="text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">{lang === 'ar' ? s.name_ar : s.name_en}</p>
                      <p className="text-xs text-slate-400">{lang === 'ar' ? s.name_en : s.name_ar}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5 font-mono text-slate-700">{fmt(s.start_time)}</td>
                <td className="px-5 py-3.5 font-mono text-slate-700">{fmt(s.end_time)}</td>
                <td className="px-5 py-3.5 text-slate-600">{s.grace_minutes} {lang === 'ar' ? 'دقيقة' : 'min'}</td>
                <td className="px-5 py-3.5">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${s.is_overnight ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                    {s.is_overnight ? (lang === 'ar' ? '24 ساعة' : '24h') : (lang === 'ar' ? 'عادي' : 'Normal')}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center justify-end gap-1.5">
                    <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"><Edit2 size={15} /></button>
                    <button onClick={() => handleDelete(s.id, lang === 'ar' ? s.name_ar : s.name_en)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">{editId ? (lang === 'ar' ? 'تعديل وردية' : 'Edit Shift') : (lang === 'ar' ? 'إضافة وردية' : 'Add Shift')}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">{lang === 'ar' ? 'الاسم بالعربي' : 'Arabic Name'} *</label>
                  <input value={form.name_ar} onChange={e => setForm(p => ({ ...p, name_ar: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">{lang === 'ar' ? 'الاسم بالإنجليزي' : 'English Name'}</label>
                  <input value={form.name_en} onChange={e => setForm(p => ({ ...p, name_en: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">{lang === 'ar' ? 'وقت البداية' : 'Start Time'} *</label>
                  <input type="time" value={form.start_time} onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">{lang === 'ar' ? 'وقت النهاية' : 'End Time'} *</label>
                  <input type="time" value={form.end_time} onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">{lang === 'ar' ? 'وقت السماح بالتأخير (بالدقائق)' : 'Late Grace Period (minutes)'}</label>
                <input type="number" min={0} max={60} value={form.grace_minutes} onChange={e => setForm(p => ({ ...p, grace_minutes: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.is_overnight} onChange={e => setForm(p => ({ ...p, is_overnight: e.target.checked }))}
                  className="w-4 h-4 rounded accent-blue-600" />
                <span className="text-sm text-slate-700">{lang === 'ar' ? 'وردية ليلية / 24 ساعة (تمتد لليوم التالي)' : 'Overnight / 24h shift (spans next day)'}</span>
              </label>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 pt-0">
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">{lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors disabled:opacity-60">
                {saving ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (lang === 'ar' ? 'حفظ' : 'Save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
