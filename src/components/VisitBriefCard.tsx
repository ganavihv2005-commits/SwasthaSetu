import React, { useState, useEffect } from 'react';
import { type Patient } from '../types';
import { generateVisitBrief, type VisitBriefResult } from '../services/briefService';
import { useLanguage } from '../i18n/LanguageContext';
import { useNetwork } from '../context/NetworkContext';
import {
  Sparkles,
  FileText,
  RotateCw,
  ChevronDown,
  ChevronUp,
  Cpu,
  Database,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';

interface VisitBriefCardProps {
  patient: Patient;
}

export const VisitBriefCard: React.FC<VisitBriefCardProps> = ({ patient }) => {
  const { t, language } = useLanguage();
  const { effectiveOffline } = useNetwork();
  const [brief, setBrief] = useState<VisitBriefResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showRawFacts, setShowRawFacts] = useState(false);

  const fetchBrief = async () => {
    setLoading(true);
    try {
      const res = await generateVisitBrief(patient, {
        language,
        forceOffline: effectiveOffline,
      });
      setBrief(res);
    } catch (err) {
      console.error('Failed to generate visit brief:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrief();
  }, [patient.id, language, effectiveOffline]);

  return (
    <div className="rounded-2xl bg-gradient-to-br from-teal-900 to-slate-900 text-white p-4 sm:p-5 shadow-md relative overflow-hidden">
      {/* Background soft glow accent */}
      <div className="absolute top-0 right-0 -mr-8 -mt-8 w-36 h-36 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-teal-800/60">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-300 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
              <span>{t.visitBrief}</span>
            </h3>
            <p className="text-[11px] text-teal-200/80">
              {patient.name} ({patient.age}y, {patient.village})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {brief && (
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                brief.isAiGenerated
                  ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}
            >
              {brief.isAiGenerated ? <Cpu className="w-3 h-3" /> : <Database className="w-3 h-3" />}
              <span>{brief.isAiGenerated ? t.aiBriefBadge : t.offlineTemplateBadge}</span>
            </span>
          )}

          <button
            onClick={fetchBrief}
            disabled={loading}
            className="p-1.5 rounded-lg bg-teal-800/60 hover:bg-teal-700/80 text-teal-200 transition-colors disabled:opacity-50 cursor-pointer"
            title="Refresh brief"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="mt-3 text-xs sm:text-sm text-slate-100 leading-relaxed font-normal min-h-[48px]">
        {loading ? (
          <div className="flex items-center gap-2 text-teal-200 py-3">
            <div className="w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
            <span>Generating structured visit brief...</span>
          </div>
        ) : brief ? (
          <p className="tracking-wide">{brief.summary}</p>
        ) : (
          <p className="text-slate-300">No brief available.</p>
        )}
      </div>

      {/* Safety Notice & Raw Facts Toggle */}
      <div className="mt-3.5 pt-2.5 border-t border-teal-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-teal-200/80">
        <div className="flex items-center gap-1.5 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-400 shrink-0" />
          <span>{t.decisionSupportOnly}</span>
        </div>

        {brief && (
          <button
            onClick={() => setShowRawFacts(!showRawFacts)}
            className="flex items-center gap-1 text-teal-300 hover:text-white underline underline-offset-2 transition-colors cursor-pointer"
          >
            <span>{showRawFacts ? 'Hide Raw Clinical Facts' : 'View Grounding Facts'}</span>
            {showRawFacts ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
      </div>

      {/* Expandable Grounding Facts Box */}
      {showRawFacts && brief && (
        <div className="mt-3 p-3 rounded-xl bg-slate-950/80 border border-teal-800/50 text-[11px] text-slate-300 space-y-2">
          <p className="font-bold text-teal-300 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" />
            <span>Strict Verification Boundary (Zero Hallucination Input):</span>
          </p>
          <ul className="space-y-1 list-disc list-inside text-slate-300 font-mono text-[10px]">
            <li><strong>Conditions:</strong> {brief.facts.conditions.join(', ')}</li>
            <li><strong>Last Visit:</strong> {brief.facts.lastVisitSummary}</li>
            <li><strong>Progression Trends:</strong> {brief.facts.recentTrends}</li>
            <li><strong>Alerts:</strong> {brief.facts.overdueAlerts}</li>
            <li><strong>Guideline Checks:</strong> {brief.facts.guidelineChecks}</li>
          </ul>
          <p className="text-[10px] text-slate-400 italic">
            Responsible AI Rule: Gemini is restricted to synthesize only these deterministic facts without diagnosing or adding ungrounded advice.
          </p>
        </div>
      )}
    </div>
  );
};
