import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { Clock, ShieldCheck, LogOut, RefreshCw } from 'lucide-react';

export const PendingApprovalPage: React.FC = () => {
  const { userProfile, signOut } = useAuth();
  const { t } = useLanguage();

  return (
    <div className="min-h-[70vh] flex items-center justify-center max-w-md mx-auto px-4 py-8">
      <div className="w-full rounded-3xl border border-amber-200 bg-white p-6 sm:p-8 text-center space-y-4 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-2xs">
          <Clock className="w-7 h-7" />
        </div>

        <div className="space-y-1.5">
          <h3 className="text-lg font-black text-slate-900 tracking-tight">
            {t.pendingApprovalTitle}
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            {t.pendingApprovalDesc}
          </p>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs space-y-1">
          <div className="flex justify-between text-slate-500">
            <span>Name:</span>
            <span className="font-bold text-slate-800">{userProfile?.name}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Email:</span>
            <span className="font-bold text-slate-800">{userProfile?.email}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Status:</span>
            <span className="font-bold uppercase text-amber-600">Pending Admin Approval</span>
          </div>
        </div>

        <p className="text-[11px] text-slate-400">
          Once an administrator assigns your role, this screen will refresh automatically.
        </p>

        <button
          onClick={() => signOut()}
          className="w-full py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};
