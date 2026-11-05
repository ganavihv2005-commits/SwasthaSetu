import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Lock, AlertCircle, X, Loader2 } from 'lucide-react';

export const ReauthModal: React.FC = () => {
  const {
    reauthModalOpen,
    reauthReason,
    cancelReauth,
    performReauthWithPassword,
    performReauthWithGoogle,
    firebaseUser,
  } = useAuth();

  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!reauthModalOpen) return null;

  const isGoogleUser = firebaseUser?.providerData.some((p) => p.providerId === 'google.com');

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError(null);
    const success = await performReauthWithPassword(password);
    setLoading(false);
    if (!success) {
      setError('Invalid password. Please check and try again.');
    }
  };

  const handleGoogleSubmit = async () => {
    setLoading(true);
    setError(null);
    const success = await performReauthWithGoogle();
    setLoading(false);
    if (!success) {
      setError('Google re-authentication failed.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-sm rounded-3xl bg-white border border-slate-200 p-5 shadow-xl space-y-4">
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <button
            onClick={cancelReauth}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <h3 className="text-base font-bold text-slate-900">Security Verification</h3>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            {reauthReason || 'Please verify your identity to perform this administrative action.'}
          </p>
        </div>

        {error && (
          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isGoogleUser ? (
          <div className="space-y-3">
            <button
              onClick={handleGoogleSubmit}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm with Google'}
            </button>
            <button
              onClick={cancelReauth}
              className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        ) : (
          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Enter your account password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-teal-600"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={cancelReauth}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Verify</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
