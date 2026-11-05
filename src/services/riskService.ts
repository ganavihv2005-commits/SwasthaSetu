import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import type { Patient, ReadingType, RiskStatus, Guideline, Condition, Visit, Reading } from '../types';
import { checkAndCreateDeteriorationAlert } from './alertService';

export interface SlopeCalculationMath {
  n: number;
  xValues: number[];
  yValues: number[];
  sumX: number;
  sumY: number;
  sumXY: number;
  sumX2: number;
  denominator: number;
  numerator: number;
  slope: number;
  totalChange: number;
}

export interface ParameterTrend {
  parameter: ReadingType;
  parameterName: string;
  unit: string;
  pointsCount: number;
  readings: { date: string; value: number; source: 'visit' | 'reading'; displayDate: string }[];
  slope: number;
  mathDetails?: SlopeCalculationMath;
  latestValue: number;
  targetMin: number;
  targetMax: number;
  status: 'improving' | 'stable' | 'worsening' | 'watch' | 'insufficient_data';
  reason: string;
  guidelineSource: string;
  classificationRule: string;
}

export interface PatientRiskEvaluation {
  patientId: string;
  patientName?: string;
  isHeroPatient?: boolean;
  status: RiskStatus;
  primaryReason: string;
  parameterTrends: ParameterTrend[];
  guidelineSources: string[];
  disclaimer: string;
  evaluatedAt: string;
}

export const PARAMETER_NAMES: Record<ReadingType, { name: string; unit: string }> = {
  systolic: { name: 'Systolic Blood Pressure', unit: 'mmHg' },
  diastolic: { name: 'Diastolic Blood Pressure', unit: 'mmHg' },
  bloodSugar: { name: 'Blood Sugar (Fasting)', unit: 'mg/dL' },
  weight: { name: 'Body Weight', unit: 'kg' },
};

export const DEFAULT_GUIDELINES: Guideline[] = [
  {
    id: 'guide_sys',
    parameter: 'systolic',
    condition: 'hypertension',
    targetMin: 120,
    targetMax: 140,
    unit: 'mmHg',
    source: 'Indian Guidelines on Hypertension (IGH-IV) [Demo]',
    note: 'Resting systolic target. Demo values, replace with guideline-reviewed ranges.',
    isDemo: true,
  },
  {
    id: 'guide_dia',
    parameter: 'diastolic',
    condition: 'hypertension',
    targetMin: 70,
    targetMax: 90,
    unit: 'mmHg',
    source: 'Indian Guidelines on Hypertension (IGH-IV) [Demo]',
    note: 'Diastolic BP target. Demo values, replace with guideline-reviewed ranges.',
    isDemo: true,
  },
  {
    id: 'guide_sugar',
    parameter: 'bloodSugar',
    condition: 'diabetes',
    targetMin: 70,
    targetMax: 130,
    unit: 'mg/dL',
    source: 'ICMR Guidelines for Type 2 Diabetes [Demo]',
    note: 'Fasting glucose target. Demo values, replace with guideline-reviewed ranges.',
    isDemo: true,
  },
  {
    id: 'guide_wt',
    parameter: 'weight',
    condition: 'general',
    targetMin: 45,
    targetMax: 75,
    unit: 'kg',
    source: 'NHM Rural Clinical Reference [Demo]',
    note: 'Weight stability target. Demo values, replace with guideline-reviewed ranges.',
    isDemo: true,
  },
];

export function computePatientRiskFromData(
  patient: Patient,
  visits: Visit[],
  readings: Reading[],
  guidelines: Guideline[] = DEFAULT_GUIDELINES
): PatientRiskEvaluation {
  const patientConditions: Condition[] = patient?.conditions || ['hypertension'];
  const isHeroPatient = patient.id === 'pat_hero_rameshwar';

  const allParameters: ReadingType[] = ['systolic', 'diastolic', 'bloodSugar', 'weight'];
  const relevantParams = new Set<ReadingType>(['weight']);

  if (patientConditions.includes('hypertension')) {
    relevantParams.add('systolic');
    relevantParams.add('diastolic');
  }
  if (patientConditions.includes('diabetes')) {
    relevantParams.add('bloodSugar');
  }

  const parameterTrends: ParameterTrend[] = [];

  for (const param of allParameters) {
    const isRelevant = relevantParams.has(param);
    const guideline = guidelines.find((g) => g.parameter === param);
    const targetMin = guideline ? guideline.targetMin : param === 'systolic' ? 120 : param === 'diastolic' ? 70 : param === 'bloodSugar' ? 70 : 45;
    const targetMax = guideline ? guideline.targetMax : param === 'systolic' ? 140 : param === 'diastolic' ? 90 : param === 'bloodSugar' ? 130 : 75;
    const guidelineSource = guideline ? guideline.source : 'Clinical Reference [Demo]';

    const points: { date: string; value: number; source: 'visit' | 'reading'; displayDate: string; timestamp: number }[] = [];

    visits.forEach((v) => {
      if (v.vitals && v.vitals[param] !== undefined && v.vitals[param] !== null) {
        const val = Number(v.vitals[param]);
        if (!isNaN(val)) {
          points.push({
            date: v.date,
            displayDate: v.date,
            value: val,
            source: 'visit',
            timestamp: new Date(v.date).getTime(),
          });
        }
      }
    });

    readings.forEach((r) => {
      if (r.type === param && r.value !== undefined && r.value !== null) {
        const val = Number(r.value);
        if (!isNaN(val)) {
          const dStr = r.measuredAt.split('T')[0];
          points.push({
            date: dStr,
            displayDate: dStr,
            value: val,
            source: 'reading',
            timestamp: new Date(r.measuredAt).getTime(),
          });
        }
      }
    });

    points.sort((a, b) => a.timestamp - b.timestamp);

    const lastPoints = points.slice(-4).map((p) => ({
      date: p.date,
      value: p.value,
      source: p.source,
      displayDate: p.displayDate,
    }));

    if (lastPoints.length < 3) {
      const notTrackedReason = !isRelevant
        ? `Not diagnosed with ${param === 'bloodSugar' ? 'Diabetes' : 'Hypertension'}. Parameter not tracked for this patient.`
        : `Only ${lastPoints.length} reading(s) recorded. Progression Watch requires at least 3 longitudinal readings to compute linear slope (never guessing).`;

      parameterTrends.push({
        parameter: param,
        parameterName: PARAMETER_NAMES[param].name,
        unit: PARAMETER_NAMES[param].unit,
        pointsCount: lastPoints.length,
        readings: lastPoints,
        slope: 0,
        latestValue: lastPoints.length > 0 ? lastPoints[lastPoints.length - 1].value : 0,
        targetMin,
        targetMax,
        status: 'insufficient_data',
        reason: notTrackedReason,
        guidelineSource,
        classificationRule: 'Points < 3 -> Insufficient Data',
      });
      continue;
    }

    const n = lastPoints.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    const xValues: number[] = [];
    const yValues: number[] = [];

    lastPoints.forEach((p, idx) => {
      xValues.push(idx);
      yValues.push(p.value);
      sumX += idx;
      sumY += p.value;
      sumXY += idx * p.value;
      sumX2 += idx * idx;
    });

    const denominator = n * sumX2 - sumX * sumX;
    const numerator = n * sumXY - sumX * sumY;
    const slopeRaw = denominator !== 0 ? numerator / denominator : 0;
    const slope = parseFloat(slopeRaw.toFixed(2));

    const latestValue = lastPoints[n - 1].value;
    const firstValue = lastPoints[0].value;
    const totalChange = parseFloat((latestValue - firstValue).toFixed(1));

    const mathDetails: SlopeCalculationMath = {
      n,
      xValues,
      yValues,
      sumX,
      sumY,
      sumXY,
      sumX2,
      denominator,
      numerator,
      slope,
      totalChange,
    };

    let status: 'improving' | 'stable' | 'worsening' | 'watch' = 'stable';
    let reason = '';
    let classificationRule = '';

    if (latestValue > targetMax) {
      if (slope > 0.1) {
        status = 'worsening';
        classificationRule = `Latest (${latestValue} ${PARAMETER_NAMES[param].unit}) > Target Max (${targetMax}) AND Slope (+${slope}) > 0 -> WORSENING`;
        reason = `${PARAMETER_NAMES[param].name} rising (+${totalChange > 0 ? `+${totalChange}` : totalChange} ${PARAMETER_NAMES[param].unit} slope +${slope}/reading over last ${n} readings), currently ${latestValue} ${PARAMETER_NAMES[param].unit} above target (${targetMin}-${targetMax} ${PARAMETER_NAMES[param].unit}).`;
      } else if (slope < -0.5) {
        status = 'improving';
        classificationRule = `Latest (${latestValue}) > Target Max (${targetMax}) BUT Slope (${slope}) < 0 -> IMPROVING (WATCH)`;
        reason = `${PARAMETER_NAMES[param].name} currently ${latestValue} ${PARAMETER_NAMES[param].unit} (above target ${targetMin}-${targetMax}), but improving downward toward target range (slope ${slope}/reading).`;
      } else {
        status = 'watch';
        classificationRule = `Latest (${latestValue}) > Target Max (${targetMax}) AND Slope (${slope}) is flat -> WATCH (Elevated)`;
        reason = `${PARAMETER_NAMES[param].name} persistently elevated at ${latestValue} ${PARAMETER_NAMES[param].unit} (target: ${targetMin}-${targetMax} ${PARAMETER_NAMES[param].unit}). Stable slope (${slope > 0 ? `+${slope}` : slope}). Close monitoring required.`;
      }
    } else if (latestValue < targetMin) {
      if (slope < -0.1) {
        status = 'worsening';
        classificationRule = `Latest (${latestValue} ${PARAMETER_NAMES[param].unit}) < Target Min (${targetMin}) AND Slope (${slope}) < 0 -> WORSENING`;
        reason = `${PARAMETER_NAMES[param].name} dropping rapidly (${totalChange} ${PARAMETER_NAMES[param].unit} over last ${n} readings), currently ${latestValue} ${PARAMETER_NAMES[param].unit} below target range (${targetMin}-${targetMax} ${PARAMETER_NAMES[param].unit}).`;
      } else if (slope > 0.5) {
        status = 'improving';
        classificationRule = `Latest (${latestValue}) < Target Min (${targetMin}) BUT Slope (+${slope}) > 0 -> IMPROVING (WATCH)`;
        reason = `${PARAMETER_NAMES[param].name} below target at ${latestValue} ${PARAMETER_NAMES[param].unit}, but trending upward toward target range (${targetMin}-${targetMax}).`;
      } else {
        status = 'watch';
        classificationRule = `Latest (${latestValue}) < Target Min (${targetMin}) AND Slope (${slope}) is flat -> WATCH (Sub-target)`;
        reason = `${PARAMETER_NAMES[param].name} below guideline target (${latestValue} vs ${targetMin}-${targetMax} ${PARAMETER_NAMES[param].unit}). Observation recommended.`;
      }
    } else {
      if (Math.abs(slope) > 4.5) {
        status = 'watch';
        classificationRule = `Latest (${latestValue}) within range BUT rapid slope (${slope}) -> WATCH`;
        reason = `${PARAMETER_NAMES[param].name} within target (${latestValue} ${PARAMETER_NAMES[param].unit}), but experiencing rapid fluctuation (slope ${slope > 0 ? `+${slope}` : slope}).`;
      } else {
        status = 'stable';
        classificationRule = `Latest (${latestValue}) within target (${targetMin}-${targetMax}) AND Slope (${slope}) stable -> STABLE`;
        reason = `${PARAMETER_NAMES[param].name} stable at ${latestValue} ${PARAMETER_NAMES[param].unit}, well controlled within guideline target range (${targetMin}-${targetMax} ${PARAMETER_NAMES[param].unit}).`;
      }
    }

    parameterTrends.push({
      parameter: param,
      parameterName: PARAMETER_NAMES[param].name,
      unit: PARAMETER_NAMES[param].unit,
      pointsCount: n,
      readings: lastPoints,
      slope,
      mathDetails,
      latestValue,
      targetMin,
      targetMax,
      status,
      reason,
      guidelineSource,
      classificationRule,
    });
  }

  const relevantTrends = parameterTrends.filter((t) => relevantParams.has(t.parameter));
  const evaluatedTrends = relevantTrends.filter((t) => t.status !== 'insufficient_data');

  let patientStatus: RiskStatus = 'Stable';
  let primaryReason = 'All monitored chronic vitals are stable within guideline ranges.';

  const worseningTrends = relevantTrends.filter((t) => t.status === 'worsening');
  const watchTrends = relevantTrends.filter((t) => t.status === 'watch' || t.status === 'improving');

  if (worseningTrends.length > 0) {
    patientStatus = 'Worsening';
    primaryReason = worseningTrends.map((t) => t.reason).join(' ');
  } else if (watchTrends.length > 0) {
    patientStatus = 'Watch';
    primaryReason = watchTrends.map((t) => t.reason).join(' ');
  } else if (evaluatedTrends.length === 0) {
    patientStatus = 'Insufficient Data';
    primaryReason = 'Insufficient readings for longitudinal progression watch (needs >= 3 readings).';
  } else {
    patientStatus = 'Stable';
    primaryReason = evaluatedTrends.map((t) => t.reason).join(' ');
  }

  const guidelineSources = Array.from(new Set(relevantTrends.map((t) => t.guidelineSource)));

  return {
    patientId: patient.id,
    patientName: patient.name,
    isHeroPatient,
    status: patientStatus,
    primaryReason,
    parameterTrends,
    guidelineSources,
    disclaimer: 'Decision support, not a diagnosis. Calculated from verified longitudinal readings.',
    evaluatedAt: new Date().toISOString(),
  };
}

export async function evaluatePatientRisk(patientId: string): Promise<PatientRiskEvaluation | null> {
  try {
    const patientDoc = await getDoc(doc(db, 'patients', patientId));
    if (!patientDoc.exists()) return null;
    const patient = { id: patientDoc.id, ...patientDoc.data() } as Patient;

    const visitsQ = query(collection(db, 'visits'), where('patientId', '==', patientId));
    const visitsSnap = await getDocs(visitsQ);
    const visits = visitsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Visit));

    const readingsQ = query(collection(db, 'readings'), where('patientId', '==', patientId));
    const readingsSnap = await getDocs(readingsQ);
    const readings = readingsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Reading));

    const guideSnap = await getDocs(collection(db, 'guidelines'));
    const guidelines = guideSnap.empty
      ? DEFAULT_GUIDELINES
      : guideSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Guideline));

    return computePatientRiskFromData(patient, visits, readings, guidelines);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `patients/${patientId}`);
  }
}

export async function recalculateAndSavePatientRisk(patientId: string): Promise<PatientRiskEvaluation | null> {
  const evalResult = await evaluatePatientRisk(patientId);
  if (!evalResult) return null;

  try {
    const patientDoc = await getDoc(doc(db, 'patients', patientId));
    if (patientDoc.exists()) {
      const patient = patientDoc.data() as Patient;
      const finalStatus = patient.riskOverridden ? patient.riskStatus : evalResult.status;
      const finalReason = patient.riskOverridden
        ? `[Doctor Override: ${patient.riskOverriddenReason}] Math result: ${evalResult.primaryReason}`
        : evalResult.primaryReason;

      await updateDoc(doc(db, 'patients', patientId), {
        riskStatus: finalStatus,
        riskReason: finalReason,
        updatedAt: new Date().toISOString(),
      });

      if (finalStatus === 'Worsening') {
        await checkAndCreateDeteriorationAlert(patientId, patient.village, finalReason);
      }
    }
    return evalResult;
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `patients/${patientId}`);
  }
}

export async function recalculateAllPatientsRisk(): Promise<void> {
  try {
    const snap = await getDocs(collection(db, 'patients'));
    for (const pDoc of snap.docs) {
      await recalculateAndSavePatientRisk(pDoc.id);
    }
  } catch (err) {
    console.warn('Failed to recalculate all patient risks:', err);
  }
}
