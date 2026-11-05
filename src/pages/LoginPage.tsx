import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNetwork } from '../context/NetworkContext';
import { useLanguage } from '../i18n/LanguageContext';
import {
  Stethoscope,
  Globe,
  Database,
  ArrowRight,
  Mail,
  Lock,
  User,
  KeyRound,
  CheckCircle,
  AlertCircle,
  Loader2,
  Heart,
} from 'lucide-react';
import type { SupportedLanguage } from '../i18n';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    signInWithGoogle,
    signInWithEmail,
    registerWithEmail,
    linkPatientRecord,
    userProfile,
  } = useAuth();
  const { isOnline, isSimulatedOffline, effectiveOffline } = useNetwork();
  const { language, setLanguage, t } = useLanguage();

  const [mode, setMode] = useState<'signin' | 'register' | 'linkPatient'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [linkCode, setLinkCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await signInWithGoogle();
      navigate('/');
    } catch (err: any) {
      setErrorMsg(err.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      if (mode === 'signin') {
        await signInWithEmail(email, password);
      } else {
        await registerWithEmail(email, password, name);
      }
      navigate('/');
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLinkPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkCode.trim()) {
      setErrorMsg('Please enter your 6-digit link code.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await linkPatientRecord(linkCode);
      if (res.success) {
        setSuccessMsg(res.message);
        setTimeout(() => navigate('/patient-portal'), 1500);
      } else {
        setErrorMsg(res.message);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error linking code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[90vh] flex flex-col justify-center max-w-md mx-auto px-4 py-8">
      {/* Language Selector Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
          <Globe className="w-4 h-4 text-teal-600" />
          <span>Language:</span>
        </div>
        <div className="flex items-center gap-1">
          {[
            { code: 'en', label: 'English' },
            { code: 'hi', label: 'हिंदी' },
            { code: 'kn', label: 'ಕನ್ನಡ' },
          ].map((lang) => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code as SupportedLanguage)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                language === lang.code
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      {/* Brand Hero */}
      <div className="text-center space-y-2 mb-6">
        <div className="w-14 h-14 rounded-2xl bg-teal-600 text-white flex items-center justify-center mx-auto shadow-md shadow-teal-700/20">
          <Stethoscope className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">{t.appName}</h2>
        <p className="text-xs text-slate-600 max-w-xs mx-auto leading-relaxed">
          {t.loginSubtitle}
        </p>
      </div>

      {/* Offline Persistence Status */}
      <div className="rounded-xl bg-teal-50/80 border border-teal-200 p-3 mb-5 text-xs text-teal-900 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-teal-700" />
          <span className="font-bold">
            {effectiveOffline ? t.savedOnDevice : t.syncedWithCloud}
          </span>
        </div>
        <span className={`w-2 h-2 rounded-full ${effectiveOffline ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`} />
      </div>

      {/* Error or Success feedback */}
      {errorMsg && (
        <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span className="leading-snug">{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span className="leading-snug">{successMsg}</span>
        </div>
      )}

      {/* Auth Card */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
        {/* Tab switchers */}
        <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setErrorMsg(null);
            }}
            className={`py-1.5 rounded-lg transition-all cursor-pointer ${
              mode === 'signin' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMsg(null);
            }}
            className={`py-1.5 rounded-lg transition-all cursor-pointer ${
              mode === 'register' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Register
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('linkPatient');
              setErrorMsg(null);
            }}
            className={`py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
              mode === 'linkPatient' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Heart className="w-3 h-3 text-rose-500" />
            <span>Patient</span>
          </button>
        </div>

        {/* 1. Sign In & Register Form */}
        {mode !== 'linkPatient' ? (
          <form onSubmit={handleEmailAuth} className="space-y-3 pt-1">
            {mode === 'register' && (
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Dr. Ramesh / Sunita Murmu"
                    className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-teal-600"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">{t.email}</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="doctor@example.com"
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-teal-600"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">{t.password}</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-teal-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-[0.98] min-h-[44px]"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>{mode === 'signin' ? t.signInWithEmail : t.registerStaff}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-400">
                <span className="bg-white px-2">OR</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer min-h-[44px]"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{t.signInWithGoogle}</span>
            </button>
          </form>
        ) : (
          /* 2. Patient Portal Link Code Entry */
          <form onSubmit={handleLinkPatient} className="space-y-3 pt-1">
            <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl text-xs text-teal-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-teal-700" />
                <span>Patient Portal Access</span>
              </p>
              <p className="text-[11px] text-teal-800 leading-relaxed">
                {t.enterLinkCodePrompt}
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                6-Digit Patient Link Code
              </label>
              <input
                type="text"
                required
                maxLength={10}
                value={linkCode}
                onChange={(e) => setLinkCode(e.target.value.toUpperCase())}
                placeholder="e.g. RAM789"
                className="w-full text-center text-lg font-mono font-black tracking-widest py-2.5 rounded-xl border border-slate-300 focus:outline-teal-600 uppercase"
              />
              <span className="text-[10px] text-slate-400 block text-center mt-1">
                {t.linkCodeExpires} (e.g. Try hero code: RAM789)
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>{t.linkPatientButton}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}
      </div>

      {/* Role explanation */}
      <p className="text-center text-[11px] text-slate-500 mt-5 leading-relaxed">
        {t.prototypeNotice} • {t.decisionSupportOnly}
      </p>
    </div>
  );
};
