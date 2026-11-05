import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  query,
  where,
  onSnapshot,
  setDoc,
  doc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { logAudit } from '../services/auditService';
import { VILLAGES } from '../services/demoDataService';
import type { Patient, Alert, Reading, ReadingType } from '../types';
import {
  HeartHandshake,
  UserPlus,
  Activity,
  Calendar,
  Mic,
  MicOff,
  MapPin,
  Clock,
  Check,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  Loader2,
  FilePlus,
  Plus,
} from 'lucide-react';

export const HealthWorkerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile, assignedVillages } = useAuth();
  const { t, language, listen, isListening } = useLanguage();

  const effectiveVillages =
    assignedVillages.length > 0 && !assignedVillages.includes('all')
      ? assignedVillages
      : VILLAGES;

  const [selectedVillage, setSelectedVillage] = useState<string>(effectiveVillages[0] || 'Kasmar');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick reading modal
  const [showReadingModal, setShowReadingModal] = useState(false);
  const [targetPatient, setTargetPatient] = useState<Patient | null>(null);
  const [quickReadingType, setQuickReadingType] = useState<ReadingType>('systolic');
  const [quickReadingValue, setQuickReadingValue] = useState('');
  const [quickReadingNotes, setQuickReadingNotes] = useState('');
  const [savingReading, setSavingReading] = useState(false);
  const [actionToast, setActionToast] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);

    // 1. Listen for patients in selected village
    const patientsQ = query(
      collection(db, 'patients'),
      where('village', '==', selectedVillage)
    );

    const unsubPatients = onSnapshot(
      patientsQ,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Patient));
        setPatients(list);
        setLoading(false);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'patients')
    );

    // 2. Listen for open follow-up alerts in selected village
    const alertsQ = query(
      collection(db, 'alerts'),
      where('village', '==', selectedVillage),
      where('status', '==', 'open')
    );

    const unsubAlerts = onSnapshot(
      alertsQ,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Alert));
        setAlerts(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'alerts')
    );

    return () => {
      unsubPatients();
      unsubAlerts();
    };
  }, [selectedVillage]);

  // Patients due for follow-up (overdue or follow_up alerts)
  const todayStr = new Date().toISOString().split('T')[0];
  const followUpPatientIds = new Set(alerts.map((a) => a.patientId));
  const duePatients = patients.filter((p) => followUpPatientIds.has(p.id));

  // Voice recognition handler for reading notes
  const handleVoiceInput = () => {
    listen(
      (transcript) => {
        setQuickReadingNotes((prev) => (prev ? `${prev} ${transcript}` : transcript));
      },
      () => {}
    );
  };

  const handleSaveQuickReading = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPatient) return;
    const val = parseFloat(quickReadingValue);
    if (isNaN(val) || val <= 0) return;

    setSavingReading(true);
    const readingId = `read_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newReading: Reading = {
      id: readingId,
      patientId: targetPatient.id,
      village: targetPatient.village,
      type: quickReadingType,
      value: val,
      measuredAt: new Date().toISOString(),
      source: 'healthWorker',
      enteredBy: userProfile?.name || 'ASHA Worker',
      notes: quickReadingNotes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'readings', readingId), newReading);
      await logAudit({
        userId: userProfile?.id || 'hw',
        userName: userProfile?.name || 'ASHA Worker',
        userRole: 'healthWorker',
        action: 'create',
        resource: 'reading',
        resourceId: readingId,
        details: `ASHA recorded ${quickReadingType}: ${val} for patient ${targetPatient.name} in ${targetPatient.village}`,
      });

      setActionToast(`Reading recorded for ${targetPatient.name}. Synced to doctor's rounds live.`);
      setTimeout(() => setActionToast(null), 3500);
      setShowReadingModal(false);
      setQuickReadingValue('');
      setQuickReadingNotes('');
      setTargetPatient(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'readings');
    } finally {
      setSavingReading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-3.5 py-4 space-y-4">
      {/* Toast Notification */}
      {actionToast && (
        <div className="p-3 bg-teal-600 text-white text-xs font-bold rounded-2xl flex items-center gap-2 shadow-xs animate-fadeIn">
          <Check className="w-4 h-4 shrink-0" />
          <span>{actionToast}</span>
        </div>
      )}

      {/* Header & Village Bar */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center shrink-0">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                Health Worker Dashboard
              </h2>
              <span className="text-[10px] bg-teal-100 text-teal-800 font-bold px-2 py-0.5 rounded-full uppercase">
                ASHA / ANM
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Between-visit monitoring, patient registration & follow-up tracking
            </p>
          </div>
        </div>

        {/* Village picker */}
        <div className="flex items-center gap-2 border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-3">
          <MapPin className="w-4 h-4 text-teal-600 shrink-0" />
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Today&apos;s Village
            </label>
            <select
              value={selectedVillage}
              onChange={(e) => setSelectedVillage(e.target.value)}
              className="text-xs font-bold text-slate-900 bg-transparent border-0 p-0 focus:ring-0 cursor-pointer"
            >
              {effectiveVillages.map((v) => (
                <option key={v} value={v}>
                  {v} Village
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Action Quick Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate('/new-patient')}
          className="p-4 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white shadow-xs flex items-center gap-3 cursor-pointer transition-transform active:scale-[0.98] min-h-[56px]"
        >
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <UserPlus className="w-5 h-5" />
          </div>
          <div className="text-left">
            <p className="text-xs font-bold leading-tight">{t.newPatient}</p>
            <p className="text-[10px] text-teal-100 mt-0.5">With mandatory informed consent</p>
          </div>
        </button>

        <button
          onClick={() => {
            if (patients.length > 0) {
              setTargetPatient(patients[0]);
              setShowReadingModal(true);
            } else {
              alert('Please register or load patients for this village first.');
            }
          }}
          className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-teal-300 text-slate-900 shadow-xs flex items-center gap-3 cursor-pointer transition-transform active:scale-[0.98] min-h-[56px]"
        >
          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div className="text-left">
            <p className="text-xs font-bold leading-tight">{t.addReading}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Voice or keypad entry</p>
          </div>
        </button>
      </div>

      {/* Patients Due For Follow-up Section */}
      <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Patients Due for Follow-up ({duePatients.length})
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">
            In {selectedVillage}
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading follow-ups...</div>
        ) : duePatients.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-slate-100">
            No overdue or urgent follow-ups in {selectedVillage} today.
          </div>
        ) : (
          <div className="space-y-2">
            {duePatients.map((patient) => (
              <div
                key={patient.id}
                className="p-3.5 rounded-2xl border border-amber-200 bg-amber-50/40 flex items-center justify-between gap-3 shadow-2xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">{patient.name}</h4>
                    <span className="text-[11px] text-slate-500">
                      {patient.age}y • {patient.sex}
                    </span>
                  </div>
                  <p className="text-xs text-amber-900 font-medium mt-0.5">
                    {patient.riskReason || 'Routine 30-day chronic checkup overdue'}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      setTargetPatient(patient);
                      setShowReadingModal(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-teal-600 text-white font-bold text-xs flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Check Vitals</span>
                  </button>
                  <button
                    onClick={() => navigate(`/patient/${patient.id}`)}
                    className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All Registered Village Patients */}
      <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Registered Patients in {selectedVillage} ({patients.length})
          </h3>
          <button
            onClick={() => navigate('/new-patient')}
            className="text-xs font-bold text-teal-700 hover:underline flex items-center gap-1"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Register New</span>
          </button>
        </div>

        <div className="space-y-2">
          {patients.map((p) => (
            <div
              key={p.id}
              onClick={() => navigate(`/patient/${p.id}`)}
              className="p-3 rounded-2xl border border-slate-200 hover:border-teal-300 transition-all flex items-center justify-between cursor-pointer"
            >
              <div>
                <p className="text-xs font-bold text-slate-900">{p.name}</p>
                <p className="text-[11px] text-slate-500">
                  {p.age}y • {p.conditions.join(', ')} • Last: {p.lastVisitDate || 'Never'}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          ))}
        </div>
      </div>

      {/* Quick Reading Modal */}
      {showReadingModal && targetPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-sm rounded-3xl bg-white border border-slate-200 p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Record Point-of-Care Vital</h3>
                <p className="text-xs text-slate-500">{targetPatient.name} ({targetPatient.village})</p>
              </div>
              <button
                onClick={() => setShowReadingModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveQuickReading} className="space-y-3">
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { type: 'systolic', label: 'Systolic', unit: 'mmHg' },
                  { type: 'diastolic', label: 'Diastolic', unit: 'mmHg' },
                  { type: 'bloodSugar', label: 'Sugar', unit: 'mg/dL' },
                  { type: 'weight', label: 'Weight', unit: 'kg' },
                ].map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => setQuickReadingType(item.type as ReadingType)}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      quickReadingType === item.type
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
                  Measurement Value
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={quickReadingValue}
                  onChange={(e) => setQuickReadingValue(e.target.value)}
                  placeholder="e.g. 140"
                  className="w-full text-center text-2xl font-black py-2.5 rounded-xl border border-slate-300 focus:outline-teal-600"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Field Observation / Notes</label>
                  <button
                    type="button"
                    onClick={handleVoiceInput}
                    className={`text-[11px] font-bold flex items-center gap-1 px-2 py-0.5 rounded-lg border cursor-pointer ${
                      isListening
                        ? 'bg-rose-50 border-rose-300 text-rose-700 animate-pulse'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-teal-600" />}
                    <span>{isListening ? t.listening : t.voiceInput}</span>
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={quickReadingNotes}
                  onChange={(e) => setQuickReadingNotes(e.target.value)}
                  placeholder="e.g. Patient took morning tablet, reports no headache"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-teal-600"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowReadingModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingReading}
                  className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {savingReading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Reading</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
