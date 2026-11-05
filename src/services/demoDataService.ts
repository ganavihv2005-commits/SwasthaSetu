import {
  collection,
  query,
  where,
  getDocs,
  doc,
  writeBatch,
  setDoc,
  deleteDoc,
  limit,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import type { Patient, Visit, Reading, Alert, Guideline, Condition, RiskStatus } from '../types';
import { logAudit } from './auditService';
import { DEFAULT_GUIDELINES } from './riskService';

export const VILLAGES = ['Kasmar', 'Petarwar', 'Gola'];

export async function hasDemoData(): Promise<boolean> {
  try {
    const q = query(collection(db, 'patients'), where('isDemo', '==', true), limit(1));
    const snap = await getDocs(q);
    return !snap.empty;
  } catch (err) {
    return false;
  }
}

export async function ensureDefaultGuidelines(): Promise<void> {
  try {
    const snap = await getDocs(collection(db, 'guidelines'));
    if (snap.empty) {
      const batch = writeBatch(db);
      DEFAULT_GUIDELINES.forEach((g) => {
        const ref = doc(db, 'guidelines', g.id);
        batch.set(ref, g);
      });
      await batch.commit();
      console.log('[SwasthaSetu] Initialized default clinical guidelines.');
    }
  } catch (err) {
    console.warn('[SwasthaSetu] Could not initialize guidelines:', err);
  }
}

export async function loadDemoDataset(
  adminUser?: { id?: string; name?: string; role?: string } | string
): Promise<void> {
  const userObj =
    typeof adminUser === 'string'
      ? { id: 'admin_sys', name: adminUser, role: 'admin' }
      : {
          id: adminUser?.id || 'admin_sys',
          name: adminUser?.name || 'Administrator',
          role: adminUser?.role || 'admin',
        };
  const batch = writeBatch(db);

  const now = new Date('2026-11-05T09:00:00Z');
  const daysAgo = (d: number) => {
    const date = new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
    return date.toISOString().split('T')[0];
  };

  // 1. Hero patient: Rameshwar Mahto
  const heroId = 'pat_hero_rameshwar';
  const heroPatient: Patient = {
    id: heroId,
    name: 'Rameshwar Mahto',
    age: 58,
    sex: 'Male',
    village: 'Kasmar',
    conditions: ['hypertension', 'diabetes'],
    consentGiven: true,
    consentAt: daysAgo(180),
    linkCode: 'RAM789',
    linkCodeExpiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    lastVisitDate: daysAgo(21),
    riskStatus: 'Worsening',
    riskReason: 'Systolic BP rising over last 5 readings (+28 mmHg slope), currently 168 mmHg (above target 120-140 mmHg). Follow-up overdue.',
    isDemo: true,
    createdAt: daysAgo(180),
  };
  batch.set(doc(db, 'patients', heroId), heroPatient);

  // Rameshwar's visits
  const heroVisits: Visit[] = [
    {
      id: 'vis_hero_1',
      patientId: heroId,
      village: 'Kasmar',
      date: daysAgo(150),
      vitals: { systolic: 132, diastolic: 84, bloodSugar: 122, weight: 68 },
      symptoms: ['Mild fatigue'],
      medicines: [
        { name: 'Amlodipine', dosage: '5mg', frequency: 'Once daily' },
        { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily' },
      ],
      notes: 'Initial checkup during monsoon rounds. Compliant with medications.',
      enteredBy: 'Dr. Ravi Kumar',
      enteredByRole: 'doctor',
      isDemo: true,
      createdAt: daysAgo(150),
    },
    {
      id: 'vis_hero_2',
      patientId: heroId,
      village: 'Kasmar',
      date: daysAgo(90),
      vitals: { systolic: 140, diastolic: 88, bloodSugar: 130, weight: 68.5 },
      symptoms: ['Morning headache'],
      medicines: [
        { name: 'Amlodipine', dosage: '5mg', frequency: 'Once daily' },
        { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily' },
      ],
      notes: 'BP slight upward drift. Reminded about daily morning schedule.',
      enteredBy: 'Dr. Ravi Kumar',
      enteredByRole: 'doctor',
      isDemo: true,
      createdAt: daysAgo(90),
    },
    {
      id: 'vis_hero_3',
      patientId: heroId,
      village: 'Kasmar',
      date: daysAgo(45),
      vitals: { systolic: 150, diastolic: 94, bloodSugar: 142, weight: 69 },
      symptoms: ['Headache', 'Dizziness while working in field'],
      medicines: [
        { name: 'Amlodipine', dosage: '10mg', frequency: 'Once daily' },
        { name: 'Telmisartan', dosage: '40mg', frequency: 'Once daily' },
        { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily' },
      ],
      notes: 'Dose escalated. Requested ASHA weekly checks.',
      enteredBy: 'Dr. Ravi Kumar',
      enteredByRole: 'doctor',
      isDemo: true,
      createdAt: daysAgo(45),
    },
    {
      id: 'vis_hero_4',
      patientId: heroId,
      village: 'Kasmar',
      date: daysAgo(21),
      vitals: { systolic: 158, diastolic: 96, bloodSugar: 148, weight: 69.5 },
      symptoms: ['Persistent headache', 'Blurry vision episodes'],
      medicines: [
        { name: 'Amlodipine', dosage: '10mg', frequency: 'Once daily' },
        { name: 'Telmisartan', dosage: '40mg', frequency: 'Once daily' },
        { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily' },
      ],
      notes: 'Persistent elevation despite dual medication. Emphasized low-sodium diet.',
      enteredBy: 'Dr. Ravi Kumar',
      enteredByRole: 'doctor',
      isDemo: true,
      createdAt: daysAgo(21),
    },
  ];

  heroVisits.forEach((v) => batch.set(doc(db, 'visits', v.id), v));

  // Rameshwar's readings
  const heroReadings: Reading[] = [
    {
      id: 'read_hero_1',
      patientId: heroId,
      village: 'Kasmar',
      type: 'systolic',
      value: 136,
      measuredAt: daysAgo(120),
      source: 'healthWorker',
      enteredBy: 'Sunita Murmu (ASHA)',
      isDemo: true,
      createdAt: daysAgo(120),
    },
    {
      id: 'read_hero_2',
      patientId: heroId,
      village: 'Kasmar',
      type: 'systolic',
      value: 146,
      measuredAt: daysAgo(65),
      source: 'healthWorker',
      enteredBy: 'Sunita Murmu (ASHA)',
      isDemo: true,
      createdAt: daysAgo(65),
    },
    {
      id: 'read_hero_3',
      patientId: heroId,
      village: 'Kasmar',
      type: 'systolic',
      value: 162,
      measuredAt: daysAgo(14),
      source: 'healthWorker',
      enteredBy: 'Sunita Murmu (ASHA)',
      isDemo: true,
      createdAt: daysAgo(14),
    },
    {
      id: 'read_hero_4',
      patientId: heroId,
      village: 'Kasmar',
      type: 'systolic',
      value: 168,
      measuredAt: daysAgo(7),
      source: 'patient',
      enteredBy: 'Rameshwar Mahto (Patient)',
      notes: 'Patient checked BP at village cooperative kiosk',
      isDemo: true,
      createdAt: daysAgo(7),
    },
  ];

  heroReadings.forEach((r) => batch.set(doc(db, 'readings', r.id), r));

  // Hero alerts
  const heroAlerts: Alert[] = [
    {
      id: 'alt_hero_1',
      patientId: heroId,
      village: 'Kasmar',
      type: 'follow_up',
      reason: 'Scheduled 7-day follow-up after escalating Telmisartan & Amlodipine regimen',
      dueDate: daysAgo(5),
      status: 'open',
      isDemo: true,
      createdAt: daysAgo(12),
    },
    {
      id: 'alt_hero_2',
      patientId: heroId,
      village: 'Kasmar',
      type: 'deterioration',
      reason: 'Rapid upward progression in Systolic BP (+28 mmHg slope over last 5 readings, current 168 mmHg)',
      dueDate: daysAgo(7),
      status: 'open',
      isDemo: true,
      createdAt: daysAgo(7),
    },
  ];

  heroAlerts.forEach((a) => batch.set(doc(db, 'alerts', a.id), a));

  // Additional 8 demo patients across Kasmar, Petarwar, Gola
  const extraArchetypes: {
    name: string;
    age: number;
    sex: 'Male' | 'Female';
    village: string;
    conditions: Condition[];
    status: RiskStatus;
    reason: string;
  }[] = [
    { name: 'Parvati Devi', age: 62, sex: 'Female', village: 'Kasmar', conditions: ['diabetes'], status: 'Watch', reason: 'Blood sugar drifting upwards (138 to 152 mg/dL)' },
    { name: 'Sohan Lal Kisku', age: 49, sex: 'Male', village: 'Kasmar', conditions: ['hypertension'], status: 'Stable', reason: 'BP stable within target (128/82 mmHg)' },
    { name: 'Basanti Tudu', age: 55, sex: 'Female', village: 'Petarwar', conditions: ['hypertension', 'diabetes'], status: 'Worsening', reason: 'Both systolic BP (162 mmHg) and fasting glucose (168 mg/dL) worsening' },
    { name: 'Chotu Ram Munda', age: 47, sex: 'Male', village: 'Petarwar', conditions: ['hypertension'], status: 'Stable', reason: 'Systolic BP well maintained at 130 mmHg' },
    { name: 'Anita Soren', age: 50, sex: 'Female', village: 'Gola', conditions: ['hypertension'], status: 'Worsening', reason: 'Systolic BP trending up from 134 to 160 mmHg' },
    { name: 'Ramcharan Patel', age: 66, sex: 'Male', village: 'Gola', conditions: ['diabetes'], status: 'Stable', reason: 'Fasting blood sugar 120 mg/dL' },
    { name: 'Saraswati Devi', age: 58, sex: 'Female', village: 'Gola', conditions: ['hypertension', 'diabetes'], status: 'Watch', reason: 'Elevated glucose 145 mg/dL, overdue for quarterly check' },
  ];

  extraArchetypes.forEach((arch, idx) => {
    const pid = `pat_synth_${idx + 1}`;
    const patientDoc: Patient = {
      id: pid,
      name: arch.name,
      age: arch.age,
      sex: arch.sex,
      village: arch.village,
      conditions: arch.conditions,
      consentGiven: true,
      consentAt: daysAgo(120),
      linkCode: `LNK${100 + idx}`,
      linkCodeExpiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      lastVisitDate: daysAgo(15 + idx * 5),
      riskStatus: arch.status,
      riskReason: arch.reason,
      isDemo: true,
      createdAt: daysAgo(120),
    };
    batch.set(doc(db, 'patients', pid), patientDoc);

    // Baseline visit
    const visitDoc: Visit = {
      id: `vis_${pid}_1`,
      patientId: pid,
      village: arch.village,
      date: daysAgo(15 + idx * 5),
      vitals: {
        systolic: arch.conditions.includes('hypertension') ? (arch.status === 'Worsening' ? 160 : 128) : undefined,
        diastolic: arch.conditions.includes('hypertension') ? (arch.status === 'Worsening' ? 98 : 82) : undefined,
        bloodSugar: arch.conditions.includes('diabetes') ? (arch.status === 'Worsening' ? 170 : 118) : undefined,
        weight: 60 + idx,
      },
      symptoms: arch.status === 'Worsening' ? ['Fatigue', 'Dizziness'] : ['None reported'],
      medicines: [{ name: 'Amlodipine', dosage: '5mg', frequency: 'Once daily' }],
      notes: `Routine village checkup in ${arch.village}.`,
      enteredBy: 'Dr. Ravi Kumar',
      enteredByRole: 'doctor',
      isDemo: true,
      createdAt: daysAgo(15 + idx * 5),
    };
    batch.set(doc(db, 'visits', visitDoc.id), visitDoc);

    // Readings
    const readingDoc: Reading = {
      id: `read_${pid}_1`,
      patientId: pid,
      village: arch.village,
      type: arch.conditions.includes('hypertension') ? 'systolic' : 'bloodSugar',
      value: arch.status === 'Worsening' ? 164 : 126,
      measuredAt: daysAgo(5),
      source: 'healthWorker',
      enteredBy: 'Sunita Murmu (ASHA)',
      isDemo: true,
      createdAt: daysAgo(5),
    };
    batch.set(doc(db, 'readings', readingDoc.id), readingDoc);
  });

  await batch.commit();

  await logAudit({
    userId: userObj.id,
    userName: userObj.name,
    userRole: userObj.role,
    action: 'reset_data',
    resource: 'system',
    details: `Admin (${userObj.name}) loaded synthetic demonstration records (flagged isDemo: true).`,
  });
}

export async function clearDemoDataset(
  adminUser?: { id?: string; name?: string; role?: string } | string
): Promise<void> {
  const userObj =
    typeof adminUser === 'string'
      ? { id: 'admin_sys', name: adminUser, role: 'admin' }
      : {
          id: adminUser?.id || 'admin_sys',
          name: adminUser?.name || 'Administrator',
          role: adminUser?.role || 'admin',
        };

  const collections = ['patients', 'visits', 'readings', 'alerts'];

  for (const colName of collections) {
    const q = query(collection(db, colName), where('isDemo', '==', true));
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    if (!snap.empty) {
      await batch.commit();
    }
  }

  await logAudit({
    userId: userObj.id,
    userName: userObj.name,
    userRole: userObj.role,
    action: 'reset_data',
    resource: 'system',
    details: `Admin (${userObj.name}) cleared synthetic demonstration records (flagged isDemo: true).`,
  });
}
