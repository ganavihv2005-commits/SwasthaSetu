import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { ShieldCheck, Info } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  const { t } = useLanguage();

  return (
    <footer className="mt-auto border-t border-slate-200 bg-slate-100/90 text-slate-600 text-xs py-4 px-3.5 pb-20 md:pb-6">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 text-center sm:text-left">
        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
          <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
          <span>{t.prototypeNotice}</span>
          <span className="text-slate-300">•</span>
          <span>{t.decisionSupportOnly}</span>
        </div>
        <div className="flex items-center gap-3 text-slate-500">
          <span>Dr. Ravi Rural Rounds</span>
          <span className="text-slate-300">•</span>
          <Link to="/about" className="hover:text-teal-700 underline font-medium flex items-center gap-1">
            <Info className="w-3.5 h-3.5" />
            <span>{t.about}</span>
          </Link>
        </div>
      </div>
    </footer>
  );
};
