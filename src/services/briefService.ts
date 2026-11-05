import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import type { Patient, Visit, Reading, Alert } from '../types';
import { evaluatePatientRisk, type PatientRiskEvaluation } from './riskService';

export interface StructuredPatientFacts {
  age: number;
  sex: string;
  village: string;
  conditions: string[];
  lastVisitSummary: string;
  recentTrends: string;
  overdueAlerts: string;
  guidelineChecks: string;
}

export interface VisitBriefResult {
  summary: string;
  source: 'gemini-3.8-flash' | 'offline_template';
  isAiGenerated: boolean;
  disclaimer: string;
  facts: StructuredPatientFacts;
}

export async function buildStructuredPatientFacts(
  patient: Patient,
  riskEval?: PatientRiskEvaluation
): Promise<StructuredPatientFacts> {
  const evalResult = riskEval || (await evaluatePatientRisk(patient.id)) || {
    parameterTrends: [],
  };

  // Find visits
  let lastVisitSummary = 'No previous clinical visits recorded.';
  try {
    const visitsQ = query(collection(db, 'visits'), where('patientId', '==', patient.id));
    const visitsSnap = await getDocs(visitsQ);
    const visits = visitsSnap.docs
      .map((d) => d.data() as Visit)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const lastVisit = visits.length > 0 ? visits[visits.length - 1] : null;
    if (lastVisit) {
      const vitalsPart: string[] = [];
      if (lastVisit.vitals.systolic && lastVisit.vitals.diastolic) {
        vitalsPart.push(`BP ${lastVisit.vitals.systolic}/${lastVisit.vitals.diastolic} mmHg`);
      }
      if (lastVisit.vitals.bloodSugar) {
        vitalsPart.push(`Blood Sugar ${lastVisit.vitals.bloodSugar} mg/dL`);
      }
      if (lastVisit.vitals.weight) {
        vitalsPart.push(`Weight ${lastVisit.vitals.weight} kg`);
      }
      const meds = lastVisit.medicines?.map((m) => `${m.name} ${m.dosage}`).join(', ') || 'None';
      lastVisitSummary = `Seen on ${lastVisit.date}. Vitals: ${vitalsPart.join(', ')}. Prescribed: ${meds}.`;
    }
  } catch (e) {
    console.warn('[VisitBrief] Could not load visits for facts:', e);
  }

  // Recent trends summary
  const trendsList = (evalResult.parameterTrends || [])
    .filter((t) => t.pointsCount > 0)
    .map((t) => `${t.parameterName}: ${t.reason}`)
    .join('; ');
  const recentTrends = trendsList || 'No recent monitoring readings available.';

  // Overdue alerts
  const todayStr = new Date().toISOString().split('T')[0];
  let overdueAlerts = 'No overdue follow-ups or alerts pending.';
  try {
    const alertsQ = query(
      collection(db, 'alerts'),
      where('patientId', '==', patient.id),
      where('status', '==', 'open')
    );
    const alertsSnap = await getDocs(alertsQ);
    const overdueList = alertsSnap.docs
      .map((d) => d.data() as Alert)
      .map((a) => {
        const isPast = a.dueDate < todayStr;
        return `${a.type.toUpperCase()}${isPast ? ' (OVERDUE since ' + a.dueDate + ')' : ' (Due: ' + a.dueDate + ')'}: ${a.reason}`;
      });
    if (overdueList.length > 0) overdueAlerts = overdueList.join(' | ');
  } catch (e) {
    console.warn('[VisitBrief] Could not load alerts for facts:', e);
  }

  // Guideline suggestions based on conditions
  const checks: string[] = [];
  if (patient.conditions.includes('hypertension')) {
    checks.push('Verify seated resting BP (target: 120-140/<90 mmHg); screen for occipital headache or dizziness; check medication adherence');
  }
  if (patient.conditions.includes('diabetes')) {
    checks.push('Perform fasting glucose (target: 70-130 mg/dL); conduct foot skin inspection; review meal timing');
  }
  const guidelineChecks = checks.join('. ') + '.';

  return {
    age: patient.age,
    sex: patient.sex,
    village: patient.village,
    conditions: patient.conditions,
    lastVisitSummary,
    recentTrends,
    overdueAlerts,
    guidelineChecks,
  };
}

export function buildDeterministicTemplateSummary(facts: StructuredPatientFacts, language: string = 'en'): string {
  const condList = facts.conditions.join(' & ');

  if (language === 'hi') {
    return `${facts.age} वर्ष (${facts.sex}, गाँव: ${facts.village}) को ${condList} की देखभाल दी जा रही है। हालिया रुझान: ${facts.recentTrends}। आज के दौरे की प्राथमिकता: ${facts.guidelineChecks}`;
  }
  if (language === 'kn') {
    return `${facts.age} ವರ್ಷ (${facts.sex}, ಗ್ರಾಮ: ${facts.village}) ${condList} ಚಿಕಿತ್ಸೆಯಲ್ಲಿದ್ದಾರೆ. ಇತ್ತೀಚಿನ ಪ್ರವೃತ್ತಿ: ${facts.recentTrends} ಇಂದಿನ ಭೇಟಿಯ ಆದ್ಯತೆ: ${facts.guidelineChecks}`;
  }

  return `Individual (${facts.age}y ${facts.sex}, ${facts.village}) is managed for ${condList}. Longitudinal monitoring indicates: ${facts.recentTrends} Prioritize today's checkup on: ${facts.guidelineChecks}`;
}

export async function generateVisitBrief(
  patient: Patient,
  options: {
    language?: 'en' | 'hi' | 'kn';
    forceOffline?: boolean;
  } = {}
): Promise<VisitBriefResult> {
  const facts = await buildStructuredPatientFacts(patient);
  const lang = options.language || 'en';
  const disclaimer = 'Decision support, not a diagnosis. Synthetic facts only.';

  const isSimulatedOffline =
    options.forceOffline ||
    (typeof window !== 'undefined' && localStorage.getItem('swasthasetu_simulate_offline') === 'true') ||
    (typeof navigator !== 'undefined' && !navigator.onLine);

  if (isSimulatedOffline) {
    const templateSummary = buildDeterministicTemplateSummary(facts, lang);
    return {
      summary: templateSummary,
      source: 'offline_template',
      isAiGenerated: false,
      disclaimer,
      facts,
    };
  }

  // Attempt server-side Gemini generation (strictly de-identified facts)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch('/api/gemini/visit-brief', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        age: facts.age,
        sex: facts.sex,
        village: facts.village,
        conditions: facts.conditions,
        lastVisitSummary: facts.lastVisitSummary,
        recentTrends: facts.recentTrends,
        overdueAlerts: facts.overdueAlerts,
        guidelineChecks: facts.guidelineChecks,
        language: lang,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    const data = await res.json();
    if (data.summary && data.summary.trim().length > 0) {
      return {
        summary: data.summary.trim(),
        source: 'gemini-3.8-flash',
        isAiGenerated: true,
        disclaimer,
        facts,
      };
    }

    throw new Error('Empty summary from Gemini');
  } catch (err) {
    console.warn('[VisitBrief] Gemini call failed or offline, falling back to deterministic template:', err);
    const templateSummary = buildDeterministicTemplateSummary(facts, lang);
    return {
      summary: templateSummary,
      source: 'offline_template',
      isAiGenerated: false,
      disclaimer,
      facts,
    };
  }
}

// Gentle patient summary generator for Patient Portal
export async function generatePatientSummary(
  patient: Patient,
  readings: Reading[],
  visits: Visit[],
  lang: 'en' | 'hi' | 'kn' = 'en'
): Promise<{ summary: string; isAi: boolean }> {
  const latestReadingsText = readings
    .slice(0, 3)
    .map((r) => `${r.type}: ${r.value}`)
    .join(', ');

  const medicines = visits.length > 0 && visits[0].medicines
    ? visits[0].medicines.map((m) => m.name).join(', ')
    : 'Prescribed daily tablets';

  const nextVisit = patient.lastVisitDate || 'Upcoming rounds';

  // Fallbacks
  const fallbackMap = {
    en: `Your health vitals are being monitored by your village care team. Please continue your daily medications (${medicines}) and visit Dr. Ravi on upcoming village clinic rounds.`,
    hi: `आपकी स्वास्थ्य स्थिति पर आपकी ग्राम आशा दीदी और डॉक्टर रवि द्वारा निगरानी रखी जा रही है। कृपया अपनी निर्धारित दवाइयाँ (${medicines}) समय पर लेते रहें और आगामी क्लिनिक में अवश्य मिलें।`,
    kn: `ನಿಮ್ಮ ಆರೋಗ್ಯದ ಅಳತೆಗಳನ್ನು ನಿಮ್ಮ ಗ್ರಾಮದ ಆಶಾ ಮತ್ತು ವೈದ್ಯರು ಗಮನಿಸುತ್ತಿದ್ದಾರೆ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ನಿಗದಿತ ಔಷಧಿಗಳನ್ನು (${medicines}) ನಿಯಮಿತವಾಗಿ ತೆಗೆದುಕೊಳ್ಳಿ ಮತ್ತು ಮುಂಬರುವ ಗ್ರಾಮ ಕ್ಲಿನಿಕ್‌ಗೆ ಭೇಟಿ ನೀಡಿ.`,
  };

  const isSimulatedOffline =
    (typeof window !== 'undefined' && localStorage.getItem('swasthasetu_simulate_offline') === 'true') ||
    (typeof navigator !== 'undefined' && !navigator.onLine);

  if (isSimulatedOffline) {
    return { summary: fallbackMap[lang] || fallbackMap.en, isAi: false };
  }

  try {
    const res = await fetch('/api/gemini/patient-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        age: patient.age,
        sex: patient.sex,
        village: patient.village,
        conditions: patient.conditions,
        recentReadings: latestReadingsText,
        medicines,
        nextVisitDate: nextVisit,
        language: lang,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.summary) {
        return { summary: data.summary, isAi: true };
      }
    }
  } catch (err) {
    console.warn('[PatientSummary] Gemini call failed, using gentle template fallback:', err);
  }

  return { summary: fallbackMap[lang] || fallbackMap.en, isAi: false };
}
