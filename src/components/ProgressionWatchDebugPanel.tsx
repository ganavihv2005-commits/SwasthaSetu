import React, { useState } from 'react';
import { type PatientRiskEvaluation, type ParameterTrend } from '../services/riskService';
import {
  Calculator,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Activity,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  Code2,
  Table,
} from 'lucide-react';

interface ProgressionWatchDebugPanelProps {
  evaluation: PatientRiskEvaluation;
  defaultExpanded?: boolean;
}

export const ProgressionWatchDebugPanel: React.FC<ProgressionWatchDebugPanelProps> = ({
  evaluation,
  defaultExpanded = true,
}) => {
  const [expanded, setExpanded] = useState<boolean>(defaultExpanded);
  const [selectedParamIndex, setSelectedParamIndex] = useState<number>(0);

  const isHero = evaluation.isHeroPatient;
  const validTrends = evaluation.parameterTrends.filter((t) => t.status !== 'insufficient_data');
  const activeTrends = validTrends.length > 0 ? validTrends : evaluation.parameterTrends;
  const currentTrend: ParameterTrend | undefined = activeTrends[selectedParamIndex] || activeTrends[0];

  return (
    <div className="rounded-2xl border-2 border-teal-500/40 bg-white shadow-md overflow-hidden transition-all">
      {/* Header bar */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="p-4 bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white flex items-center justify-between cursor-pointer select-none"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-400/40 text-teal-300 flex items-center justify-center shrink-0">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                <span>Progression Watch Mathematical Debug Panel</span>
              </h3>
              {isHero && (
                <span className="text-[10px] uppercase font-black tracking-wider bg-rose-500 text-white px-2 py-0.5 rounded-full shadow-2xs">
                  Hero Patient Target
                </span>
              )}
            </div>
            <p className="text-[11px] text-teal-200/80">
              Verified linear slope formula, last 4 readings & guideline classification
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
              evaluation.status === 'Worsening'
                ? 'bg-rose-500/30 text-rose-300 border-rose-500/50'
                : evaluation.status === 'Watch'
                ? 'bg-amber-500/30 text-amber-300 border-amber-500/50'
                : 'bg-emerald-500/30 text-emerald-300 border-emerald-500/50'
            }`}
          >
            {evaluation.status.toUpperCase()}
          </span>
          <button className="text-teal-300 hover:text-white p-1">
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-4 sm:p-5 space-y-4 bg-slate-50/60 text-slate-800 text-xs">
          {/* Summary Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Final Patient Status
              </span>
              <p
                className={`text-base font-black mt-1 ${
                  evaluation.status === 'Worsening'
                    ? 'text-rose-700'
                    : evaluation.status === 'Watch'
                    ? 'text-amber-700'
                    : 'text-emerald-700'
                }`}
              >
                {evaluation.status}
              </p>
              <span className="text-[10px] text-slate-500">
                {evaluation.status === 'Worsening'
                  ? '7-Day Follow-up & Deterioration Alert'
                  : evaluation.status === 'Watch'
                  ? '14-Day Observation Interval'
                  : '30-Day Routine Chronic Interval'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Slope Classification Rule
              </span>
              <p className="text-xs font-bold text-slate-800 mt-1 line-clamp-2">
                {currentTrend?.classificationRule || 'Linear Regression over last 4 points'}
              </p>
              <span className="text-[10px] text-teal-700 font-medium">
                Slope &gt; 0 and Value &gt; TargetMax = Worsening
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Guideline Authority
              </span>
              <p className="text-xs font-bold text-slate-800 mt-1 truncate" title={currentTrend?.guidelineSource}>
                {currentTrend?.guidelineSource || 'National Guidelines [Demo]'}
              </p>
              <span className="text-[10px] text-amber-700 font-semibold">
                Demo values, replace with guideline ranges
              </span>
            </div>
          </div>

          {/* Parameter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 scrollbar-none">
            {activeTrends.map((trend, idx) => (
              <button
                key={trend.parameter}
                onClick={() => setSelectedParamIndex(idx)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  selectedParamIndex === idx
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>{trend.parameterName}</span>
                <span
                  className={`ml-1.5 px-1.5 py-0.2 rounded text-[10px] ${
                    trend.status === 'worsening'
                      ? 'bg-rose-100 text-rose-900'
                      : trend.status === 'watch' || trend.status === 'improving'
                      ? 'bg-amber-100 text-amber-900'
                      : trend.status === 'stable'
                      ? 'bg-emerald-100 text-emerald-900'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {trend.status.toUpperCase()}
                </span>
              </button>
            ))}
          </div>

          {currentTrend && (
            <div className="space-y-4">
              {/* Section 1: Last 4 Readings Table */}
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Table className="w-3.5 h-3.5 text-teal-600" />
                    <span>
                      1. Last {currentTrend.readings.length} Chronological Readings for {currentTrend.parameterName}
                    </span>
                  </h4>
                  <span className="text-[11px] text-slate-500 font-medium">
                    (Target Range: {currentTrend.targetMin} – {currentTrend.targetMax} {currentTrend.unit})
                  </span>
                </div>

                {currentTrend.readings.length === 0 ? (
                  <p className="text-slate-500 italic">No historical readings found.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-2.5">Index (x)</th>
                          <th className="py-2 px-2.5">Date</th>
                          <th className="py-2 px-2.5">Recorded Value (y)</th>
                          <th className="py-2 px-2.5">Source Provider</th>
                          <th className="py-2 px-2.5">Guideline Position</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {currentTrend.readings.map((r, rIdx) => {
                          const isLatest = rIdx === currentTrend.readings.length - 1;
                          const isHigh = r.value > currentTrend.targetMax;
                          const isLow = r.value < currentTrend.targetMin;

                          return (
                            <tr
                              key={rIdx}
                              className={isLatest ? 'bg-teal-50/60 font-semibold' : 'hover:bg-slate-50/50'}
                            >
                              <td className="py-2 px-2.5 text-slate-600">x_{rIdx} = {rIdx}</td>
                              <td className="py-2 px-2.5 text-slate-900">{r.displayDate}</td>
                              <td className="py-2 px-2.5">
                                <span className="font-bold text-slate-900 text-sm">
                                  {r.value} {currentTrend.unit}
                                </span>
                                {isLatest && (
                                  <span className="ml-1.5 text-[9px] bg-teal-600 text-white px-1.5 py-0.5 rounded-full font-sans uppercase">
                                    Latest
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-2.5 font-sans">
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${
                                    r.source === 'visit'
                                      ? 'bg-teal-100 text-teal-900'
                                      : 'bg-amber-100 text-amber-900'
                                  }`}
                                >
                                  {r.source === 'visit' ? 'Clinic Encounter' : 'Between-Visit Reading (ASHA)'}
                                </span>
                              </td>
                              <td className="py-2 px-2.5 font-sans">
                                {isHigh ? (
                                  <span className="text-rose-700 font-bold text-[11px]">
                                    ▲ Above Max ({currentTrend.targetMax})
                                  </span>
                                ) : isLow ? (
                                  <span className="text-amber-700 font-bold text-[11px]">
                                    ▼ Below Min ({currentTrend.targetMin})
                                  </span>
                                ) : (
                                  <span className="text-emerald-700 font-semibold text-[11px]">
                                    ✓ Inside Range
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Section 2: Computed Slope Mathematical Proof */}
              {currentTrend.mathDetails && (
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Code2 className="w-3.5 h-3.5 text-teal-600" />
                      <span>2. Linear Regression Slope Calculation Proof</span>
                    </h4>
                    <span className="text-xs font-mono font-bold bg-teal-50 text-teal-900 px-2 py-0.5 rounded border border-teal-200">
                      Slope m = {currentTrend.slope > 0 ? `+${currentTrend.slope}` : currentTrend.slope} {currentTrend.unit}/reading
                    </span>
                  </div>

                  <div className="bg-slate-900 text-slate-200 p-3 rounded-xl font-mono text-[11px] space-y-1.5">
                    <p className="text-teal-400 font-bold">
                      Formula: m = [ N * Σ(x*y) - Σ(x) * Σ(y) ] / [ N * Σ(x²) - (Σx)² ]
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-800 text-[10px]">
                      <div>N = {currentTrend.mathDetails.n}</div>
                      <div>Σx = {currentTrend.mathDetails.sumX}</div>
                      <div>Σy = {currentTrend.mathDetails.sumY}</div>
                      <div>Σxy = {currentTrend.mathDetails.sumXY}</div>
                      <div>Σ(x²) = {currentTrend.mathDetails.sumX2}</div>
                      <div>(Σx)² = {currentTrend.mathDetails.sumX ** 2}</div>
                      <div>Numerator = {currentTrend.mathDetails.numerator}</div>
                      <div>Denominator = {currentTrend.mathDetails.denominator}</div>
                    </div>
                    <p className="pt-1.5 border-t border-slate-800 text-slate-300">
                      m = {currentTrend.mathDetails.numerator} / {currentTrend.mathDetails.denominator} ={' '}
                      <strong className="text-emerald-400 text-xs">
                        {currentTrend.slope > 0 ? `+${currentTrend.slope}` : currentTrend.slope} {currentTrend.unit} per interval
                      </strong>
                    </p>
                  </div>
                </div>
              )}

              {/* Section 3: Guideline Range & Classification Verdict */}
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  3. Guideline Range & Final Clinical Verdict
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                    <p className="font-bold text-slate-800">Guideline Thresholds:</p>
                    <p className="text-slate-600">
                      Standard Range: <span className="font-bold text-teal-800">{currentTrend.targetMin} – {currentTrend.targetMax} {currentTrend.unit}</span>
                    </p>
                    <p className="text-[11px] text-slate-500">Authority: {currentTrend.guidelineSource}</p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                    <p className="font-bold text-slate-800">Classification Rationale:</p>
                    <p className="text-slate-700 font-medium leading-relaxed">{currentTrend.reason}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500 border-t border-slate-100">
                  <ShieldAlert className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span>
                    Deterministic mathematical model ensures reproducible risk flagging across all traveling village visits. Decision support only.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
