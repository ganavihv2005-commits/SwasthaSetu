import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNetwork } from '../context/NetworkContext';
import { useLanguage } from '../i18n/LanguageContext';
import { PWAInstallButton } from './PWAInstallButton';
import {
  Activity,
  Wifi,
  WifiOff,
  RefreshCw,
  LogOut,
  Globe,
  Stethoscope,
  ShieldCheck,
  User,
  Heart,
} from 'lucide-react';

export const Header: React.FC = () => {
  const { currentUser, signOut, isDoctor, isHealthWorker, isPatient, isAdmin } = useAuth();
  const { isOnline, isSimulatedOffline, pendingSyncCount, syncNow, isSyncing, syncStatus } = useNetwork();
  const { language, setLanguage, t } = useLanguage();

  const getRoleBadge = () => {
    if (!currentUser) return null;
    const roleMap: Record<string, { label: string; bg: string }> = {
      doctor: { label: 'Dr. Ravi (Doctor)', bg: 'bg-teal-50 text-teal-800 border-teal-200' },
      healthWorker: { label: 'Health Worker', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
      patient: { label: 'Patient Portal', bg: 'bg-purple-50 text-purple-800 border-purple-200' },
      admin: { label: 'Admin', bg: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
      pending: { label: 'Pending Approval', bg: 'bg-amber-50 text-amber-800 border-amber-200' },
    };
    return roleMap[currentUser.role] || { label: currentUser.role, bg: 'bg-slate-100 text-slate-800 border-slate-200' };
  };

  const badge = getRoleBadge();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      {/* Offline banner */}
      {isSimulatedOffline && (
        <div className="bg-amber-600 text-white px-3 py-1 text-center text-xs font-semibold flex items-center justify-center gap-2 shadow-inner">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>{t.simulatedOfflineBanner || 'Simulated Offline Mode Active'}</span>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-3.5 py-2.5">
        <div className="flex items-center justify-between gap-2">
          {/* Brand */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white shrink-0 shadow-xs">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-bold text-slate-900 tracking-tight leading-tight truncate">
                  {t.appName}
                </h1>
                {badge && (
                  <span className={`text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded-sm border ${badge.bg}`}>
                    {badge.label}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 truncate leading-tight hidden xs:block">
                {currentUser?.email || currentUser?.name || 'Offline Guest'}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Sync status indicator */}
            <button
              onClick={syncNow}
              disabled={isSyncing}
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg border font-medium transition-colors ${
                syncStatus === 'syncing'
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : syncStatus === 'saved_on_device'
                  ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
              title={
                syncStatus === 'saved_on_device'
                  ? `${pendingSyncCount} changes saved locally, waiting for network`
                  : syncStatus === 'syncing'
                  ? 'Syncing with Firestore...'
                  : 'All changes synced with cloud'
              }
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  isSyncing || syncStatus === 'syncing'
                    ? 'animate-spin text-teal-600'
                    : syncStatus === 'saved_on_device'
                    ? 'text-amber-600'
                    : 'text-emerald-600'
                }`}
              />
              <span className="font-semibold text-[11px]">
                {syncStatus === 'saved_on_device'
                  ? 'Saved Local'
                  : syncStatus === 'syncing'
                  ? 'Syncing'
                  : 'Synced'}
              </span>
            </button>

            {/* Online / Offline status */}
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border ${
                isSimulatedOffline
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : isOnline
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
              title={isSimulatedOffline ? 'Simulated Offline Mode' : isOnline ? 'Online - Cloud Firestore' : 'Offline - Multi-tab Local Cache Active'}
            >
              {isSimulatedOffline ? (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-700" />
                  <span className="hidden xs:inline">Offline (Sim)</span>
                </>
              ) : isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden xs:inline">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-rose-600" />
                  <span className="hidden xs:inline">Offline</span>
                </>
              )}
            </div>

            {/* Language Switcher */}
            <div className="relative inline-flex items-center">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
                aria-label={t.language || 'Language'}
                className="appearance-none bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-semibold text-xs rounded-lg pl-2 pr-5 py-1 focus:outline-teal-600 cursor-pointer"
              >
                <option value="en">EN</option>
                <option value="hi">हिंदी</option>
                <option value="kn">ಕನ್ನಡ</option>
              </select>
              <Globe className="w-3 h-3 text-slate-500 absolute right-1.5 pointer-events-none" />
            </div>

            {/* Sign Out Button */}
            {currentUser && (
              <button
                type="button"
                onClick={signOut}
                className="flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold cursor-pointer"
                title="Sign out of current account"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.logout || t.signOut || 'Sign Out'}</span>
              </button>
            )}

            {/* Install Button */}
            <PWAInstallButton />
          </div>
        </div>
      </div>
    </header>
  );
};
