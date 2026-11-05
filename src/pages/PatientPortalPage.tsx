import React, { useState, useEffect } from 'react';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
  setDoc,
  updateDoc,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useNetwork } from '../context/NetworkContext';
import { generatePatientSummary } from '../services/briefService';
import { logAudit } from '../services/auditService';
import type { Patient, Reading, Visit, AuditLog, ReadingType } from '../types';
import {
  Heart,
  Calendar,
  Plus,
  Volume2,
  VolumeX,
  ShieldCheck,
  ShieldAlert,
  Printer,
  TrendingUp,
  Pill,
  Clock,
  Sparkles,
  KeyRound,
  Check,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export const PatientPortalPage: React.FC = () => {
  const { userProfile, linkPatientRecord } = useAuth();
  const { language, t, speak, stopSpeaking, isSpeaking } = useLanguage();
  const { effectiveOffline } = useNetwork();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [accessLogs, setAccessLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Link code entry state if not linked
  const [linkCodeInput, setLinkCodeInput] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkSuccess, setLinkSuccess] = useState<string | null>(null);

  // Add reading modal/form state
  const [showAddReading, setShowAddReading] = useState(false);
  const [readingType, setReadingType] = useState<ReadingType>('systolic');
  const [readingValue, setReadingValue] = useState<string>('');
  const [readingSaving, setReadingSaving] = useState(false);
  const [readingToast, setReadingToast] = useState<string | null>(null);

  // Patient summary card state
  const [summaryText, setSummaryText] = useState<string>('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [consentUpdating, setConsentUpdating] = useState(false);

  const linkedId = userProfile?.linkedPatientId;

  useEffect(() => {
    if (!linkedId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // 1. Patient Doc Listener
    const unsubPatient = onSnapshot(
      doc(db, 'patients', linkedId),
      (snap) => {
        if (snap.exists()) {
          setPatient({ id: snap.id, ...snap.data() } as Patient);
        }
        setLoading(false);
      },
      (err) => handleFirestoreError(err, OperationType.GET, `patients/${linkedId}`)
    );

    // 2. Readings Listener
    const readingsQ = query(
      collection(db, 'readings'),
      where('patientId', '==', linkedId)
    );
    const unsubReadings = onSnapshot(
      readingsQ,
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Reading))
          .sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime());
        setReadings(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'readings')
    );

    // 3. Visits Listener
    const visitsQ = query(
      collection(db, 'visits'),
      where('patientId', '==', linkedId)
    );
    const unsubVisits = onSnapshot(
      visitsQ,
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Visit))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setVisits(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'visits')
    );

    // 4. Who Viewed My Record Listener (Audit events for this patient)
    const auditQ = query(
      collection(db, 'auditLogs'),
      where('resourceId', '==', linkedId)
    );
    const unsubAudit = onSnapshot(
      auditQ,
      (snap) => {
        const logs = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as AuditLog))
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setAccessLogs(logs);
      },
      (err) => {
        console.warn('[AuditLogs] Could not fetch patient access events:', err);
      }
    );

    return () => {
      unsubPatient();
      unsubReadings();
      unsubVisits();
      unsubAudit();
    };
  }, [linkedId]);

  // Load summary card
  useEffect(() => {
    if (patient) {
      setSummaryLoading(true);
      generatePatientSummary(patient, readings, visits, language)
        .then((res) => {
          setSummaryText(res.summary);
        })
        .finally(() => setSummaryLoading(false));
    }
  }, [patient?.id, language, readings.length, visits.length]);

  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkCodeInput.trim()) return;
    setLinkError(null);
    setLinkSuccess(null);
    const res = await linkPatientRecord(linkCodeInput.trim());
    if (res.success) {
      setLinkSuccess(res.message);
    } else {
      setLinkError(res.message);
    }
  };

  const handleAddPatientReading = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(readingValue);
    if (isNaN(val) || val <= 0) return;
    if (!patient) return;

    setReadingSaving(true);
    const readingId = `read_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newReading: Reading = {
      id: readingId,
      patientId: patient.id,
      village: patient.village,
      type: readingType,
      value: val,
      measuredAt: new Date().toISOString(),
      source: 'patient',
      enteredBy: `${userProfile?.name || 'Patient'} (Self)`,
      createdAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'readings', readingId), newReading);
      await logAudit({
        userId: userProfile?.id || 'patient',
        userName: userProfile?.name || 'Patient',
        userRole: 'patient',
        action: 'create',
        resource: 'reading',
        resourceId: readingId,
        details: `Patient entered self-measured ${readingType}: ${val}`,
      });
      setReadingToast('Your reading was saved and shared with your care team.');
      setTimeout(() => setReadingToast(null), 3500);
      setShowAddReading(false);
      setReadingValue('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'readings');
    } finally {
      setReadingSaving(false);
    }
  };

  const handleToggleConsent = async () => {
    if (!patient) return;
    setConsentUpdating(true);
    const nextConsent = !patient.consentGiven;
    try {
      await updateDoc(doc(db, 'patients', patient.id), {
        consentGiven: nextConsent,
        consentWithdrawnAt: nextConsent ? '' : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      await logAudit({
        userId: userProfile?.id || 'patient',
        userName: userProfile?.name || 'Patient',
        userRole: 'patient',
        action: nextConsent ? 'edit' : 'withdraw_consent',
        resource: 'patient',
        resourceId: patient.id,
        details: `Patient ${nextConsent ? 'restored' : 'withdrew'} data recording consent.`,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `patients/${patient.id}`);
    } finally {
      setConsentUpdating(false);
    }
  };

  // If not linked yet, show 6-digit link prompt
  if (!linkedId) {
    return (
      <div className="max-w-md mx-auto px-4 py-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center mx-auto shadow-sm">
            <Heart className="w-8 h-8 text-teal-600" />
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Connect Your Health Record
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            {t.enterLinkCodePrompt}
          </p>
        </div>

        {linkError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{linkError}</span>
          </div>
        )}
        {linkSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{linkSuccess}</span>
          </div>
        )}

        <form onSubmit={handleLinkSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Enter 6-Digit Link Code
            </label>
            <input
              type="text"
              required
              maxLength={10}
              value={linkCodeInput}
              onChange={(e) => setLinkCodeInput(e.target.value.toUpperCase())}
              placeholder="e.g. RAM789"
              className="w-full text-center text-xl font-mono font-black tracking-widest py-3 rounded-xl border border-slate-300 focus:outline-teal-600 uppercase"
            />
            <span className="text-[11px] text-slate-400 block text-center mt-1">
              Ask your village ASHA or Dr. Ravi for your active code
            </span>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-sm cursor-pointer"
          >
            {t.linkPatientButton}
          </button>
        </form>
      </div>
    );
  }

  if (loading || !patient) {
    return (
      <div className="max-w-md mx-auto p-8 text-center text-xs text-slate-500">
        Loading your personal health portal...
      </div>
    );
  }

  // Gentle status determination (NEVER "Worsening")
  const isGentleAttention = patient.riskStatus === 'Worsening' || patient.riskStatus === 'Watch';
  const gentleStatusText = isGentleAttention
    ? t.patientStatusAttention
    : t.patientStatusGood;

  // Chart points
  const chartData = [...readings]
    .reverse()
    .slice(-10)
    .map((r) => ({
      date: r.measuredAt.split('T')[0],
      value: r.value,
      type: r.type,
      source: r.source === 'patient' ? 'Self' : 'ASHA/Dr',
    }));

  return (
    <div className="max-w-xl mx-auto px-3.5 py-4 space-y-4">
      {/* Toast */}
      {readingToast && (
        <div className="p-3 bg-emerald-600 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm animate-fadeIn">
          <Check className="w-4 h-4" />
          <span>{readingToast}</span>
        </div>
      )}

      {/* 1. Gentle "My Health" Card */}
      <div
        className={`rounded-3xl border p-5 shadow-sm space-y-3 ${
          isGentleAttention
            ? 'bg-amber-50/70 border-amber-300 text-amber-950'
            : 'bg-teal-50/70 border-teal-300 text-teal-950'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className={`w-6 h-6 ${isGentleAttention ? 'text-amber-600' : 'text-teal-600'}`} />
            <h2 className="text-lg font-black tracking-tight">{t.myHealth}</h2>
          </div>
          <span className="text-xs font-bold bg-white/80 px-2.5 py-1 rounded-full border border-slate-200">
            {patient.village} Village
          </span>
        </div>

        <p className="text-sm font-bold leading-relaxed">{gentleStatusText}</p>

        {/* Next Visit Banner */}
        <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-slate-700">
            <Calendar className="w-4 h-4 text-teal-700" />
            <span>{t.nextFollowupDate}:</span>
          </div>
          <span className="font-bold text-slate-900">
            {patient.lastVisitDate ? patient.lastVisitDate : 'During upcoming village rounds'}
          </span>
        </div>
      </div>

      {/* Consent Warning Banner if withdrawn */}
      {!patient.consentGiven && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl text-xs text-rose-900 space-y-2">
          <div className="flex items-center gap-1.5 font-bold">
            <ShieldAlert className="w-5 h-5 text-rose-600" />
            <span>Medical Record Consent Withdrawn</span>
          </div>
          <p className="leading-relaxed text-[11px] text-rose-800">
            {t.consentWithdrawnWarning}
          </p>
          <button
            onClick={handleToggleConsent}
            disabled={consentUpdating}
            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer shadow-xs"
          >
            {t.restoreConsent}
          </button>
        </div>
      )}

      {/* 2. Shareable / Printable "My Summary Card" */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-teal-600" />
            <h3 className="text-sm font-bold text-slate-900">{t.mySummaryCard}</h3>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => (isSpeaking ? stopSpeaking() : speak(summaryText))}
              className="px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold flex items-center gap-1 cursor-pointer hover:bg-teal-100"
            >
              {isSpeaking ? <VolumeX className="w-3.5 h-3.5 text-rose-600" /> : <Volume2 className="w-3.5 h-3.5" />}
              <span>{isSpeaking ? t.readingAloud : t.readAloud}</span>
            </button>

            <button
              onClick={() => window.print()}
              className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
              title="Print Summary Card"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed font-medium">
          {summaryLoading ? (
            <span className="text-slate-400">Loading your summary card...</span>
          ) : (
            summaryText
          )}
        </div>
      </div>

      {/* 3. Add My Own Reading */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-teal-600" />
            <h3 className="text-sm font-bold text-slate-900">Add My Own Reading</h3>
          </div>
          <button
            onClick={() => setShowAddReading(!showAddReading)}
            className="px-3 py-1.5 rounded-xl bg-teal-600 text-white text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>{showAddReading ? 'Close' : 'Record'}</span>
          </button>
        </div>

        {showAddReading && (
          <form onSubmit={handleAddPatientReading} className="pt-2 space-y-3 border-t border-slate-100 animate-fadeIn">
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { type: 'systolic', label: 'Upper BP', unit: 'mmHg' },
                { type: 'diastolic', label: 'Lower BP', unit: 'mmHg' },
                { type: 'bloodSugar', label: 'Glucose', unit: 'mg/dL' },
                { type: 'weight', label: 'Weight', unit: 'kg' },
              ].map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => setReadingType(item.type as ReadingType)}
                  className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                    readingType === item.type
                      ? 'bg-teal-50 border-teal-600 text-teal-900 font-bold ring-1 ring-teal-600'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <p className="text-[11px] font-bold">{item.label}</p>
                  <p className="text-[9px] text-slate-400">{item.unit}</p>
                </button>
              ))}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Enter measurement value
              </label>
              <input
                type="number"
                step="any"
                required
                value={readingValue}
                onChange={(e) => setReadingValue(e.target.value)}
                placeholder="e.g. 130"
                className="w-full text-center text-2xl font-black py-2.5 rounded-xl border border-slate-300 focus:outline-teal-600"
              />
              <span className="text-[10px] text-slate-400 block text-center mt-1">
                Tagged as &quot;Patient-entered&quot; in Dr. Ravi&apos;s rounds list
              </span>
            </div>

            <button
              type="submit"
              disabled={readingSaving}
              className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs cursor-pointer"
            >
              {readingSaving ? 'Saving...' : 'Save My Reading'}
            </button>
          </form>
        )}

        {/* Recent Readings List */}
        <div className="space-y-1.5 pt-1">
          {readings.slice(0, 4).map((r) => (
            <div
              key={r.id}
              className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
            >
              <div>
                <span className="font-bold text-slate-800 uppercase">
                  {r.type}: {r.value}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  {r.measuredAt.split('T')[0]} • {r.source === 'patient' ? t.sourcePatient : t.sourceHealthWorker}
                </span>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                  r.source === 'patient'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-teal-100 text-teal-800'
                }`}
              >
                {r.source === 'patient' ? 'Patient' : 'Clinical'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Simple Trend Chart */}
      {chartData.length > 1 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
          <h3 className="text-sm font-bold text-slate-900">My Trend Chart</h3>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    fontSize: '11px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#0d9488"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#0d9488' }}
                  name="Value"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 5. My Medicines List */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <Pill className="w-5 h-5 text-teal-600" />
          <h3 className="text-sm font-bold text-slate-900">{t.myMedicines}</h3>
        </div>

        {visits.length > 0 && visits[0].medicines && visits[0].medicines.length > 0 ? (
          <div className="space-y-2">
            {visits[0].medicines.map((m, idx) => (
              <div
                key={idx}
                className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-bold text-slate-900">{m.name}</p>
                  <p className="text-[11px] text-slate-500">{m.dosage}</p>
                </div>
                <span className="text-[11px] font-bold bg-white px-2.5 py-1 rounded-xl border border-slate-200 text-teal-800">
                  {m.frequency}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500">No active prescriptions recorded.</p>
        )}
      </div>

      {/* 6. Consent Management & "Who Viewed My Record" */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-teal-600" />
            <h3 className="text-sm font-bold text-slate-900">{t.whoViewedMyRecord}</h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {accessLogs.length} events
          </span>
        </div>

        <p className="text-xs text-slate-500">
          Transparent access history under Responsible AI principles:
        </p>

        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {accessLogs.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No recorded views yet.</p>
          ) : (
            accessLogs.slice(0, 10).map((log) => (
              <div
                key={log.id}
                className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-[11px]"
              >
                <div>
                  <span className="font-bold text-slate-800">{log.userName}</span>
                  <span className="text-[10px] text-slate-400 block">
                    {log.details}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  {log.timestamp.split('T')[0]}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Consent toggle button */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-600 font-medium">Record Consent Status</span>
          <button
            onClick={handleToggleConsent}
            disabled={consentUpdating}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer ${
              patient.consentGiven
                ? 'bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100'
                : 'bg-teal-600 text-white'
            }`}
          >
            {patient.consentGiven ? t.withdrawConsent : t.restoreConsent}
          </button>
        </div>
      </div>
    </div>
  );
};
