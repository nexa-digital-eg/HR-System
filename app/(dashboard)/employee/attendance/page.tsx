'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/lib/i18n';
import { Clock } from 'lucide-react';

interface AttendanceRecord {
  id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  work_hours: number | null;
  status: string;
  source: string;
}

const STATUS_COLORS: Record<string, string> = {
  PRESENT: 'bg-green-100 text-green-700',
  LATE: 'bg-amber-100 text-amber-700',
  ABSENT: 'bg-red-100 text-red-700',
  HALF_DAY: 'bg-orange-100 text-orange-700',
  LEAVE: 'bg-blue-100 text-blue-700',
};

const MONTHS = [1,2,3,4,5,6,7,8,9,10,11,12];

export default function EmployeeAttendancePage() {
  const { t, lang } = useLanguage();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  useEffect(() => {
    setLoading(true);
    fetch(`/api/attendance?month=${month}&year=${year}&limit=100`)
      .then(r => r.json())
      .then(d => { setRecords(d.data || []); setLoading(false); });
  }, [month, year]);

  const formatTime = (iso: string | null) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const monthName = (m: number) => new Date(2024, m - 1, 1).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { month: 'long' });

  const summary = {
    present: records.filter(r => r.status === 'PRESENT').length,
    late: records.filter(r => r.status === 'LATE').length,
    absent: records.filter(r => r.status === 'ABSENT').length,
    totalHours: records.reduce((s, r) => s + (r.work_hours || 0), 0),
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t('myAttendance')}</h1>
        <p className="text-slate-500 text-sm mt-0.5">{records.length} {t('records')}</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-wrap gap-3">
        <select value={month} onChange={e => setMonth(Number(e.target.value))}
          className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400">
          {MONTHS.map(m => <option key={m} value={m}>{monthName(m)}</option>)}
        </select>
        <select value={year} onChange={e => setYear(Number(e.target.value))}
          className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400">
          {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Summary cards */}
      {records.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: t('present'), value: summary.present, color: 'text-green-600 bg-green-50' },
            { label: t('late'), value: summary.late, color: 'text-amber-600 bg-amber-50' },
            { label: t('absent'), value: summary.absent, color: 'text-red-600 bg-red-50' },
            { label: t('totalHours'), value: `${summary.totalHours.toFixed(1)}h`, color: 'text-blue-600 bg-blue-50' },
          ].map(card => (
            <div key={card.label} className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm">
              <p className={`text-2xl font-bold ${card.color.split(' ')[0]}`}>{card.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{card.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('date')}</th>
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
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <Clock size={32} className="text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-400">{t('noAttendanceRecords')}</p>
                  </td>
                </tr>
              ) : (
                records.map(rec => (
                  <tr key={rec.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-slate-800">
                      {new Date(rec.date).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
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
    </div>
  );
}
