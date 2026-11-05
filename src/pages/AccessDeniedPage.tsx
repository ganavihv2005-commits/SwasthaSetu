import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { ShieldAlert, ArrowLeft, Home, LogOut } from 'lucide-react';

interface AccessDeniedPageProps {
  requiredRole?: string;
}

export const AccessDeniedPage: React.FC<AccessDeniedPageProps> = ({ requiredRole }) => {
  const navigate = useNavigate();
  const { userProfile, signOut } = useAuth();
  const { t } = useLanguage();

  return (
    <div className="min-h-[70vh] flex items-center justify-center max-w-md mx-auto px-4 py-8">
      <div className="w-full rounded-3xl border border-rose-200 bg-white p-6 sm:p-8 text-center space-y-4 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-2xs">
          <ShieldAlert className="w-7 h-7" />
        </div>

        <div className="space-y-1">
          <h3 className="text-lg font-black text-slate-900 tracking-tight">{t.accessDenied}</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            {t.accessDeniedDesc}
          </p>
          <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-slate-100 text-slate-700">
            Active Role: {userProfile?.role || 'Guest'}
          </span>
        </div>

        <div className="pt-2 flex flex-col gap-2">
          <button
            onClick={() => navigate('/')}
            className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Home className="w-4 h-4" />
            <span>Return to Home Dashboard</span>
          </button>
          <button
            onClick={() => signOut()}
            className="w-full py-2 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
