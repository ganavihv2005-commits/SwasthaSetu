import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Patient, Visit } from '../types';
import { recalculateAndSavePatientRisk } from '../services/riskService';
import { scheduleOrUpdateFollowUp, checkAndCreateDeteriorationAlert } from '../services/alertService';
import { logAudit } from '../services/auditService';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import {
  ArrowLeft,
  Stethoscope,
  Plus,
  Trash2,
  Save,
  AlertCircle,
  Activity,
  Pill,
  Mic,
  Square,
} from 'lucide-react';

const COMMON_SYMPTOMS = [
  'Headache',
  'Dizziness',
  'Blurred vision',
  'Chest discomfort',
  'Fatigue',
  'Swelling feet',
  'Polyuria',
  'None reported',
];

const COMMON_MEDICINES = [
  { name: 'Amlodipine', dosage: '5mg', frequency: 'Once daily (morning)' },
  { name: 'Amlodipine', dosage: '10mg', frequency: 'Once daily' },
  { name: 'Telmisartan', dosage: '40mg', frequency: 'Once daily' },
  { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily (after meals)' },
  { name: 'Metformin', dosage: '1000mg', frequency: 'Twice daily' },
  { name: 'Glimepiride', dosage: '1mg', frequency: 'Once daily (before breakfast)' },
  { name: 'Enalapril', dosage: '5mg', frequency: 'Once daily' },
  { name: 'Aspirin', dosage: '75mg', frequency: 'Once daily' },
];

export const NewVisitPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientIdParam = searchParams.get('patientId');
  const { currentUser, isHealthWorker } = useAuth();
  const { t, isListening, startSpeechRecognition, stopSpeechRecognition } = useLanguage();

  const [patientsList, setPatientsList] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>(patientIdParam || '');
  const [patient, setPatient] = useState<Patient | null>(null);

  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [systolic, setSystolic] = useState<string>('');
  const [diastolic, setDiastolic] = useState<string>('');
  const [bloodSugar, setBloodSugar] = useState<string>('');
  const [weight, setWeight] = useState<string>('');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [medicines, setMedicines] = useState<{ name: string; dosage: string; frequency: string }[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPatients = async () => {
      try {
        const snap = await getDocs(collection(db, 'patients'));
        let all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Patient));

        // Filter by assigned villages if health worker
        if (isHealthWorker && currentUser?.assignedVillages && currentUser.assignedVillages.length > 0) {
          all = all.filter((p) => currentUser.assignedVillages?.includes(p.village));
        }

        setPatientsList(all);
        if (patientIdParam) {
          const found = all.find((p) => p.id === patientIdParam);
          if (found) {
            setPatient(found);
            setSelectedPatientId(found.id);
          }
        } else if (all.length > 0 && !selectedPatientId) {
          setPatient(all[0]);
          setSelectedPatientId(all[0].id);
        }
      } catch (err) {
        console.error('Failed to load patients for visit:', err);
      }
    };
    loadPatients();
  }, [patientIdParam, isHealthWorker, currentUser?.assignedVillages]);

  const handlePatientChange = async (pId: string) => {
    setSelectedPatientId(pId);
    try {
      const pDoc = await getDoc(doc(db, 'patients', pId));
      if (pDoc.exists()) {
        setPatient({ id: pDoc.id, ...pDoc.data() } as Patient);
      }
    } catch (err) {
      console.error('Failed to fetch patient:', err);
    }
  };

  const toggleSymptom = (sym: string) => {
    if (sym === 'None reported') {
      setSelectedSymptoms(['None reported']);
      return;
    }
    const filtered = selectedSymptoms.filter((s) => s !== 'None reported');
    if (filtered.includes(sym)) {
      setSelectedSymptoms(filtered.filter((s) => s !== sym));
    } else {
      setSelectedSymptoms([...filtered, sym]);
    }
  };

  const addPresetMedicine = (preset: { name: string; dosage: string; frequency: string }) => {
    setMedicines([...medicines, { ...preset }]);
  };

  const removeMedicine = (index: number) => {
    setMedicines(medicines.filter((_, idx) => idx !== index));
  };

  const handleVoiceNotes = () => {
    if (isListening) {
      stopSpeechRecognition();
    } else {
      startSpeechRecognition((transcript: string) => {
        setNotes((prev) => (prev ? `${prev} ${transcript}` : transcript));
      });
    }
  };

  const handleSaveVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !patient) {
      setError('Please select a patient.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const visitId = `vis_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const sysNum = systolic ? parseInt(systolic, 10) : undefined;
      const diaNum = diastolic ? parseInt(diastolic, 10) : undefined;
      const sugarNum = bloodSugar ? parseInt(bloodSugar, 10) : undefined;
      const wtNum = weight ? parseFloat(weight) : undefined;

      const newVisit: Visit = {
        id: visitId,
        patientId: patient.id,
        village: patient.village,
        date,
        vitals: {
          systolic: sysNum,
          diastolic: diaNum,
          bloodSugar: sugarNum,
          weight: wtNum,
        },
        symptoms: selectedSymptoms.length > 0 ? selectedSymptoms : ['None reported'],
        medicines,
        notes: notes.trim(),
        enteredBy: currentUser?.name || 'Traveling Doctor',
        enteredByRole: currentUser?.role === 'admin' ? 'admin' : currentUser?.role === 'healthWorker' ? 'healthWorker' : 'doctor',
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'visits', visitId), newVisit);

      // Update patient's last visit date
      await updateDoc(doc(db, 'patients', patient.id), {
        lastVisitDate: date,
        updatedAt: new Date().toISOString(),
      });

      // Recalculate progression watch risk
      const riskResult = await recalculateAndSavePatientRisk(patient.id);

      if (riskResult) {
        // Schedule next follow-up alert based on risk status
        await scheduleOrUpdateFollowUp(patient.id, patient.village, riskResult.status);

        // Trigger deterioration alert if status is Worsening
        if (riskResult.status === 'Worsening') {
          await checkAndCreateDeteriorationAlert(patient.id, patient.village, riskResult.primaryReason);
        }
      }

      // Audit log
      if (currentUser) {
        await logAudit({
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          action: 'create',
          resource: 'visit',
          resourceId: visitId,
          details: `${currentUser.name} recorded clinic visit for ${patient.name} (${patient.village}). Vitals: BP ${sysNum || '--'}/${diaNum || '--'}, Sugar ${sugarNum || '--'}. Risk evaluated as ${riskResult?.status || 'Unknown'}.`,
        });
      }

      navigate(`/patient/${patient.id}`);
    } catch (err: any) {
      console.error('Failed to save visit:', err);
      setError('Failed to record visit: ' + (err.message || ''));
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
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">{t.newVisit}</h2>
          <p className="text-xs text-slate-500">
            Clinical Encounter Entry • Dr. Ravi Traveling Practice
          </p>
        </div>
      </div>

      <form onSubmit={handleSaveVisit} className="space-y-4">
        {error && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Patient Selection & Visit Date */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-800">Select Patient *</label>
            <select
              value={selectedPatientId}
              onChange={(e) => handlePatientChange(e.target.value)}
              className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 font-semibold bg-white focus:outline-teal-600 cursor-pointer"
            >
              {patientsList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.age}y, {p.village}) – {p.conditions.join(', ')}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-800">Visit Date *</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 font-semibold focus:outline-teal-600"
            />
          </div>
        </div>

        {/* Clinical Vitals Entry */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-teal-600" />
              <span>Clinical Vitals Entry</span>
            </h3>
            <span className="text-[11px] text-teal-700 font-medium">Touch-optimized</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Systolic */}
            <div className={`p-3 rounded-xl border ${patient?.conditions.includes('hypertension') ? 'bg-teal-50/40 border-teal-300' : 'bg-slate-50 border-slate-200'}`}>
              <label className="text-[11px] font-bold text-slate-700 block">
                {t.systolicBP}
              </label>
              <input
                type="number"
                inputMode="numeric"
                min={60}
                max={260}
                value={systolic}
                onChange={(e) => setSystolic(e.target.value)}
                placeholder="e.g. 138"
                className="w-full text-lg sm:text-xl font-black text-slate-900 bg-transparent border-0 p-1 focus:ring-0"
              />
              <span className="text-[10px] text-slate-500 font-medium">Target: 120-140</span>
            </div>

            {/* Diastolic */}
            <div className={`p-3 rounded-xl border ${patient?.conditions.includes('hypertension') ? 'bg-teal-50/40 border-teal-300' : 'bg-slate-50 border-slate-200'}`}>
              <label className="text-[11px] font-bold text-slate-700 block">
                {t.diastolicBP}
              </label>
              <input
                type="number"
                inputMode="numeric"
                min={40}
                max={160}
                value={diastolic}
                onChange={(e) => setDiastolic(e.target.value)}
                placeholder="e.g. 86"
                className="w-full text-lg sm:text-xl font-black text-slate-900 bg-transparent border-0 p-1 focus:ring-0"
              />
              <span className="text-[10px] text-slate-500 font-medium">Target: 70-90</span>
            </div>

            {/* Blood Sugar */}
            <div className={`p-3 rounded-xl border ${patient?.conditions.includes('diabetes') ? 'bg-teal-50/40 border-teal-300' : 'bg-slate-50 border-slate-200'}`}>
              <label className="text-[11px] font-bold text-slate-700 block">
                {t.bloodSugar}
              </label>
              <input
                type="number"
                inputMode="numeric"
                min={40}
                max={500}
                value={bloodSugar}
                onChange={(e) => setBloodSugar(e.target.value)}
                placeholder="e.g. 124"
                className="w-full text-lg sm:text-xl font-black text-slate-900 bg-transparent border-0 p-1 focus:ring-0"
              />
              <span className="text-[10px] text-slate-500 font-medium">Target: 70-130 mg/dL</span>
            </div>

            {/* Weight */}
            <div className="p-3 rounded-xl border bg-slate-50 border-slate-200">
              <label className="text-[11px] font-bold text-slate-700 block">
                {t.weight}
              </label>
              <input
                type="number"
                step="0.1"
                inputMode="decimal"
                min={20}
                max={200}
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="e.g. 64.5"
                className="w-full text-lg sm:text-xl font-black text-slate-900 bg-transparent border-0 p-1 focus:ring-0"
              />
              <span className="text-[10px] text-slate-500 font-medium">Target: 45-75 kg</span>
            </div>
          </div>
        </div>

        {/* Symptoms Chips */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-2.5">
          <label className="text-xs font-bold text-slate-800 block uppercase tracking-wider">
            {t.symptoms}
          </label>
          <div className="flex flex-wrap gap-2">
            {COMMON_SYMPTOMS.map((sym) => {
              const isSelected = selectedSymptoms.includes(sym);
              return (
                <button
                  key={sym}
                  type="button"
                  onClick={() => toggleSymptom(sym)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer min-h-[36px] ${
                    isSelected
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  {sym}
                </button>
              );
            })}
          </div>
        </div>

        {/* Medications Prescribed */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {t.medicines}
            </label>
            <span className="text-[11px] text-slate-500">Tap to prescribe</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {COMMON_MEDICINES.map((m, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => addPresetMedicine(m)}
                className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-900 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3 text-teal-600" />
                <span>{m.name} {m.dosage}</span>
              </button>
            ))}
          </div>

          {medicines.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              {medicines.map((med, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-900">{med.name} {med.dosage}</span>
                    <span className="text-slate-500 ml-2">({med.frequency})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeMedicine(idx)}
                    className="text-rose-600 hover:text-rose-800 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Clinical Notes with Voice Input */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 block uppercase tracking-wider">
              {t.notes}
            </label>
            <button
              type="button"
              onClick={handleVoiceNotes}
              className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
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
            rows={3}
            placeholder="Clinical field observations, diet counseling, and follow-up plan (voice input supported)..."
            className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 focus:outline-teal-600"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={saving}
          className="w-full py-3.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-md shadow-teal-700/20 flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-[0.99] min-h-[48px]"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : t.saveVisit}</span>
        </button>
      </form>
    </div>
  );
};
