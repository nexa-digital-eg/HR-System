'use client';

import { Bell } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { JWTPayload, UserRole } from '@/lib/types';
import { useState, useEffect } from 'react';

interface HeaderProps {
  user: JWTPayload;
  title?: string;
}

const roleColors: Record<UserRole, string> = {
  SUPER_ADMIN: 'bg-purple-100 text-purple-700',
  HR_MANAGER: 'bg-blue-100 text-blue-700',
  DEPARTMENT_MANAGER: 'bg-teal-100 text-teal-700',
  FINANCE: 'bg-green-100 text-green-700',
  EMPLOYEE: 'bg-slate-100 text-slate-700',
};

const roleKeyMap: Record<UserRole, Parameters<ReturnType<typeof useLanguage>['t']>[0]> = {
  SUPER_ADMIN: 'superAdmin',
  HR_MANAGER: 'hrManager',
  DEPARTMENT_MANAGER: 'departmentManager',
  FINANCE: 'finance',
  EMPLOYEE: 'employee',
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
  const roleLabel = t(roleKeyMap[user.role]);

  return (
    <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-6 sticky top-0 z-30 shrink-0">
      <div>
        {title ? (
          <h1 className="text-lg font-bold text-slate-800">{title}</h1>
        ) : (
          <div>
            <p className="text-sm font-bold text-slate-800">
              {lang === 'ar' ? 'مرحباً، ' : 'Hello, '}
              <span className="text-blue-600">{displayName}</span>
            </p>
            <p className="text-xs text-slate-400">
              {new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
              }).format(new Date())}
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button className="relative p-2 rounded-xl hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition-colors">
          <Bell size={19} />
          {notifCount > 0 && (
            <span className="absolute top-1.5 end-1.5 w-3.5 h-3.5 bg-red-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center leading-none">
              {notifCount > 9 ? '9+' : notifCount}
            </span>
          )}
        </button>

        <div className="w-px h-6 bg-slate-100 mx-1" />

        <div className="flex items-center gap-2.5 ps-1">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shadow-sm shadow-blue-600/20">
            <span className="text-white font-bold text-xs">
              {displayName?.charAt(0)?.toUpperCase() || '?'}
            </span>
          </div>
          <div className="hidden sm:block">
            <p className="text-[13px] font-semibold text-slate-800 leading-tight">{displayName}</p>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${roleColors[user.role]}`}>
              {roleLabel}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
