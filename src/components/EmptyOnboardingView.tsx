import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadDemoDataset } from '../services/demoDataService';
import {
  Stethoscope,
  UserPlus,
  Activity,
  TrendingUp,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Database,
  CheckCircle2,
} from 'lucide-react';

interface EmptyOnboardingViewProps {
  onDataLoaded?: () => void;
  villageName?: string;
}

export const EmptyOnboardingView: React.FC<EmptyOnboardingViewProps> = ({
  onDataLoaded,
  villageName = 'Kasmar',
}) => {
  const navigate = useNavigate();
  const [loadingDemo, setLoadingDemo] = useState(false);

  const handleLoadDemo = async () => {
    setLoadingDemo(true);
    try {
      await loadDemoDataset('Onboarding QuickStart');
      if (onDataLoaded) {
        onDataLoaded();
      }
    } catch (err) {
      console.error('Failed to load demo data:', err);
    } finally {
      setLoadingDemo(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7 shadow-xs space-y-6">
      {/* Welcome Banner */}
      <div className="text-center max-w-lg mx-auto space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center mx-auto shadow-2xs">
          <Stethoscope className="w-7 h-7" />
        </div>
        <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
          Welcome to SwasthaSetu
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          Your offline clinic is active and ready for field rounds. Follow the three steps below to start managing chronic patients in <strong>{villageName}</strong>.
        </p>
      </div>

      {/* Guided 3 Steps */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Step 1 */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center">
                1
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-teal-600" />
                Consent
              </span>
            </div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900">
              Register First Patient
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Obtain oral/written consent in the local dialect. Enter demographic details and chronic conditions (Hypertension, Diabetes).
            </p>
          </div>

          <button
            onClick={() => navigate('/new-patient')}
            className="w-full py-2.5 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[40px]"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Register Patient</span>
          </button>
        </div>

        {/* Step 2 */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center">
                2
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                Baseline
              </span>
            </div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900">
              Record Baseline Visit
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Log resting blood pressure, fasting glucose, weight, symptom chips, and medication prescriptions during village rounds.
            </p>
          </div>

          <div className="text-[11px] text-slate-500 bg-white p-2.5 rounded-xl border border-slate-200 text-center font-medium">
            Available once patient is registered
          </div>
        </div>

        {/* Step 3 */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center">
                3
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                Slope Watch
              </span>
            </div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900">
              Progression Watch Active
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Between-visit monitoring by ASHA health workers. Once 3 readings accumulate, SwasthaSetu computes linear slope to flag who is worsening.
            </p>
          </div>

          <div className="text-[11px] text-slate-500 bg-white p-2.5 rounded-xl border border-slate-200 text-center font-medium">
            Requires ≥ 3 readings (never guesses)
          </div>
        </div>
      </div>

      {/* Demo Data Quick-Start Section */}
      <div className="rounded-2xl border border-teal-200 bg-teal-50/70 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="space-y-1">
          <p className="font-bold text-teal-950 flex items-center gap-1.5 text-xs sm:text-sm">
            <Sparkles className="w-4 h-4 text-teal-600 shrink-0" />
            <span>Exploring for a demonstration or test?</span>
          </p>
          <p className="text-teal-800 leading-relaxed text-[11px] sm:text-xs">
            You can load 30 synthetic rural patients with 6 months of historical visits, trend charts, and the hero worsening case (Rameshwar Mahto).
          </p>
        </div>

        <button
          onClick={handleLoadDemo}
          disabled={loadingDemo}
          className="shrink-0 py-2.5 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-xs flex items-center gap-2 transition-transform active:scale-95 cursor-pointer min-h-[40px] disabled:opacity-50"
        >
          <Database className="w-3.5 h-3.5" />
          <span>{loadingDemo ? 'Loading Demo Data...' : 'Load Demo Patients'}</span>
        </button>
      </div>
    </div>
  );
};
