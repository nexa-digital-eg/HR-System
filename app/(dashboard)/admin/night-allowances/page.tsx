'use client';

import { useState } from 'react';
import { useLanguage } from '@/lib/i18n';
import { Download, Moon, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

interface EmpSummary {
  employee_id: string;
  name_ar: string;
  name_en: string;
  employee_number: string;
  days: number;
  total: number;
  paid: number;
}

const today = new Date().toISOString().split('T')[0];
const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

export default function NightAllowancesPage() {
  const { lang } = useLanguage();
  const [from, setFrom] = useState(firstOfMonth);
  const [to, setTo] = useState(today);
  const [data, setData] = useState<EmpSummary[]>([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [grandPaid, setGrandPaid] = useState(0);
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [searched, setSearched] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/night-allowances?from=${from}&to=${to}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setData(json.data || []);
      setGrandTotal(json.grandTotal || 0);
      setGrandPaid(json.grandPaid || 0);
      setSearched(true);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async () => {
    const unpaid = data.filter(e => e.total - e.paid > 0);
    if (!unpaid.length) return toast.error(lang === 'ar' ? 'لا يوجد مبالغ غير مدفوعة' : 'No unpaid amounts');
    if (!confirm(lang === 'ar' ? `تأكيد دفع بدل السهر لـ ${unpaid.length} موظف (${grandTotal - grandPaid} جنيه)؟` : `Confirm payment for ${unpaid.length} employees (${grandTotal - grandPaid} EGP)?`)) return;

    setPaying(true);
    try {
      const res = await fetch('/api/night-allowances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from,
          to,
          employees: unpaid.map(e => ({ employee_id: e.employee_id, days_count: e.days, total_amount: e.total - e.paid })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(lang === 'ar' ? 'تم تسجيل الدفع بنجاح' : 'Payment recorded successfully');
      fetchReport();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setPaying(false);
    }
  };

  const handleExport = () => {
    if (!data.length) return;
    const headers = lang === 'ar'
      ? ['الاسم', 'رقم الموظف', 'عدد الأيام', 'الإجمالي (جنيه)', 'المدفوع (جنيه)', 'المتبقي (جنيه)']
      : ['Name', 'Employee #', 'Days', 'Total (EGP)', 'Paid (EGP)', 'Remaining (EGP)'];

    const rows = data.map(e => [
      lang === 'ar' ? e.name_ar : e.name_en,
      e.employee_number,
      e.days,
      e.total,
      e.paid,
      e.total - e.paid,
    ]);

    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `night_allowance_${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const unpaidTotal = grandTotal - grandPaid;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Moon size={22} className="text-indigo-500" />
            {lang === 'ar' ? 'بدل السهر' : 'Night Allowance'}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {lang === 'ar' ? '50 جنيه لكل يوم عمل أكثر من 12 ساعة أو وردية 24 ساعة' : '50 EGP per day for shifts over 12h or 24h shifts'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {searched && data.length > 0 && (
            <>
              <button onClick={handleExport} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm">
                <Download size={15} />
                {lang === 'ar' ? 'تصدير Excel' : 'Export Excel'}
              </button>
              {unpaidTotal > 0 && (
                <button onClick={handlePay} disabled={paying} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm disabled:opacity-60">
                  <CreditCard size={15} />
                  {paying
                    ? (lang === 'ar' ? 'جاري الدفع...' : 'Processing...')
                    : (lang === 'ar' ? `دفع ${unpaidTotal} جنيه` : `Pay ${unpaidTotal} EGP`)}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-slate-600">{lang === 'ar' ? 'من:' : 'From:'}</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-slate-600">{lang === 'ar' ? 'إلى:' : 'To:'}</label>
          <input type="date" value={to} min={from} onChange={e => setTo(e.target.value)}
            className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400" />
        </div>
        <button onClick={fetchReport} disabled={loading}
          className="px-5 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors disabled:opacity-60">
          {loading ? (lang === 'ar' ? 'جاري البحث...' : 'Loading...') : (lang === 'ar' ? 'عرض التقرير' : 'Show Report')}
        </button>
      </div>

      {/* Summary cards */}
      {searched && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
            <p className="text-xs text-slate-500 mb-1">{lang === 'ar' ? 'إجمالي بدل السهر' : 'Total Night Allowance'}</p>
            <p className="text-2xl font-bold text-slate-900">{grandTotal.toLocaleString()} <span className="text-sm font-normal text-slate-500">EGP</span></p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
            <p className="text-xs text-slate-500 mb-1">{lang === 'ar' ? 'المدفوع' : 'Paid'}</p>
            <p className="text-2xl font-bold text-green-600">{grandPaid.toLocaleString()} <span className="text-sm font-normal text-slate-500">EGP</span></p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
            <p className="text-xs text-slate-500 mb-1">{lang === 'ar' ? 'المتبقي' : 'Remaining'}</p>
            <p className="text-2xl font-bold text-amber-600">{unpaidTotal.toLocaleString()} <span className="text-sm font-normal text-slate-500">EGP</span></p>
          </div>
        </div>
      )}

      {/* Table */}
      {searched && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{lang === 'ar' ? 'الموظف' : 'Employee'}</th>
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{lang === 'ar' ? 'عدد الأيام' : 'Days'}</th>
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{lang === 'ar' ? 'الإجمالي' : 'Total'}</th>
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{lang === 'ar' ? 'المدفوع' : 'Paid'}</th>
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{lang === 'ar' ? 'المتبقي' : 'Remaining'}</th>
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-slate-400">{lang === 'ar' ? 'لا توجد بيانات بدل سهر في هذه الفترة' : 'No night allowance data for this period'}</td></tr>
              ) : data.map(emp => {
                const remaining = emp.total - emp.paid;
                return (
                  <tr key={emp.employee_id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shrink-0">
                          <span className="text-white text-xs font-bold">{(lang === 'ar' ? emp.name_ar : emp.name_en)?.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{lang === 'ar' ? emp.name_ar : emp.name_en}</p>
                          <p className="text-xs text-slate-400">{emp.employee_number}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-700">{emp.days} {lang === 'ar' ? 'يوم' : 'days'}</td>
                    <td className="px-5 py-3.5 font-semibold text-slate-900">{emp.total.toLocaleString()} EGP</td>
                    <td className="px-5 py-3.5 text-green-600 font-semibold">{emp.paid > 0 ? `${emp.paid.toLocaleString()} EGP` : '-'}</td>
                    <td className="px-5 py-3.5 font-semibold text-amber-700">{remaining > 0 ? `${remaining.toLocaleString()} EGP` : '-'}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${remaining <= 0 ? 'bg-green-100 text-green-700' : emp.paid > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                        {remaining <= 0 ? (lang === 'ar' ? 'مدفوع' : 'Paid') : emp.paid > 0 ? (lang === 'ar' ? 'جزئي' : 'Partial') : (lang === 'ar' ? 'غير مدفوع' : 'Unpaid')}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {data.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 border-t border-slate-200">
                  <td colSpan={2} className="px-5 py-3 font-bold text-slate-700">{lang === 'ar' ? 'الإجمالي' : 'Total'}</td>
                  <td className="px-5 py-3 font-bold text-slate-900">{grandTotal.toLocaleString()} EGP</td>
                  <td className="px-5 py-3 font-bold text-green-600">{grandPaid.toLocaleString()} EGP</td>
                  <td className="px-5 py-3 font-bold text-amber-700">{unpaidTotal.toLocaleString()} EGP</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}
