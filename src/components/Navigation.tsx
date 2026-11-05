import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../context/AuthContext';
import {
  CalendarDays,
  Users,
  BellRing,
  Sliders,
  Settings as SettingsIcon,
  HeartPulse,
  ClipboardList,
  Info,
} from 'lucide-react';

export const Navigation: React.FC = () => {
  const { t } = useLanguage();
  const { currentUser, isDoctor, isHealthWorker, isPatient, isAdmin } = useAuth();
  const [openAlertsCount, setOpenAlertsCount] = useState<number>(0);

  useEffect(() => {
    if (!currentUser || isPatient) return;

    const q = query(collection(db, 'alerts'), where('status', '==', 'open'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setOpenAlertsCount(snap.size);
      },
      (err) => {
        console.warn('Alerts count subscription warning:', err);
      }
    );

    return () => unsub();
  }, [currentUser, isPatient]);

  // Role-customized navigation items
  let navItems: { to: string; label: string; icon: any; badge?: number }[] = [];

  if (isPatient) {
    navItems = [
      {
        to: '/patient-portal',
        label: 'My Health',
        icon: HeartPulse,
      },
      {
        to: '/about',
        label: t.about,
        icon: Info,
      },
      {
        to: '/settings',
        label: t.settings,
        icon: SettingsIcon,
      },
    ];
  } else if (isHealthWorker) {
    navItems = [
      {
        to: '/health-worker',
        label: 'ASHA Field',
        icon: ClipboardList,
      },
      {
        to: '/patients',
        label: t.patients,
        icon: Users,
      },
      {
        to: '/alerts',
        label: t.alerts,
        icon: BellRing,
        badge: openAlertsCount,
      },
      {
        to: '/settings',
        label: t.settings,
        icon: SettingsIcon,
      },
    ];
  } else if (isAdmin) {
    navItems = [
      {
        to: '/rounds',
        label: t.rounds,
        icon: CalendarDays,
      },
      {
        to: '/admin',
        label: t.admin,
        icon: Sliders,
      },
      {
        to: '/patients',
        label: t.patients,
        icon: Users,
      },
      {
        to: '/alerts',
        label: t.alerts,
        icon: BellRing,
        badge: openAlertsCount,
      },
      {
        to: '/settings',
        label: t.settings,
        icon: SettingsIcon,
      },
    ];
  } else {
    // Default / Doctor
    navItems = [
      {
        to: '/rounds',
        label: t.rounds,
        icon: CalendarDays,
      },
      {
        to: '/patients',
        label: t.patients,
        icon: Users,
      },
      {
        to: '/alerts',
        label: t.alerts,
        icon: BellRing,
        badge: openAlertsCount,
      },
      {
        to: '/settings',
        label: t.settings,
        icon: SettingsIcon,
      },
    ];
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-lg safe-area-bottom">
      <div
        className={`max-w-md mx-auto grid h-16 ${
          navItems.length === 3
            ? 'grid-cols-3'
            : navItems.length === 4
            ? 'grid-cols-4'
            : 'grid-cols-5'
        }`}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 select-none transition-colors relative min-h-[48px] py-1 ${
                  isActive
                    ? 'text-teal-700 font-bold'
                    : 'text-slate-500 hover:text-slate-900 font-medium'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="relative">
                    <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.4px]' : 'stroke-[1.8px]'}`} />
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="absolute -top-1.5 -right-2 bg-rose-600 text-white text-[10px] font-bold rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center shadow-xs">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] leading-none tracking-tight">{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
