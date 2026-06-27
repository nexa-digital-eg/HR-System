'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '@/lib/i18n';
import { Play, CheckCircle, Eye, X, Edit2 } from 'lucide-react';
import { toast } from 'sonner';

interface Payslip {
  id: string;
  employees: { name_ar: string; name_en: string; employee_number: string };
  month: number;
  year: number;
  basic_salary: number;
  housing_allowance: number;
  transport_allowance: number;
  other_allowances: number;
  overtime_amount: number;
  absence_deduction: number;
  late_deduction: number;
  advance_deduction: number;
  other_deductions: number;
  net_salary: number;
  status: string;
  paid_at?: string;
}

const MONTHS = [1,2,3,4,5,6,7,8,9,10,11,12];

function calcNet(f: { basic_salary: string; housing_allowance: string; transport_allowance: string; other_allowances: string; overtime_amount: string; absence_deduction: string; late_deduction: string; advance_deduction: string; other_deductions: string }) {
  const gross = (Number(f.basic_salary) || 0) + (Number(f.housing_allowance) || 0) + (Number(f.transport_allowance) || 0) + (Number(f.other_allowances) || 0) + (Number(f.overtime_amount) || 0);
  const deductions = (Number(f.absence_deduction) || 0) + (Number(f.late_deduction) || 0) + (Number(f.advance_deduction) || 0) + (Number(f.other_deductions) || 0);
  return Math.max(0, gross - deductions);
}

export default function AdminPayrollPage() {
  const { t, lang } = useLanguage();
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [count, setCount] = useState(0);
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selected, setSelected] = useState<Payslip | null>(null);
  const [editing, setEditing] = useState<Payslip | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const fetchPayroll = useCallback(() => {
    setLoading(true);
    fetch(`/api/payroll?month=${month}&year=${year}&limit=200`)
      .then(r => r.json())
      .then(d => { setPayslips(d.data || []); setCount(d.count || 0); setLoading(false); });
  }, [month, year]);

  useEffect(() => { fetchPayroll(); }, [fetchPayroll]);

  const handleGenerate = async () => {
    if (!confirm(t('confirmGeneratePayroll'))) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, year }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`${data.count} ${lang === 'ar' ? 'قسيمة تم إنشاؤها' : 'payslips generated'}`);
      fetchPayroll();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  };

  const handleMarkPaid = async (id: string) => {
    const res = await fetch(`/api/payroll/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'PAID' }),
    });
    if (res.ok) {
      toast.success(t('markedAsPaid'));
      fetchPayroll();
      setSelected(null);
    } else toast.error(t('error'));
  };

  const openEdit = (p: Payslip) => {
    setEditForm({
      basic_salary: String(p.basic_salary),
      housing_allowance: String(p.housing_allowance || 0),
      transport_allowance: String(p.transport_allowance || 0),
      other_allowances: String(p.other_allowances || 0),
      overtime_amount: String(p.overtime_amount || 0),
      absence_deduction: String(p.absence_deduction || 0),
      late_deduction: String(p.late_deduction || 0),
      advance_deduction: String(p.advance_deduction || 0),
      other_deductions: String(p.other_deductions || 0),
    });
    setEditing(p);
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const body = Object.fromEntries(Object.entries(editForm).map(([k, v]) => [k, Number(v) || 0]));
      const res = await fetch(`/api/payroll/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(lang === 'ar' ? 'تم حفظ التعديلات' : 'Changes saved');
      setEditing(null);
      fetchPayroll();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(v);

  const monthName = (m: number) => new Date(2024, m - 1, 1).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { month: 'long' });

  const totalNet = payslips.reduce((s, p) => s + p.net_salary, 0);

  const F = ({ label, k, color }: { label: string; k: string; color?: string }) => (
    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-1">{label}</label>
      <input
        type="number"
        min={0}
        value={editForm[k] ?? '0'}
        onChange={e => setEditForm(f => ({ ...f, [k]: e.target.value }))}
        className={`w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800 ${color || ''}`}
      />
    </div>
  );

  const viewModal = selected && mounted && createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">{t('payslipDetails')}</h2>
          <button onClick={() => setSelected(null)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-3">
          <div className="text-center mb-4">
            <p className="text-slate-500 text-sm">{lang === 'ar' ? selected.employees.name_ar : selected.employees.name_en}</p>
            <p className="text-lg font-bold text-slate-900 mt-1">{monthName(selected.month)} {selected.year}</p>
          </div>
          {[
            { label: t('basicSalary'), value: selected.basic_salary },
            { label: lang === 'ar' ? 'بدل السكن' : 'Housing', value: selected.housing_allowance || 0, color: 'text-green-600' },
            { label: lang === 'ar' ? 'بدل المواصلات' : 'Transport', value: selected.transport_allowance || 0, color: 'text-green-600' },
            { label: lang === 'ar' ? 'بدلات ومكافآت أخرى' : 'Other Allowances', value: selected.other_allowances || 0, color: 'text-green-600' },
            { label: lang === 'ar' ? 'أوفرتايم' : 'Overtime', value: selected.overtime_amount || 0, color: 'text-green-600' },
            { label: lang === 'ar' ? 'خصم الغياب' : 'Absence Deduction', value: selected.absence_deduction || 0, color: 'text-red-500' },
            { label: lang === 'ar' ? 'خصم التأخير' : 'Late Deduction', value: selected.late_deduction || 0, color: 'text-red-500' },
            { label: t('advanceDeduction'), value: selected.advance_deduction || 0, color: 'text-orange-500' },
            { label: lang === 'ar' ? 'جزاءات وخصومات أخرى' : 'Penalties & Other', value: selected.other_deductions || 0, color: 'text-red-500' },
          ].map(row => row.value !== 0 ? (
            <div key={row.label} className="flex items-center justify-between py-2 border-b border-slate-50">
              <span className="text-sm text-slate-600">{row.label}</span>
              <span className={`text-sm font-semibold ${row.color || 'text-slate-800'}`}>{formatCurrency(Math.abs(row.value))}</span>
            </div>
          ) : null)}
          <div className="flex items-center justify-between py-3 bg-blue-50 rounded-xl px-4 mt-4">
            <span className="font-bold text-slate-800">{t('netSalary')}</span>
            <span className="text-xl font-bold text-blue-700">{formatCurrency(selected.net_salary)}</span>
          </div>
        </div>
        {selected.status !== 'PAID' && (
          <div className="p-6 pt-0 flex gap-3">
            <button
              onClick={() => { setSelected(null); openEdit(selected); }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
            >
              <Edit2 size={15} />
              {lang === 'ar' ? 'تعديل' : 'Edit'}
            </button>
            <button
              onClick={() => handleMarkPaid(selected.id)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors shadow-sm shadow-green-600/30"
            >
              <CheckCircle size={16} />
              {t('markAsPaid')}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );

  const editModal = editing && mounted && createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{lang === 'ar' ? 'تعديل القسيمة' : 'Edit Payslip'}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{lang === 'ar' ? editing.employees.name_ar : editing.employees.name_en} — {monthName(editing.month)} {editing.year}</p>
          </div>
          <button onClick={() => setEditing(null)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-5">
          {/* Payments */}
          <div>
            <p className="text-xs font-bold text-green-700 uppercase tracking-wider mb-3">{lang === 'ar' ? 'المدفوعات' : 'Payments'}</p>
            <div className="grid grid-cols-2 gap-3">
              <F label={lang === 'ar' ? 'الراتب الأساسي' : 'Basic Salary'} k="basic_salary" />
              <F label={lang === 'ar' ? 'بدل السكن' : 'Housing'} k="housing_allowance" />
              <F label={lang === 'ar' ? 'بدل المواصلات' : 'Transport'} k="transport_allowance" />
              <F label={lang === 'ar' ? 'بدلات ومكافآت أخرى' : 'Other Allowances'} k="other_allowances" />
              <F label={lang === 'ar' ? 'أوفرتايم' : 'Overtime'} k="overtime_amount" />
            </div>
          </div>

          {/* Deductions */}
          <div>
            <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-3">{lang === 'ar' ? 'الخصومات' : 'Deductions'}</p>
            <div className="grid grid-cols-2 gap-3">
              <F label={lang === 'ar' ? 'خصم الغياب' : 'Absence'} k="absence_deduction" />
              <F label={lang === 'ar' ? 'خصم التأخير' : 'Late'} k="late_deduction" />
              <F label={lang === 'ar' ? 'خصم السلفة' : 'Advance'} k="advance_deduction" />
              <F label={lang === 'ar' ? 'جزاءات وخصومات أخرى' : 'Penalties & Other'} k="other_deductions" />
            </div>
          </div>

          {/* Live net */}
          <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
            <span className="font-semibold text-slate-700">{lang === 'ar' ? 'صافي الراتب' : 'Net Salary'}</span>
            <span className="text-xl font-bold text-blue-700">{formatCurrency(calcNet(editForm as Parameters<typeof calcNet>[0]))}</span>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 p-6 pt-0">
          <button onClick={() => setEditing(null)} className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
            {t('cancel')}
          </button>
          <button
            onClick={handleSaveEdit}
            disabled={saving}
            className="px-5 py-2.5 text-sm font-semibold text-white rounded-xl transition-colors disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg,#991B1B,#B91C1C)', boxShadow: '0 2px 8px rgba(153,27,27,0.35)' }}
          >
            {saving ? t('saving') : t('save')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('payroll')}</h1>
          <p className="text-slate-500 text-sm mt-0.5">{count} {lang === 'ar' ? 'قسيمة' : 'payslips'}</p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg,#991B1B,#B91C1C)', boxShadow: '0 2px 8px rgba(153,27,27,0.35)' }}
        >
          <Play size={15} />
          {generating ? t('generating') : t('generatePayroll')}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-wrap gap-3 items-center">
        <select
          value={month}
          onChange={e => setMonth(Number(e.target.value))}
          className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-800/20 text-slate-700"
        >
          {MONTHS.map(m => <option key={m} value={m}>{monthName(m)}</option>)}
        </select>
        <select
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-800/20 text-slate-700"
        >
          {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        {count > 0 && (
          <div className="ms-auto bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-sm">
            <span className="text-slate-500">{t('totalNet')}:</span>{' '}
            <span className="font-bold text-slate-800">{formatCurrency(totalNet)}</span>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('employee')}</th>
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('basicSalary')}</th>
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{lang === 'ar' ? 'البدلات' : 'Allowances'}</th>
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('deductions')}</th>
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('advanceDeduction')}</th>
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('netSalary')}</th>
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('status')}</th>
                <th className="text-end px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={8} className="py-12 text-center"><div className="w-6 h-6 border-2 border-red-800 border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
              ) : payslips.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <p className="text-slate-400">{t('noPayrollGenerated')}</p>
                    <p className="text-slate-300 text-xs mt-1">{t('clickGenerateToCreate')}</p>
                  </td>
                </tr>
              ) : (
                payslips.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm" style={{ background: 'linear-gradient(135deg,#991B1B,#B91C1C)' }}>
                          <span className="text-white text-xs font-bold">
                            {(lang === 'ar' ? p.employees.name_ar : p.employees.name_en)?.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{lang === 'ar' ? p.employees.name_ar : p.employees.name_en}</p>
                          <p className="text-xs text-slate-400">{p.employees.employee_number}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{formatCurrency(p.basic_salary)}</td>
                    <td className="px-5 py-3.5 text-green-600">{formatCurrency((p.housing_allowance||0) + (p.transport_allowance||0) + (p.other_allowances||0) + (p.overtime_amount||0))}</td>
                    <td className="px-5 py-3.5 text-red-500">{formatCurrency((p.absence_deduction||0) + (p.late_deduction||0) + (p.other_deductions||0))}</td>
                    <td className="px-5 py-3.5 text-orange-500">{formatCurrency(p.advance_deduction || 0)}</td>
                    <td className="px-5 py-3.5 font-bold text-slate-900">{formatCurrency(p.net_salary)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${p.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {t(p.status.toLowerCase() as Parameters<typeof t>[0])}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-end">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setSelected(p)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors" title={lang === 'ar' ? 'عرض' : 'View'}>
                          <Eye size={15} />
                        </button>
                        {p.status !== 'PAID' && (
                          <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-700 transition-colors" title={lang === 'ar' ? 'تعديل' : 'Edit'}>
                            <Edit2 size={15} />
                          </button>
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

      {viewModal}
      {editModal}
    </div>
  );
}
