import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { useNetwork } from '../context/NetworkContext';
import { useAuth } from '../context/AuthContext';
import { loadDemoDataset, clearDemoDataset, hasDemoData } from '../services/demoDataService';
import {
  Settings as SettingsIcon,
  Globe,
  WifiOff,
  RotateCcw,
  Check,
  ShieldCheck,
  Info,
  Database,
  Trash2,
  Lock,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const { isSimulatedOffline, toggleSimulateOffline } = useNetwork();
  const { currentUser, isAdmin } = useAuth();

  const [demoDataActive, setDemoDataActive] = useState<boolean>(false);
  const [loadingDemoToggle, setLoadingDemoToggle] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    hasDemoData().then(setDemoDataActive);
  }, []);

  const handleToggleDemoData = async () => {
    if (!isAdmin) {
      alert('Only Administrators can load or clear the synthetic demo dataset.');
      return;
    }

    setLoadingDemoToggle(true);
    try {
      if (demoDataActive) {
        await clearDemoDataset();
        setDemoDataActive(false);
        setFeedback('Demo dataset cleared from Firestore. Database returned to empty state.');
      } else {
        await loadDemoDataset(currentUser?.name || 'Admin');
        setDemoDataActive(true);
        setFeedback('Demo dataset loaded with 30 synthetic patients and hero patient Rameshwar Mahto.');
      }
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      console.error('Failed to toggle demo data:', err);
      setFeedback('Failed to update demo data: ' + (err.message || ''));
    } finally {
      setLoadingDemoToggle(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-3.5 py-4 space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-teal-600" />
          <span>{t.settings}</span>
        </h2>
        <p className="text-xs text-slate-500">
          Application configuration, offline demonstration controls & language selection
        </p>
      </div>

      {feedback && (
        <div className="rounded-xl bg-emerald-600 text-white p-2.5 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <Check className="w-4 h-4" />
          <span>{feedback}</span>
        </div>
      )}

      {/* 1. Language Toggle */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">{t.language || 'Language'}</h3>
            <p className="text-xs text-slate-500">Select interface language for traveling healthcare providers</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1">
          {[
            { code: 'en', label: 'English', sub: 'Default' },
            { code: 'hi', label: 'हिंदी (Hindi)', sub: 'झारखंड / Rural' },
            { code: 'kn', label: 'ಕನ್ನಡ (Kannada)', sub: 'South Extension' },
          ].map((lang) => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code as any)}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer min-h-[56px] ${
                language === lang.code
                  ? 'bg-teal-50 border-teal-600 text-teal-900 ring-1 ring-teal-600'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <p className="text-xs font-bold leading-tight">{lang.label}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{lang.sub}</p>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Simulate Offline Toggle */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isSimulatedOffline ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>
              <WifiOff className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{t.simulatedOffline || 'Simulated Offline Mode'}</h3>
              <p className="text-xs text-slate-500">Demonstration mode: cuts network calls & tests local cache fallback</p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isSimulatedOffline}
              onChange={toggleSimulateOffline}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600" />
          </label>
        </div>

        <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed">
          When <strong>Simulate Offline</strong> is ON, SwasthaSetu disconnects from Firestore cloud communication. The app continues serving and saving records locally via Firestore multi-tab offline cache, and Gemini briefs fall back immediately to deterministic regional templates.
        </p>
      </div>

      {/* 3. Demo Data Management (Admin-governed) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${demoDataActive ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-700'}`}>
              <Database className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Synthetic Demo Data</h3>
                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                  demoDataActive ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-600'
                }`}>
                  {demoDataActive ? 'Active (30 Patients)' : 'Empty DB'}
                </span>
              </div>
              <p className="text-xs text-slate-500">Admin-only control to populate or clear synthetic hackathon records</p>
            </div>
          </div>

          {isAdmin ? (
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={demoDataActive}
                onChange={handleToggleDemoData}
                disabled={loadingDemoToggle}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600 disabled:opacity-50" />
            </label>
          ) : (
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5" />
              <span>Admin only</span>
            </span>
          )}
        </div>

        <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed">
          {demoDataActive ? (
            <>
              <strong>Demo Data is currently ACTIVE:</strong> 30 synthetic chronic patients with 6 months of historical vitals and the hero case (Rameshwar Mahto) are stored in Firestore with <code className="text-teal-700 font-mono">isDemo: true</code>.
            </>
          ) : (
            <>
              <strong>Clean Database:</strong> The database starts empty by default. No fake patients appear unless Demo data is toggled on by an Administrator.
            </>
          )}
        </p>

        {isAdmin && (
          <div className="pt-1">
            <button
              onClick={handleToggleDemoData}
              disabled={loadingDemoToggle}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer min-h-[44px] flex items-center justify-center gap-1.5"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${loadingDemoToggle ? 'animate-spin' : ''}`} />
              <span>
                {loadingDemoToggle
                  ? 'Updating Firestore...'
                  : demoDataActive
                  ? 'Clear Synthetic Demo Dataset'
                  : 'Load 30 Synthetic Patients Dataset'}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* 4. About & Documentation Link */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
            <Info className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Architecture & Responsible AI Notes</h4>
            <p className="text-[11px] text-slate-500">Firebase Firestore backend, offline cache & privacy</p>
          </div>
        </div>
        <Link
          to="/about"
          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold"
        >
          Read
        </Link>
      </div>
    </div>
  );
};
