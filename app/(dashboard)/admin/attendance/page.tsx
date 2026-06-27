'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useLanguage } from '@/lib/i18n';
import { Plus, X, Upload, FileUp, Download, Edit2 } from 'lucide-react';
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

interface Department { id: string; name_ar: string; name_en: string; }
interface Employee {
  id: string;
  name_ar: string;
  name_en: string;
  employee_number: string;
  department_id?: string;
}

const STATUS_COLORS: Record<string, string> = {
  PRESENT: 'bg-green-100 text-green-700',
  LATE: 'bg-amber-100 text-amber-700',
  ABSENT: 'bg-red-100 text-red-700',
  HALF_DAY: 'bg-orange-100 text-orange-700',
  LEAVE: 'bg-blue-100 text-blue-700',
};

const today = new Date().toISOString().split('T')[0];

export default function AdminAttendancePage() {
  const { t, lang } = useLanguage();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editRecordId, setEditRecordId] = useState<string | null>(null);
  const [form, setForm] = useState({ employee_id: '', date: '', check_in: '', check_out: '', status: 'PRESENT', notes: '' });
  const [saving, setSaving] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; unmatched: number; unmatchedNums: string[]; totalLines: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchRecords = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ from: dateFrom, to: dateTo, limit: '2000' });
    fetch(`/api/attendance?${params}`)
      .then(r => r.json())
      .then(d => { setRecords(d.data || []); setLoading(false); });
  }, [dateFrom, dateTo]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  useEffect(() => {
    fetch('/api/employees?limit=500').then(r => r.json()).then(d => setEmployees(d.data || []));
    fetch('/api/departments').then(r => r.json()).then(d => setDepartments(d.data || d || []));
  }, []);

  const openAdd = () => {
    setEditRecordId(null);
    setForm({ employee_id: '', date: dateFrom, check_in: '', check_out: '', status: 'PRESENT', notes: '' });
    setShowModal(true);
  };

  const openEdit = (rec: AttendanceRecord) => {
    setEditRecordId(rec.id);
    const toTime = (iso: string | null) => iso ? new Date(iso).toTimeString().substring(0, 5) : '';
    setForm({
      employee_id: '',
      date: rec.date,
      check_in: toTime(rec.check_in),
      check_out: toTime(rec.check_out),
      status: rec.status,
      notes: rec.notes || '',
    });
    setShowModal(true);
  };

  const handleImport = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return toast.error(lang === 'ar' ? 'اختر ملفاً أولاً' : 'Please select a file');
    setImporting(true);
    setImportResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/attendance/import', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setImportResult(data);
      toast.success(lang === 'ar' ? `تم استيراد ${data.created} سجل` : `Imported ${data.created} records`);
      fetchRecords();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setImporting(false);
    }
  };

  const egyptOffset = (dateStr: string) => {
    const noon = new Date(`${dateStr}T12:00:00Z`);
    const egH = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Cairo', hour: '2-digit', hour12: false }).format(noon));
    return `+0${(egH - 12 + 24) % 24}:00`;
  };
  const toISOWithDate = (date: string, time: string) => time ? `${date}T${time}:00${egyptOffset(date)}` : null;

  const handleSave = async () => {
    setSaving(true);
    try {
      let res: Response;
      if (editRecordId) {
        const body = {
          check_in: toISOWithDate(form.date, form.check_in),
          check_out: toISOWithDate(form.date, form.check_out),
          status: form.status,
          notes: form.notes,
        };
        res = await fetch(`/api/attendance/${editRecordId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      } else {
        res = await fetch('/api/attendance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      }
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

  const handleExport = () => {
    if (records.length === 0) return toast.error(lang === 'ar' ? 'لا توجد بيانات للتصدير' : 'No data to export');

    const headers = lang === 'ar'
      ? ['الاسم', 'رقم الموظف', 'التاريخ', 'وقت الحضور', 'وقت الانصراف', 'ساعات العمل', 'الحالة']
      : ['Name', 'Employee #', 'Date', 'Check In', 'Check Out', 'Work Hours', 'Status'];

    const rows = records.map(r => [
      lang === 'ar' ? r.employees.name_ar : r.employees.name_en,
      r.employees.employee_number,
      r.date,
      r.check_in ? new Date(r.check_in).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Cairo' }) : '-',
      r.check_out ? new Date(r.check_out).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Cairo' }) : '-',
      r.work_hours ?? '-',
      r.status,
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const bom = '﻿';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${dateFrom}_${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Cairo' });
  };

  // Build employee_number → department_id map for department filtering
  const empNumToDeptId = Object.fromEntries(employees.map(e => [e.employee_number, e.department_id || '']));

  const filteredRecords = records.filter(rec => {
    const name = lang === 'ar' ? rec.employees.name_ar : rec.employees.name_en;
    if (search && !name.toLowerCase().includes(search.toLowerCase()) &&
        !rec.employees.name_ar.toLowerCase().includes(search.toLowerCase()) &&
        !rec.employees.name_en.toLowerCase().includes(search.toLowerCase())) return false;
    if (deptFilter && empNumToDeptId[rec.employees.employee_number] !== deptFilter) return false;
    return true;
  });

  const isRange = dateFrom !== dateTo;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('attendance')}</h1>
          <p className="text-slate-500 text-sm mt-0.5">{filteredRecords.length} {t('records')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm shadow-emerald-600/30">
            <Download size={15} />
            {lang === 'ar' ? 'تصدير Excel' : 'Export Excel'}
          </button>
          <button onClick={() => { setShowImport(true); setImportResult(null); }} className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm shadow-teal-600/30">
            <Upload size={15} />
            {lang === 'ar' ? 'استيراد بصمة' : 'Import .dat'}
          </button>
          <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm shadow-blue-600/30">
            <Plus size={16} />
            {t('addRecord')}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-wrap items-center gap-3">
        {/* Date range */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-slate-600">{lang === 'ar' ? 'من:' : 'From:'}</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-slate-600">{lang === 'ar' ? 'إلى:' : 'To:'}</label>
          <input type="date" value={dateTo} min={dateFrom} onChange={e => setDateTo(e.target.value)}
            className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800" />
        </div>

        {/* Name search */}
        <div className="relative">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={lang === 'ar' ? 'بحث بالاسم...' : 'Search by name...'}
            className="text-sm border border-slate-200 rounded-xl px-3 py-2 w-44 focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute end-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Department filter */}
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
          className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800 text-slate-700">
          <option value="">{lang === 'ar' ? 'كل الأقسام' : 'All Departments'}</option>
          {departments.map(d => <option key={d.id} value={d.id}>{lang === 'ar' ? d.name_ar : d.name_en}</option>)}
        </select>

        {!isRange && (
          <div className="flex items-center gap-2 ms-auto">
            {['PRESENT', 'LATE', 'ABSENT'].map(s => {
              const cnt = filteredRecords.filter(r => r.status === s).length;
              return cnt > 0 ? (
                <span key={s} className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_COLORS[s]}`}>
                  {cnt} {t(s.toLowerCase() as Parameters<typeof t>[0])}
                </span>
              ) : null;
            })}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('employee')}</th>
                {isRange && <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('date')}</th>}
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('checkIn')}</th>
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('checkOut')}</th>
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('workHours')}</th>
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('source')}</th>
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('status')}</th>
                <th className="text-end px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={isRange ? 8 : 7} className="py-12 text-center"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
              ) : filteredRecords.length === 0 ? (
                <tr><td colSpan={isRange ? 8 : 7} className="py-12 text-center text-slate-400">{t('noData')}</td></tr>
              ) : (
                filteredRecords.map(rec => (
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
                    {isRange && <td className="px-5 py-3.5 text-slate-500 text-xs">{rec.date}</td>}
                    <td className="px-5 py-3.5 font-mono text-slate-700">{formatTime(rec.check_in)}</td>
                    <td className="px-5 py-3.5 font-mono text-slate-700">{formatTime(rec.check_out)}</td>
                    <td className="px-5 py-3.5 font-semibold text-slate-700">{rec.work_hours ? `${rec.work_hours}h` : '-'}</td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs capitalize">{rec.source}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[rec.status] || 'bg-slate-100 text-slate-600'}`}>
                        {t(rec.status.toLowerCase() as Parameters<typeof t>[0])}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end">
                        <button onClick={() => openEdit(rec)} className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors">
                          <Edit2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Import modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{lang === 'ar' ? 'استيراد ملف البصمة' : 'Import Fingerprint File'}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{lang === 'ar' ? 'ملف .dat من جهاز ZKTeco' : 'ZKTeco .dat attendance file'}</p>
              </div>
              <button onClick={() => setShowImport(false)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-8 cursor-pointer hover:border-teal-400 hover:bg-teal-50/30 transition-colors group">
                <FileUp size={32} className="text-slate-300 group-hover:text-teal-500 mb-2 transition-colors" />
                <span className="text-sm font-semibold text-slate-600 group-hover:text-teal-700">
                  {lang === 'ar' ? 'اضغط لاختيار الملف' : 'Click to select file'}
                </span>
                <span className="text-xs text-slate-400 mt-1">.dat</span>
                <input ref={fileRef} type="file" accept=".dat,.txt" className="hidden" />
              </label>

              {importResult && (
                <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">{lang === 'ar' ? 'السجلات المستوردة' : 'Records imported'}</span>
                    <span className="font-bold text-green-600">{importResult.created}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">{lang === 'ar' ? 'إجمالي السطور' : 'Total lines'}</span>
                    <span className="font-semibold text-slate-700">{importResult.totalLines}</span>
                  </div>
                  {importResult.unmatched > 0 && (
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">{lang === 'ar' ? 'أرقام غير مطابقة' : 'Unmatched IDs'}</span>
                        <span className="font-semibold text-amber-600">{importResult.unmatched}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{importResult.unmatchedNums.join(', ')}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 p-6 pt-0">
              <button onClick={() => setShowImport(false)} className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">{t('cancel')}</button>
              <button onClick={handleImport} disabled={importing} className="px-5 py-2.5 text-sm font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-xl transition-colors disabled:opacity-60 shadow-sm shadow-teal-600/30">
                {importing ? (lang === 'ar' ? 'جاري الاستيراد...' : 'Importing...') : (lang === 'ar' ? 'استيراد' : 'Import')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">{editRecordId ? (lang === 'ar' ? 'تعديل سجل الحضور' : 'Edit Record') : t('addRecord')}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              {!editRecordId && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t('employee')}</label>
                  <select value={form.employee_id} onChange={e => setForm(p => ({ ...p, employee_id: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400">
                    <option value="">{t('selectEmployee')}</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{lang === 'ar' ? e.name_ar : e.name_en}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t('date')}</label>
                <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} readOnly={!!editRecordId}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 disabled:bg-slate-50" />
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
