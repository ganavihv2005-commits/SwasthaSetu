import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  collection,
  doc,
  getDocs,
  setDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Patient, Reading, ReadingType } from '../types';
import { recalculateAndSavePatientRisk } from '../services/riskService';
import { scheduleOrUpdateFollowUp, checkAndCreateDeteriorationAlert } from '../services/alertService';
import { logAudit } from '../services/auditService';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import {
  ArrowLeft,
  HeartPulse,
  Save,
  AlertCircle,
  Activity,
  Check,
  Mic,
  Square,
} from 'lucide-react';

export const AddReadingPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientIdParam = searchParams.get('patientId');
  const { currentUser, canAddReading, isHealthWorker } = useAuth();
  const { t, isListening, startSpeechRecognition, stopSpeechRecognition } = useLanguage();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>(patientIdParam || '');
  const [type, setType] = useState<ReadingType>('systolic');
  const [value, setValue] = useState<string>('');
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDocs(collection(db, 'patients'));
        let all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Patient));

        if (isHealthWorker && currentUser?.assignedVillages && currentUser.assignedVillages.length > 0) {
          all = all.filter((p) => currentUser.assignedVillages?.includes(p.village));
        }

        setPatients(all);
        if (patientIdParam) {
          setSelectedPatientId(patientIdParam);
        } else if (all.length > 0 && !selectedPatientId) {
          setSelectedPatientId(all[0].id);
        }
      } catch (err) {
        console.error('Failed to load patients for reading:', err);
      }
    };
    load();
  }, [patientIdParam, isHealthWorker, currentUser?.assignedVillages]);

  if (!canAddReading) {
    return (
      <div className="max-w-md mx-auto p-6 text-center text-xs text-rose-600">
        You do not have permission to add clinical readings.
      </div>
    );
  }

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  const handleVoiceNotes = () => {
    if (isListening) {
      stopSpeechRecognition();
    } else {
      startSpeechRecognition((transcript: string) => {
        setNotes((prev) => (prev ? `${prev} ${transcript}` : transcript));
      });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !selectedPatient) {
      setError('Please select a patient.');
      return;
    }

    const numVal = parseFloat(value);
    if (isNaN(numVal) || numVal <= 0) {
      setError('Please enter a valid reading number.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const readingId = `read_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newReading: Reading = {
        id: readingId,
        patientId: selectedPatientId,
        village: selectedPatient.village,
        type,
        value: numVal,
        measuredAt: `${date}T${new Date().toTimeString().split(' ')[0]}`,
        enteredBy: currentUser?.name || 'Healthcare Worker',
        source: currentUser?.role === 'patient' ? 'patient' : 'healthWorker',
        notes: notes.trim(),
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'readings', readingId), newReading);

      // Recalculate progression risk
      const evalResult = await recalculateAndSavePatientRisk(selectedPatientId);

      if (evalResult) {
        // Refresh follow-up
        await scheduleOrUpdateFollowUp(selectedPatientId, selectedPatient.village, evalResult.status);

        // Deterioration alert if status is Worsening
        if (evalResult.status === 'Worsening') {
          await checkAndCreateDeteriorationAlert(selectedPatientId, selectedPatient.village, evalResult.primaryReason);
        }
      }

      // Audit log
      if (currentUser) {
        await logAudit({
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          action: 'create',
          resource: 'reading',
          resourceId: readingId,
          details: `${currentUser.name} logged between-visit reading (${type}: ${numVal}) for ${selectedPatient.name}. Status evaluated: ${evalResult?.status || 'Unknown'}.`,
        });
      }

      navigate(`/patient/${selectedPatientId}`);
    } catch (err: any) {
      console.error('Failed to save reading:', err);
      setError('Failed to record reading: ' + (err.message || ''));
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-3.5 py-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">{t.addReading}</h2>
          <p className="text-xs text-slate-500">
            Between-Visit Home Monitoring • ASHA / ANM Field Check
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {error && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-3.5">
          {/* Patient */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-800">Select Patient *</label>
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 font-semibold bg-white focus:outline-teal-600 cursor-pointer"
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.village}) – {p.conditions.join(', ')}
                </option>
              ))}
            </select>
          </div>

          {/* Reading Type */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-800">Reading Parameter *</label>
            <div className="grid grid-cols-2 gap-2 pt-1">
              {[
                { type: 'systolic', label: 'Systolic BP (mmHg)' },
                { type: 'diastolic', label: 'Diastolic BP (mmHg)' },
                { type: 'bloodSugar', label: 'Blood Sugar (mg/dL)' },
                { type: 'weight', label: 'Body Weight (kg)' },
              ].map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => setType(item.type as ReadingType)}
                  className={`p-3 rounded-xl text-left border text-xs font-bold transition-all cursor-pointer min-h-[48px] ${
                    type === item.type
                      ? 'bg-teal-50 border-teal-600 text-teal-900 ring-1 ring-teal-600'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Value input (Large) */}
          <div className="space-y-1 pt-1">
            <label className="text-xs font-bold text-slate-800">Measured Value *</label>
            <div className="relative">
              <input
                type="number"
                step="any"
                inputMode="decimal"
                required
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="e.g. 154"
                className="w-full text-2xl font-black text-slate-900 p-3 rounded-xl border border-slate-200 focus:outline-teal-600"
              />
              <span className="absolute right-4 top-4 text-xs font-bold text-slate-400 uppercase">
                {type === 'systolic' || type === 'diastolic' ? 'mmHg' : type === 'bloodSugar' ? 'mg/dL' : 'kg'}
              </span>
            </div>
          </div>

          {/* Date */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-800">Date Measured *</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 font-semibold focus:outline-teal-600"
            />
          </div>

          {/* Field Notes with Voice Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 block">Monitoring Notes (Optional)</label>
              <button
                type="button"
                onClick={handleVoiceNotes}
                className={`flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
                  isListening
                    ? 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
                    : 'bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100'
                }`}
              >
                {isListening ? <Square className="w-3.5 h-3.5 fill-current" /> : <Mic className="w-3.5 h-3.5" />}
                <span>{isListening ? t.stopListening : t.startVoiceInput}</span>
              </button>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Patient took morning dose 1 hour prior. No severe symptoms (voice input supported)..."
              className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 focus:outline-teal-600"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-md shadow-teal-700/20 flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-[0.99] min-h-[48px]"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Recording...' : t.saveReading}</span>
        </button>
      </form>
    </div>
  );
};
