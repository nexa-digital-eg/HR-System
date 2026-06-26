'use client';

import { useEffect, useState, useCallback } from 'react';
import { useLanguage } from '@/lib/i18n';
import { Plus, X, Search } from 'lucide-react';
import { toast } from 'sonner';

interface AttendanceRecord {
  id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  work_hours: number | null;
  status: string;
  source: string;
  notes: string | null;
  employees: { name_ar: string; name_en: string; employee_number: string };
}

interface Employee {
  id: string;
  name_ar: string;
  name_en: string;
  employee_number: string;
}

const STATUS_COLORS: Record<string, string> = {
  PRESENT: 'bg-green-100 text-green-700',
  LATE: 'bg-amber-100 text-amber-700',
  ABSENT: 'bg-red-100 text-red-700',
  HALF_DAY: 'bg-orange-100 text-orange-700',
  LEAVE: 'bg-blue-100 text-blue-700',
};

export default function AdminAttendancePage() {
  const { t, lang } = useLanguage();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ employee_id: '', date: '', check_in: '', check_out: '', status: 'PRESENT', notes: '' });
  const [saving, setSaving] = useState(false);

  const fetchRecords = useCallback(() => {
    setLoading(true);
    fetch(`/api/attendance?date=${date}&limit=100`)
      .then(r => r.json())
      .then(d => { setRecords(d.data || []); setLoading(false); });
  }, [date]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  useEffect(() => {
    fetch('/api/employees?limit=200').then(r => r.json()).then(d => setEmployees(d.data || []));
  }, []);

  const openAdd = () => {
    setForm({ employee_id: '', date, check_in: '', check_out: '', status: 'PRESENT', notes: '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(t('saved'));
      setShowModal(false);
      fetchRecords();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('attendance')}</h1>
          <p className="text-slate-500 text-sm mt-0.5">{records.length} {t('records')}</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm shadow-blue-600/30">
          <Plus size={16} />
          {t('addRecord')}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3">
        <label className="text-sm font-semibold text-slate-600">{t('date')}:</label>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
        />
        {/* Summary badges */}
        <div className="flex items-center gap-2 ms-auto">
          {['PRESENT', 'LATE', 'ABSENT'].map(s => {
            const cnt = records.filter(r => r.status === s).length;
            return cnt > 0 ? (
              <span key={s} className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_COLORS[s]}`}>
                {cnt} {t(s.toLowerCase() as Parameters<typeof t>[0])}
              </span>
            ) : null;
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('employee')}</th>
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('checkIn')}</th>
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('checkOut')}</th>
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('workHours')}</th>
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('source')}</th>
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={6} className="py-12 text-center"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-slate-400">{t('noData')}</td></tr>
              ) : (
                records.map(rec => (
                  <tr key={rec.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shrink-0 shadow-sm">
                          <span className="text-white text-xs font-bold">
                            {(lang === 'ar' ? rec.employees.name_ar : rec.employees.name_en)?.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{lang === 'ar' ? rec.employees.name_ar : rec.employees.name_en}</p>
                          <p className="text-xs text-slate-400">{rec.employees.employee_number}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-700">{formatTime(rec.check_in)}</td>
                    <td className="px-5 py-3.5 font-mono text-slate-700">{formatTime(rec.check_out)}</td>
                    <td className="px-5 py-3.5 font-semibold text-slate-700">{rec.work_hours ? `${rec.work_hours}h` : '-'}</td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs capitalize">{rec.source}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[rec.status] || 'bg-slate-100 text-slate-600'}`}>
                        {t(rec.status.toLowerCase() as Parameters<typeof t>[0])}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">{t('addRecord')}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t('employee')}</label>
                <select value={form.employee_id} onChange={e => setForm(p => ({ ...p, employee_id: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400">
                  <option value="">{t('selectEmployee')}</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{lang === 'ar' ? e.name_ar : e.name_en}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t('date')}</label>
                <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t('checkIn')}</label>
                  <input type="time" value={form.check_in} onChange={e => setForm(p => ({ ...p, check_in: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t('checkOut')}</label>
                  <input type="time" value={form.check_out} onChange={e => setForm(p => ({ ...p, check_out: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t('status')}</label>
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400">
                  {['PRESENT', 'LATE', 'ABSENT', 'HALF_DAY', 'LEAVE'].map(s => <option key={s} value={s}>{t(s.toLowerCase() as Parameters<typeof t>[0])}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t('notes')}</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 pt-0">
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">{t('cancel')}</button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors disabled:opacity-60 shadow-sm shadow-blue-600/30">
                {saving ? t('saving') : t('save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
