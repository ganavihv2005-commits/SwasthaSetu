import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  doc,
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Patient, Visit, Reading, Alert } from '../types';
import { evaluatePatientRisk, type PatientRiskEvaluation } from '../services/riskService';
import { logAudit } from '../services/auditService';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { VisitBriefCard } from '../components/VisitBriefCard';
import { RiskBadge } from '../components/RiskBadge';
import { TrendChart, type ChartDataPoint } from '../components/TrendChart';
import { ProgressionWatchDebugPanel } from '../components/ProgressionWatchDebugPanel';
import {
  ArrowLeft,
  Calendar,
  Clock,
  PlusCircle,
  Stethoscope,
  Activity,
  Pill,
  FileText,
  User,
  AlertCircle,
  HeartPulse,
  QrCode,
  Copy,
  Check,
  Printer,
  Shield,
  KeyRound,
  ExternalLink,
} from 'lucide-react';

export const PatientDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, isDoctor, canAddClinicalVisit, canAddReading } = useAuth();
  const { t } = useLanguage();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [riskEval, setRiskEval] = useState<PatientRiskEvaluation | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [showReferralModal, setShowReferralModal] = useState<boolean>(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    // Real-time listener for patient document
    const unsubPatient = onSnapshot(doc(db, 'patients', id), (docSnap) => {
      if (docSnap.exists()) {
        const pData = { id: docSnap.id, ...docSnap.data() } as Patient;
        setPatient(pData);

        // Audit log view action once on load
        if (currentUser) {
          logAudit({
            userId: currentUser.id,
            userName: currentUser.name,
            userRole: currentUser.role,
            action: 'view',
            resource: 'patient',
            resourceId: pData.id,
            details: `${currentUser.name} (${currentUser.role}) opened longitudinal record for patient ${pData.name} (${pData.village}).`,
          });
        }
      } else {
        setPatient(null);
      }
      setLoading(false);
    });

    // Real-time listener for visits
    const visitsQ = query(collection(db, 'visits'), where('patientId', '==', id));
    const unsubVisits = onSnapshot(visitsQ, (snap) => {
      const vList = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Visit));
      vList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setVisits(vList);
    });

    // Real-time listener for readings
    const readingsQ = query(collection(db, 'readings'), where('patientId', '==', id));
    const unsubReadings = onSnapshot(readingsQ, (snap) => {
      const rList = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Reading));
      rList.sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime());
      setReadings(rList);
    });

    // Real-time listener for alerts
    const alertsQ = query(collection(db, 'alerts'), where('patientId', '==', id));
    const unsubAlerts = onSnapshot(alertsQ, (snap) => {
      const aList = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Alert));
      setAlerts(aList);
    });

    // Evaluate progression watch risk
    evaluatePatientRisk(id).then((res) => {
      setRiskEval(res);
    });

    return () => {
      unsubPatient();
      unsubVisits();
      unsubReadings();
      unsubAlerts();
    };
  }, [id, currentUser?.id]);

  const handleGenerateLinkCode = async () => {
    if (!patient || !id) return;
    const prefix = patient.name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'PAT';
    const randDigits = Math.floor(100 + Math.random() * 900);
    const newCode = `${prefix}${randDigits}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    try {
      await updateDoc(doc(db, 'patients', id), {
        linkCode: newCode,
        linkCodeExpiresAt: expiresAt,
        updatedAt: new Date().toISOString(),
      });

      if (currentUser) {
        await logAudit({
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          action: 'generate_link_code',
          resource: 'patient',
          resourceId: id,
          details: `Generated 7-day patient portal link code "${newCode}" for ${patient.name}. Expires ${expiresAt.split('T')[0]}.`,
        });
      }
    } catch (err) {
      console.error('Failed to generate link code:', err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-xs text-slate-500">
        Loading patient medical record from secure cloud repository...
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center space-y-3">
        <p className="text-sm font-bold text-slate-800">Patient not found</p>
        <button
          onClick={() => navigate('/rounds')}
          className="px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold"
        >
          Return to Rounds
        </button>
      </div>
    );
  }

  // Prepare chart series combining visits and readings
  const getChartPoints = (param: 'systolic' | 'diastolic' | 'bloodSugar' | 'weight'): ChartDataPoint[] => {
    const points: ChartDataPoint[] = [];

    visits.forEach((v) => {
      if (v.vitals && v.vitals[param] !== undefined && v.vitals[param] !== null) {
        points.push({
          date: v.date,
          displayDate: v.date.substring(5),
          value: v.vitals[param] as number,
          source: 'Clinic Visit',
          enteredBy: v.enteredBy,
          notes: v.notes,
        });
      }
    });

    readings.forEach((r) => {
      if (r.type === param && r.value !== undefined && r.value !== null) {
        const d = r.measuredAt.split('T')[0];
        points.push({
          date: d,
          displayDate: d.substring(5),
          value: r.value,
          source: 'Between-Visit Reading',
          enteredBy: r.source === 'patient' ? `${r.enteredBy} (Patient Self)` : r.enteredBy,
          notes: r.notes,
        });
      }
    });

    return points.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  type TimelineItem =
    | { kind: 'visit'; item: Visit; date: string }
    | { kind: 'reading'; item: Reading; date: string };

  const combinedTimeline: TimelineItem[] = [
    ...visits.map((v) => ({ kind: 'visit' as const, item: v, date: v.date })),
    ...readings.map((r) => ({ kind: 'reading' as const, item: r, date: r.measuredAt.split('T')[0] })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const systolicPoints = getChartPoints('systolic');
  const diastolicPoints = getChartPoints('diastolic');
  const bloodSugarPoints = getChartPoints('bloodSugar');
  const weightPoints = getChartPoints('weight');

  // Check if link code is still valid
  const isLinkActive =
    patient.linkCode &&
    patient.linkCodeExpiresAt &&
    new Date(patient.linkCodeExpiresAt).getTime() > Date.now();

  return (
    <div className="max-w-4xl mx-auto px-3.5 py-4 space-y-4">
      {/* Top Bar: Back & Actions */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <button
          onClick={() => navigate('/rounds')}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Rounds</span>
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowReferralModal(true)}
            className="flex items-center gap-1 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 px-3 py-1.5 rounded-xl shadow-2xs transition-colors min-h-[36px]"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Referral Summary</span>
          </button>

          {canAddReading && (
            <Link
              to={`/add-reading?patientId=${patient.id}`}
              className="flex items-center gap-1 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-3 py-1.5 rounded-xl transition-colors min-h-[36px]"
            >
              <HeartPulse className="w-3.5 h-3.5" />
              <span>{t.addReading}</span>
            </Link>
          )}

          {canAddClinicalVisit && (
            <Link
              to={`/new-visit?patientId=${patient.id}`}
              className="flex items-center gap-1 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 px-3 py-1.5 rounded-xl shadow-xs transition-colors min-h-[36px]"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{t.newVisit}</span>
            </Link>
          )}
        </div>
      </div>

      {/* Patient Demographic Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">{patient.name}</h2>
              <span className="text-xs bg-slate-100 text-slate-700 font-bold px-2.5 py-0.5 rounded-full">
                {patient.age} yrs • {patient.sex}
              </span>
              <span className="text-xs bg-teal-50 text-teal-800 font-bold px-2.5 py-0.5 rounded-full border border-teal-200">
                Village: {patient.village}
              </span>
              {patient.isDemo && (
                <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-md border border-amber-200">
                  Demo Record
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-teal-600" />
              <span>Informed consent recorded: {patient.consentAt?.split('T')[0] || patient.createdAt?.split('T')[0]}</span>
            </p>
          </div>

          <div>
            <RiskBadge
              status={patient.riskStatus}
              reason={patient.riskReason}
              patient={patient}
              riskEvaluation={riskEval}
              onStatusUpdated={() => evaluatePatientRisk(patient.id).then(setRiskEval)}
              size="lg"
            />
          </div>
        </div>

        {/* Chronic Conditions & Patient Portal Linking */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Diagnoses:
            </span>
            {patient.conditions.map((c) => (
              <span
                key={c}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200"
              >
                {c === 'hypertension' ? 'Hypertension (BP)' : 'Type 2 Diabetes'}
              </span>
            ))}
          </div>

          {/* 7-day link code pill */}
          <div className="flex items-center gap-2">
            {isLinkActive ? (
              <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-xl">
                <KeyRound className="w-3.5 h-3.5 text-purple-700" />
                <span className="text-xs text-purple-900 font-semibold">Portal Code:</span>
                <span className="text-xs font-mono font-black text-purple-900 tracking-wider bg-white px-2 py-0.5 rounded border border-purple-200">
                  {patient.linkCode}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(patient.linkCode || '')}
                  className="text-purple-700 hover:text-purple-900 p-0.5"
                  title="Copy Code"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleGenerateLinkCode}
                className="flex items-center gap-1.5 text-xs font-bold text-purple-800 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Generate 7-Day Portal Code</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 1. Visit Brief Card (Gemini 3.8 Flash / Offline Template) */}
      <VisitBriefCard patient={patient} />

      {/* 2. Progression Watch Mathematical Verification & Debug Panel */}
      {riskEval && (
        <ProgressionWatchDebugPanel
          evaluation={riskEval}
          defaultExpanded={patient.id === 'pat_hero_rameshwar'}
        />
      )}

      {/* Active Alerts for this patient */}
      {alerts.filter((a) => a.status === 'open').length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-amber-700" />
            <span>Active Alerts for Dr. Ravi ({alerts.filter((a) => a.status === 'open').length})</span>
          </h4>
          <div className="space-y-1.5">
            {alerts
              .filter((a) => a.status === 'open')
              .map((alert) => (
                <div
                  key={alert.id}
                  className="p-2.5 rounded-xl bg-white border border-amber-200 text-xs flex items-center justify-between gap-2 shadow-2xs"
                >
                  <div>
                    <span className="font-bold text-amber-800 uppercase tracking-wider text-[10px] bg-amber-100 px-1.5 py-0.5 rounded-sm mr-2">
                      {alert.type}
                    </span>
                    <span className="text-slate-800 font-medium">{alert.reason}</span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 shrink-0">
                    Due: {alert.dueDate}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 2. Trend Charts with Shaded Guideline Reference Range */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Longitudinal Progression Charts
          </h3>
          <span className="text-[11px] text-slate-500">
            Shaded area = Target Guideline
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Systolic BP */}
          {patient.conditions.includes('hypertension') && (
            <TrendChart
              parameter="systolic"
              title="Systolic Blood Pressure Trend"
              unit="mmHg"
              targetMin={120}
              targetMax={140}
              guidelineSource="Indian Guidelines on Hypertension (IGH-IV) [Demo]"
              data={systolicPoints}
            />
          )}

          {/* Diastolic BP */}
          {patient.conditions.includes('hypertension') && (
            <TrendChart
              parameter="diastolic"
              title="Diastolic Blood Pressure Trend"
              unit="mmHg"
              targetMin={70}
              targetMax={90}
              guidelineSource="Indian Guidelines on Hypertension (IGH-IV) [Demo]"
              data={diastolicPoints}
            />
          )}

          {/* Blood Sugar */}
          {patient.conditions.includes('diabetes') && (
            <TrendChart
              parameter="bloodSugar"
              title="Blood Sugar (Fasting) Trend"
              unit="mg/dL"
              targetMin={70}
              targetMax={130}
              guidelineSource="ICMR Guidelines for Type 2 Diabetes [Demo]"
              data={bloodSugarPoints}
            />
          )}

          {/* Body Weight */}
          <TrendChart
            parameter="weight"
            title="Body Weight Maintenance"
            unit="kg"
            targetMin={45}
            targetMax={75}
            guidelineSource="NHM Rural Clinical Reference [Demo]"
            data={weightPoints}
          />
        </div>
      </div>

      {/* 3. Longitudinal Timeline (Visits & Readings, newest first) */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-teal-600" />
            <span>{t.timeline || 'Longitudinal Timeline'} ({combinedTimeline.length} events)</span>
          </h3>
          <span className="text-[11px] text-slate-500">Newest First</span>
        </div>

        {combinedTimeline.length === 0 ? (
          <div className="p-6 rounded-2xl border border-slate-200 bg-white text-center text-xs text-slate-500">
            No visits or between-visit readings recorded yet.
          </div>
        ) : (
          <div className="space-y-3 relative before:absolute before:inset-0 before:left-4 before:w-0.5 before:bg-slate-200">
            {combinedTimeline.map((item, idx) => {
              const isVisit = item.kind === 'visit';
              const visit = isVisit ? (item.item as Visit) : null;
              const reading = !isVisit ? (item.item as Reading) : null;

              return (
                <div key={idx} className="relative pl-8">
                  <div
                    className={`absolute left-2.5 top-3.5 w-3.5 h-3.5 -translate-x-1/2 rounded-full border-2 border-white shadow-xs ${
                      isVisit ? 'bg-teal-600' : 'bg-amber-500 rotate-45'
                    }`}
                  />

                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-2">
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wider ${
                            isVisit
                              ? 'bg-teal-100 text-teal-900'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {isVisit ? 'Clinic Visit' : 'Between-Visit Reading'}
                        </span>
                        <span className="font-bold text-slate-900">{item.date}</span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-medium">
                        By: {isVisit ? visit?.enteredBy : reading?.enteredBy}
                        {reading?.source === 'patient' && (
                          <span className="ml-1 text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded">
                            Patient Self
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Vitals summary */}
                    {isVisit && visit && (
                      <div className="space-y-2 text-xs">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                          {visit.vitals.systolic && visit.vitals.diastolic && (
                            <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Blood Pressure</span>
                              <span className="font-bold text-slate-900 text-sm">
                                {visit.vitals.systolic}/{visit.vitals.diastolic} mmHg
                              </span>
                            </div>
                          )}
                          {visit.vitals.bloodSugar && (
                            <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Blood Sugar</span>
                              <span className="font-bold text-slate-900 text-sm">{visit.vitals.bloodSugar} mg/dL</span>
                            </div>
                          )}
                          {visit.vitals.weight && (
                            <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Weight</span>
                              <span className="font-bold text-slate-900 text-sm">{visit.vitals.weight} kg</span>
                            </div>
                          )}
                        </div>

                        {visit.symptoms && visit.symptoms.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] font-bold text-slate-500">Symptoms:</span>
                            {visit.symptoms.map((s, sIdx) => (
                              <span key={sIdx} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px]">
                                {s}
                              </span>
                            ))}
                          </div>
                        )}

                        {visit.medicines && visit.medicines.length > 0 && (
                          <div className="p-2.5 rounded-xl bg-teal-50/50 border border-teal-100 space-y-1">
                            <p className="text-[11px] font-bold text-teal-900 flex items-center gap-1">
                              <Pill className="w-3.5 h-3.5 text-teal-600" />
                              <span>Prescribed Regimen:</span>
                            </p>
                            <div className="flex items-center gap-2 flex-wrap">
                              {visit.medicines.map((m, mIdx) => (
                                <span key={mIdx} className="bg-white border border-teal-200 px-2 py-0.5 rounded text-xs font-semibold text-teal-900">
                                  {m.name} {m.dosage} ({m.frequency})
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {visit.notes && (
                          <p className="text-slate-600 bg-slate-50 p-2 rounded-lg text-xs italic">
                            "{visit.notes}"
                          </p>
                        )}
                      </div>
                    )}

                    {!isVisit && reading && (
                      <div className="flex items-center justify-between text-xs pt-1">
                        <div>
                          <span className="font-bold text-slate-900 text-sm">
                            {reading.type.toUpperCase()}: {reading.value}
                          </span>
                          {reading.notes && (
                            <p className="text-slate-500 text-[11px] italic mt-0.5">"{reading.notes}"</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Printable Referral & Clinical Summary Modal */}
      {showReferralModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                  Rural Clinical Referral Slip
                </h3>
                <p className="text-xs text-slate-500">Government of Jharkhand / SwasthaSetu Mobile Health Mission</p>
              </div>
              <button
                type="button"
                onClick={() => setShowReferralModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-200">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Patient</span>
                  <span className="font-bold text-slate-900 text-sm">{patient.name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Age / Sex / Village</span>
                  <span className="font-semibold text-slate-800">{patient.age}y / {patient.sex} / {patient.village}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Diagnoses</span>
                <span className="font-bold text-slate-900">{patient.conditions.join(', ')}</span>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Progression Status</span>
                <span className="font-bold text-slate-900">{patient.riskStatus} — {patient.riskReason}</span>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Recent Readings</span>
                <div className="space-y-1 mt-1">
                  {readings.slice(0, 3).map((r) => (
                    <div key={r.id} className="text-[11px] text-slate-700">
                      • {r.type.toUpperCase()}: <strong>{r.value}</strong> on {r.measuredAt.split('T')[0]} ({r.enteredBy})
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Referring Physician</span>
                <span className="font-semibold text-slate-800">Dr. Ravi (Medical Officer, Traveling Rural Clinic)</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Referral Slip</span>
              </button>
              <button
                type="button"
                onClick={() => setShowReferralModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
