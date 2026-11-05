import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Patient, Condition } from '../types';
import { VILLAGES } from '../db/seedData';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { logAudit } from '../services/auditService';
import {
  ArrowLeft,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  KeyRound,
} from 'lucide-react';

export const NewPatientPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, canRegisterPatient, isHealthWorker } = useAuth();
  const { t } = useLanguage();

  const allowedVillages =
    isHealthWorker && currentUser?.assignedVillages && currentUser.assignedVillages.length > 0
      ? currentUser.assignedVillages
      : VILLAGES;

  const [name, setName] = useState('');
  const [age, setAge] = useState<string>('');
  const [sex, setSex] = useState<'Male' | 'Female' | 'Other'>('Female');
  const [village, setVillage] = useState<string>(allowedVillages[0] || 'Kasmar');
  const [conditions, setConditions] = useState<Condition[]>(['hypertension']);
  const [consentGiven, setConsentGiven] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canRegisterPatient) {
    return (
      <div className="max-w-md mx-auto p-6 text-center text-xs text-rose-600">
        You do not have permission to register new patients.
      </div>
    );
  }

  const toggleCondition = (cond: Condition) => {
    if (conditions.includes(cond)) {
      setConditions(conditions.filter((c) => c !== cond));
    } else {
      setConditions([...conditions, cond]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentGiven) {
      setError('Informed consent is mandatory by medical ethics and rural health protocol.');
      return;
    }

    if (!name.trim()) {
      setError('Please provide patient name.');
      return;
    }

    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum <= 0 || ageNum > 120) {
      setError('Please provide a valid age.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const now = new Date();
      const patientId = `pat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      // Generate 7-day link code
      const prefix = name.trim().replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'PAT';
      const randDigits = Math.floor(100 + Math.random() * 900);
      const linkCode = `${prefix}${randDigits}`;
      const linkCodeExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const newPatient: Patient = {
        id: patientId,
        name: name.trim(),
        age: ageNum,
        sex,
        village,
        conditions,
        consentGiven: true,
        consentAt: now.toISOString(),
        lastVisitDate: '',
        riskStatus: 'Insufficient Data',
        riskReason: 'New patient registered. Baseline clinical visit required.',
        linkCode,
        linkCodeExpiresAt,
        createdAt: now.toISOString(),
      };

      await setDoc(doc(db, 'patients', patientId), newPatient);

      // Audit log
      if (currentUser) {
        await logAudit({
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          action: 'create',
          resource: 'patient',
          resourceId: patientId,
          details: `${currentUser.name} registered new patient ${newPatient.name} (${newPatient.village}) with documented informed consent. Link code: ${linkCode}`,
        });
      }

      // Navigate to patient page
      navigate(`/patient/${patientId}`);
    } catch (err: any) {
      console.error('Failed to save patient:', err);
      setError('Failed to save patient to database. ' + (err.message || ''));
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-3.5 py-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">{t.newPatient}</h2>
          <p className="text-xs text-slate-500">
            Rural Longitudinal Registry • Jharkhand Mobile Clinic
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Error message */}
        {error && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Demographics Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-3.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Demographic Information
          </h3>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-800">{t.patientName} *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Somra Soren"
              className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 focus:outline-teal-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-800">{t.age} *</label>
              <input
                type="number"
                required
                min={1}
                max={120}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Years (e.g. 52)"
                className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 focus:outline-teal-600"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-800">{t.gender}</label>
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value as any)}
                className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 bg-white focus:outline-teal-600"
              >
                <option value="Female">{t.female}</option>
                <option value="Male">{t.male}</option>
                <option value="Other">{t.other}</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-800">{t.village} *</label>
            <select
              value={village}
              onChange={(e) => setVillage(e.target.value)}
              className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 bg-white focus:outline-teal-600 font-medium"
            >
              {allowedVillages.map((v: string) => (
                <option key={v} value={v}>
                  {v} Village
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Chronic Conditions Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {t.conditions}
          </h3>
          <p className="text-xs text-slate-500">
            Select chronic health conditions for targeted guideline progression watch:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => toggleCondition('hypertension')}
              className={`p-3 rounded-xl border text-left flex items-center justify-between cursor-pointer transition-all ${
                conditions.includes('hypertension')
                  ? 'bg-teal-50 border-teal-600 text-teal-900 ring-1 ring-teal-600'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div>
                <p className="text-xs font-bold">{t.hypertension}</p>
                <p className="text-[11px] text-slate-500">BP target: 120-140 mmHg</p>
              </div>
              {conditions.includes('hypertension') && <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />}
            </button>

            <button
              type="button"
              onClick={() => toggleCondition('diabetes')}
              className={`p-3 rounded-xl border text-left flex items-center justify-between cursor-pointer transition-all ${
                conditions.includes('diabetes')
                  ? 'bg-teal-50 border-teal-600 text-teal-900 ring-1 ring-teal-600'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div>
                <p className="text-xs font-bold">{t.diabetes}</p>
                <p className="text-[11px] text-slate-500">Fasting sugar target: 70-130 mg/dL</p>
              </div>
              {conditions.includes('diabetes') && <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />}
            </button>
          </div>
        </div>

        {/* Responsible AI & Privacy Consent Card (MANDATORY) */}
        <div className="rounded-2xl border-2 border-teal-300 bg-teal-50/70 p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-teal-900 font-bold text-xs uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-teal-700" />
            <span>{t.consentMandatory}</span>
          </div>

          <div className="rounded-xl bg-white p-3.5 border border-teal-200 text-xs text-slate-700 leading-relaxed font-medium">
            "{t.consentText}"
          </div>

          <label className="flex items-start gap-3 cursor-pointer pt-1 select-none">
            <input
              type="checkbox"
              checked={consentGiven}
              onChange={(e) => setConsentGiven(e.target.checked)}
              className="mt-0.5 w-5 h-5 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
            />
            <span className="text-xs font-bold text-slate-900 leading-snug">
              Patient oral/written informed consent has been obtained and verified.
              <span className="block text-[11px] font-normal text-slate-600 mt-0.5">
                Required by medical ethics before creating longitudinal health records.
              </span>
            </span>
          </label>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={!consentGiven || saving}
          className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[48px] ${
            consentGiven && !saving
              ? 'bg-teal-600 hover:bg-teal-700 shadow-teal-700/20 active:scale-[0.99]'
              : 'bg-slate-400 cursor-not-allowed opacity-60'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>{saving ? 'Registering...' : t.savePatient}</span>
        </button>

        {!consentGiven && (
          <p className="text-center text-[11px] text-amber-700 font-medium">
            * Checkbox above must be checked to enable patient registration.
          </p>
        )}
      </form>
    </div>
  );
};
