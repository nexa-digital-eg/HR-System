'use client';

import { Bell } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { JWTPayload, UserRole } from '@/lib/types';
import { useState, useEffect } from 'react';

interface HeaderProps { user: JWTPayload; title?: string; }

const roleColors: Record<UserRole, { bg: string; text: string }> = {
  SUPER_ADMIN:        { bg: 'rgba(153,27,27,0.12)',  text: '#B91C1C' },
  HR_MANAGER:         { bg: 'rgba(153,27,27,0.08)',  text: '#991B1B' },
  DEPARTMENT_MANAGER: { bg: 'rgba(100,116,139,0.12)', text: '#475569' },
  FINANCE:            { bg: 'rgba(5,150,105,0.1)',   text: '#059669' },
  EMPLOYEE:           { bg: 'rgba(100,116,139,0.1)', text: '#64748b' },
};

const roleKeyMap: Record<UserRole, Parameters<ReturnType<typeof useLanguage>['t']>[0]> = {
  SUPER_ADMIN:        'superAdmin',
  HR_MANAGER:         'hrManager',
  DEPARTMENT_MANAGER: 'departmentManager',
  FINANCE:            'finance',
  EMPLOYEE:           'employee',
};

export default function Header({ user, title }: HeaderProps) {
  const { t, lang } = useLanguage();
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    fetch('/api/notifications?unread=true')
      .then(r => r.json())
      .then(d => setNotifCount(d.count || 0))
      .catch(() => {});
  }, []);

  const displayName = lang === 'ar' ? user.name_ar : user.name_en;
  const roleStyle = roleColors[user.role];

  return (
    <header className="h-[62px] bg-white flex items-center justify-between px-6 sticky top-0 z-30 shrink-0"
      style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 12px rgba(0,0,0,0.04)' }}>
      <div>
        {title ? (
          <h1 className="text-[15px] font-bold text-slate-800">{title}</h1>
        ) : (
          <div>
            <p className="text-[14px] font-bold text-slate-800">
              {lang === 'ar' ? 'أهلاً، ' : 'Hello, '}
              <span style={{ color: '#991B1B' }}>{displayName}</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
              }).format(new Date())}
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Notifications */}
        <button className="relative p-2 rounded-xl transition-colors hover:bg-slate-50">
          <Bell size={18} style={{ color: '#64748b' }} />
          {notifCount > 0 && (
            <span className="absolute top-1.5 end-1.5 w-3.5 h-3.5 rounded-full text-white text-[9px] font-bold flex items-center justify-center"
              style={{ background: '#B91C1C', boxShadow: '0 0 6px rgba(185,28,28,0.5)' }}>
              {notifCount > 9 ? '9+' : notifCount}
            </span>
          )}
        </button>

        <div className="w-px h-5 mx-1" style={{ background: 'rgba(0,0,0,0.08)' }} />

        {/* User info */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ background: 'linear-gradient(135deg, #991B1B, #B91C1C)', boxShadow: '0 2px 8px rgba(153,27,27,0.35)' }}>
            {displayName?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="hidden sm:block">
            <p className="text-[13px] font-semibold text-slate-800 leading-tight">{displayName}</p>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{ background: roleStyle.bg, color: roleStyle.text }}>
              {(lang === 'ar' ? user.position_name_ar : user.position_name_en) || t(roleKeyMap[user.role])}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
