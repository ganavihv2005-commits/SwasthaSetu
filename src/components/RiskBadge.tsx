import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { type RiskStatus, type Patient } from '../types';
import { type PatientRiskEvaluation } from '../services/riskService';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { logAudit } from '../services/auditService';
import {
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  RotateCcw,
  Check,
} from 'lucide-react';

interface RiskBadgeProps {
  status: RiskStatus;
  reason?: string;
  patient?: Patient;
  riskEvaluation?: PatientRiskEvaluation | null;
  onStatusUpdated?: () => void;
  showWhyButton?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  status,
  reason,
  patient,
  riskEvaluation,
  onStatusUpdated,
  showWhyButton = true,
  size = 'md',
}) => {
  const { t } = useLanguage();
  const { isDoctor, currentUser } = useAuth();
  const [showExplanation, setShowExplanation] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideStatus, setOverrideStatus] = useState<RiskStatus>('Stable');

  const config = {
    Stable: {
      label: t.stable,
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      dotClass: 'bg-emerald-600',
      icon: CheckCircle2,
    },
    Watch: {
      label: t.watch,
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-300',
      dotClass: 'bg-amber-500',
      icon: AlertCircle,
    },
    Worsening: {
      label: t.worsening,
      badgeClass: 'bg-rose-50 text-rose-800 border-rose-300 font-bold',
      dotClass: 'bg-rose-600',
      icon: AlertTriangle,
    },
    'Insufficient Data': {
      label: t.insufficientData,
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
      dotClass: 'bg-slate-400',
      icon: HelpCircle,
    },
  }[status] || {
    label: status,
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
    dotClass: 'bg-slate-400',
    icon: HelpCircle,
  };

  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2',
  }[size];

  const handleDismissFlag = async () => {
    if (!patient || !isDoctor) return;
    if (confirm(`Dismiss risk flag for ${patient.name}? This will be recorded in the audit log.`)) {
      try {
        await updateDoc(doc(db, 'patients', patient.id), {
          riskDismissed: true,
          updatedAt: new Date().toISOString(),
        });

        if (currentUser) {
          await logAudit({
            userId: currentUser.id,
            userName: currentUser.name,
            userRole: currentUser.role,
            action: 'dismiss_risk',
            resource: 'patient',
            resourceId: patient.id,
            details: `Dr. ${currentUser.name} dismissed active risk flag (${status}). Original reason: ${reason || patient.riskReason}`,
          });
        }

        if (onStatusUpdated) onStatusUpdated();
      } catch (err) {
        console.error('Failed to dismiss risk flag:', err);
      }
    }
  };

  const handleSaveOverride = async () => {
    if (!patient || !isDoctor || !overrideReason.trim()) return;

    try {
      await updateDoc(doc(db, 'patients', patient.id), {
        riskStatus: overrideStatus,
        riskOverridden: true,
        riskOverriddenReason: overrideReason.trim(),
        updatedAt: new Date().toISOString(),
      });

      if (currentUser) {
        await logAudit({
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          action: 'override_risk',
          resource: 'patient',
          resourceId: patient.id,
          details: `Dr. ${currentUser.name} clinically overrode risk status from ${status} to ${overrideStatus}. Reason: "${overrideReason.trim()}"`,
        });
      }

      setShowOverrideModal(false);
      setOverrideReason('');
      if (onStatusUpdated) onStatusUpdated();
    } catch (err) {
      console.error('Failed to override risk status:', err);
    }
  };

  return (
    <div className="inline-flex flex-col">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span
          className={`inline-flex items-center border rounded-full font-semibold shadow-2xs ${config.badgeClass} ${sizeClasses}`}
        >
          <span className={`w-2 h-2 rounded-full ${config.dotClass}`} />
          <Icon className="w-3.5 h-3.5" />
          <span>{config.label}</span>
          {patient?.riskOverridden && (
            <span className="ml-1 text-[10px] bg-slate-200 text-slate-800 px-1 rounded-sm uppercase tracking-wider font-bold">
              Overridden
            </span>
          )}
          {patient?.riskDismissed && (
            <span className="ml-1 text-[10px] bg-slate-200 text-slate-700 px-1 rounded-sm uppercase tracking-wider">
              Dismissed
            </span>
          )}
        </span>

        {showWhyButton && (
          <button
            onClick={() => setShowExplanation(!showExplanation)}
            type="button"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-md px-2 py-0.5 transition-colors cursor-pointer"
            title="Inspect progression slope and guideline citation"
          >
            <span>{t.whyExplanation}</span>
            {showExplanation ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
      </div>

      {/* Expandable Explanation Popover / Drawer */}
      {showExplanation && (
        <div className="mt-2.5 p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 space-y-2.5 shadow-sm">
          <div className="flex items-start justify-between gap-2 border-b border-slate-200 pb-2">
            <div>
              <p className="font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-teal-700" />
                <span>Progression Watch Analysis</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {t.decisionSupportOnly}
              </p>
            </div>
            <span className="text-[10px] font-mono bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded-sm">
              Algorithm: Linear Slope
            </span>
          </div>

          <div className="space-y-1.5">
            <p className="font-semibold text-slate-800">{reason || patient?.riskReason || 'No specific rationale provided.'}</p>
            {patient?.riskOverridden && (
              <p className="text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200 text-[11px]">
                <strong>Doctor Clinical Override:</strong> "{patient.riskOverriddenReason}"
              </p>
            )}
          </div>

          {/* Breakdown by parameter if available */}
          {riskEvaluation && riskEvaluation.parameterTrends.length > 0 && (
            <div className="space-y-2 pt-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Tracked Parameters & Guidelines:
              </p>
              <div className="grid grid-cols-1 gap-2">
                {riskEvaluation.parameterTrends.map((trend) => (
                  <div
                    key={trend.parameter}
                    className="p-2 rounded-lg bg-white border border-slate-200 text-[11px] space-y-1"
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-slate-800">{trend.parameterName}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-sm text-[10px] font-bold ${
                          trend.status === 'worsening'
                            ? 'bg-rose-100 text-rose-800'
                            : trend.status === 'improving'
                            ? 'bg-blue-100 text-blue-800'
                            : trend.status === 'stable'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {trend.status.toUpperCase()} (Slope: {trend.slope > 0 ? `+${trend.slope}` : trend.slope})
                      </span>
                    </div>
                    <p className="text-slate-600">{trend.reason}</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5 border-t border-slate-100">
                      <span>Target: {trend.targetMin}-{trend.targetMax} {trend.unit}</span>
                      <span className="text-teal-700 font-medium truncate max-w-[200px]" title={trend.guidelineSource}>
                        Source: {trend.guidelineSource}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons for Doctor */}
          {isDoctor && patient && (
            <div className="pt-2 flex items-center gap-2 border-t border-slate-200">
              <button
                type="button"
                onClick={handleDismissFlag}
                className="flex-1 py-1 px-2.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-colors"
              >
                {t.dismissFlag}
              </button>
              <button
                type="button"
                onClick={() => setShowOverrideModal(true)}
                className="flex-1 py-1 px-2.5 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-300 rounded-lg shadow-2xs transition-colors"
              >
                {t.overrideRisk}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Doctor Clinical Override Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Doctor Clinical Override</h3>
            <p className="text-xs text-slate-600">
              Override the algorithmic progression status for <strong>{patient?.name}</strong>. Your clinical rationale will be committed to the tamper-evident audit log.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">New Clinical Status:</label>
              <select
                value={overrideStatus}
                onChange={(e) => setOverrideStatus(e.target.value as RiskStatus)}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 font-semibold"
              >
                <option value="Stable">Stable</option>
                <option value="Watch">Watch</option>
                <option value="Worsening">Worsening</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Clinical Override Rationale (Mandatory):</label>
              <textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="e.g. Patient experienced acute bereavement stress last week; vitals expected to normalize after counseling."
                rows={3}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-teal-600"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowOverrideModal(false)}
                className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveOverride}
                disabled={!overrideReason.trim()}
                className="flex-1 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50 rounded-xl"
              >
                Confirm Override
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
