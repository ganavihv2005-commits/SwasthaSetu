import { db, type Patient, type Visit, type Reading, type Alert, type Guideline, type User, type Condition } from './database';
import { recalculateAllPatientsRisk } from '../services/riskService';

export const DEMO_USERS: User[] = [
  {
    id: 'user_doc_ravi',
    name: 'Dr. Ravi Kumar',
    role: 'doctor',
    language: 'en',
    title: 'Traveling Medical Officer (Kasmar & Petarwar Block)',
  },
  {
    id: 'user_hw_sunita',
    name: 'Sunita Murmu',
    role: 'health_worker',
    language: 'hi',
    title: 'Community Health Worker (ASHA / ANM)',
  },
  {
    id: 'user_admin_anil',
    name: 'Anil Soren',
    role: 'admin',
    language: 'en',
    title: 'Block Health Administrator',
  },
];

export const INITIAL_GUIDELINES: Guideline[] = [
  {
    parameter: 'systolic',
    condition: 'hypertension',
    targetMin: 120,
    targetMax: 140,
    unit: 'mmHg',
    source: 'Indian Guidelines on Hypertension (IGH-IV) [Demo]',
    note: 'Resting systolic target for adult chronic hypertension patients. Demo values, replace with guideline-reviewed ranges.',
    isDemo: true,
  },
  {
    parameter: 'diastolic',
    condition: 'hypertension',
    targetMin: 70,
    targetMax: 90,
    unit: 'mmHg',
    source: 'Indian Guidelines on Hypertension (IGH-IV) [Demo]',
    note: 'Diastolic blood pressure target. Demo values, replace with guideline-reviewed ranges.',
    isDemo: true,
  },
  {
    parameter: 'bloodSugar',
    condition: 'diabetes',
    targetMin: 70,
    targetMax: 130,
    unit: 'mg/dL',
    source: 'ICMR Guidelines for Type 2 Diabetes [Demo]',
    note: 'Fasting / pre-prandial blood glucose target. Demo values, replace with guideline-reviewed ranges.',
    isDemo: true,
  },
  {
    parameter: 'weight',
    condition: 'general',
    targetMin: 45,
    targetMax: 75,
    unit: 'kg',
    source: 'NHM Rural Clinical Reference [Demo]',
    note: 'Weight stability range for rural adults. Demo values, replace with guideline-reviewed ranges.',
    isDemo: true,
  },
];

export const VILLAGES = ['Kasmar', 'Petarwar', 'Gola'];

export function isDemoDataEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('swasthasetu_demo_data_enabled') === 'true';
}

export async function initSystemDefaults(): Promise<void> {
  const userCount = await db.users.count();
  if (userCount === 0) {
    await db.users.bulkPut(DEMO_USERS);
  }
  const guidelineCount = await db.guidelines.count();
  if (guidelineCount === 0) {
    await db.guidelines.bulkAdd(INITIAL_GUIDELINES);
  }
}

export async function clearSyntheticDemoData(): Promise<void> {
  await db.transaction('rw', [db.patients, db.visits, db.readings, db.alerts, db.pendingSync, db.auditLogs], async () => {
    await db.patients.clear();
    await db.visits.clear();
    await db.readings.clear();
    await db.alerts.clear();
    await db.pendingSync.clear();
    await db.auditLogs.put({
      id: `audit_clear_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: 'user_admin_anil',
      userName: 'Anil Soren',
      userRole: 'admin',
      action: 'reset_data',
      resource: 'system',
      details: 'Cleared all synthetic demo patient records, returning system to clean baseline state.',
      timestamp: new Date().toISOString(),
    });
  });
  console.log('[SwasthaSetu] Demo data cleared.');
}

export async function setDemoDataEnabled(enabled: boolean): Promise<void> {
  if (typeof window !== 'undefined') {
    localStorage.setItem('swasthasetu_demo_data_enabled', String(enabled));
  }
  if (enabled) {
    await loadSyntheticDemoData();
  } else {
    await clearSyntheticDemoData();
  }
}

export async function seedDatabase(forceReset = false) {
  await initSystemDefaults();
  if (forceReset) {
    await setDemoDataEnabled(true);
    return;
  }

  if (isDemoDataEnabled()) {
    const patientCount = await db.patients.count();
    if (patientCount === 0) {
      await loadSyntheticDemoData();
    }
  } else {
    // If demo data is off, make sure any old synthetic patients are not lingering
    const hasHero = await db.patients.get('pat_hero_rameshwar');
    if (hasHero) {
      await clearSyntheticDemoData();
    }
  }
}

export async function loadSyntheticDemoData(): Promise<void> {
  await initSystemDefaults();

  await db.transaction('rw', [db.patients, db.visits, db.readings, db.alerts, db.pendingSync, db.auditLogs], async () => {
    await db.patients.clear();
    await db.visits.clear();
    await db.readings.clear();
    await db.alerts.clear();
    await db.pendingSync.clear();

    // Helper date generator (relative to Nov 2026)
    const now = new Date('2026-11-05T09:00:00Z');
    const daysAgo = (d: number) => {
      const date = new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
      return date.toISOString().split('T')[0];
    };
    const daysFromNow = (d: number) => {
      const date = new Date(now.getTime() + d * 24 * 60 * 60 * 1000);
      return date.toISOString().split('T')[0];
    };

    const patients: Patient[] = [];
    const visits: Visit[] = [];
    const readings: Reading[] = [];
    const alerts: Alert[] = [];

    // ==========================================
    // HERO PATIENT: Rameshwar Mahto (Kasmar)
    // Clear worsening hypertension & diabetes, missed follow-up!
    // ==========================================
    const heroId = 'pat_hero_rameshwar';
    patients.push({
      id: heroId,
      name: 'Rameshwar Mahto',
      age: 58,
      sex: 'Male',
      village: 'Kasmar',
      conditions: ['hypertension', 'diabetes'],
      consentGiven: true,
      consentAt: daysAgo(180),
      lastVisitDate: daysAgo(21),
      riskStatus: 'Worsening',
      riskReason: 'Systolic BP rising over last 5 readings (+28 mmHg slope), currently 168 mmHg (above target 120-140 mmHg). Follow-up overdue.',
      createdAt: daysAgo(180),
    });

    // Rameshwar's visits
    visits.push(
      {
        id: 'vis_hero_1',
        patientId: heroId,
        date: daysAgo(150),
        vitals: { systolic: 132, diastolic: 84, bloodSugar: 122, weight: 68 },
        symptoms: ['Mild fatigue'],
        medicines: [
          { name: 'Amlodipine', dosage: '5mg', frequency: 'Once daily' },
          { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily' },
        ],
        notes: 'Initial checkup during monsoon rounds. Patient reported compliance with medications. Salt advice given.',
        enteredBy: 'Dr. Ravi Kumar',
        enteredByRole: 'doctor',
        createdAt: daysAgo(150),
      },
      {
        id: 'vis_hero_2',
        patientId: heroId,
        date: daysAgo(90),
        vitals: { systolic: 140, diastolic: 88, bloodSugar: 130, weight: 68.5 },
        symptoms: ['Occasional morning headache'],
        medicines: [
          { name: 'Amlodipine', dosage: '5mg', frequency: 'Once daily' },
          { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily' },
        ],
        notes: 'BP slight upward drift. Patient admitted missing tablets during festival week. Reminded about daily morning schedule.',
        enteredBy: 'Dr. Ravi Kumar',
        enteredByRole: 'doctor',
        createdAt: daysAgo(90),
      },
      {
        id: 'vis_hero_3',
        patientId: heroId,
        date: daysAgo(45),
        vitals: { systolic: 150, diastolic: 94, bloodSugar: 142, weight: 69 },
        symptoms: ['Headache', 'Dizziness while working in field'],
        medicines: [
          { name: 'Amlodipine', dosage: '10mg', frequency: 'Once daily' },
          { name: 'Telmisartan', dosage: '40mg', frequency: 'Once daily' },
          { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily' },
        ],
        notes: 'Dose escalated. Requested ASHA Sunita to conduct weekly between-visit BP checks. Target follow-up in 2 weeks.',
        enteredBy: 'Dr. Ravi Kumar',
        enteredByRole: 'doctor',
        createdAt: daysAgo(45),
      },
      {
        id: 'vis_hero_4',
        patientId: heroId,
        date: daysAgo(21),
        vitals: { systolic: 158, diastolic: 96, bloodSugar: 148, weight: 69.5 },
        symptoms: ['Persistent occipital headache', 'Blurry vision episodes'],
        medicines: [
          { name: 'Amlodipine', dosage: '10mg', frequency: 'Once daily' },
          { name: 'Telmisartan', dosage: '40mg', frequency: 'Once daily' },
          { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily' },
        ],
        notes: 'Persistent elevation despite medication. Emphasized low-sodium diet and avoidance of herbal mixtures.',
        enteredBy: 'Dr. Ravi Kumar',
        enteredByRole: 'doctor',
        createdAt: daysAgo(21),
      }
    );

    // Rameshwar's between-visit readings (by ASHA Sunita)
    readings.push(
      {
        id: 'read_hero_1',
        patientId: heroId,
        type: 'systolic',
        value: 136,
        measuredAt: daysAgo(120),
        enteredBy: 'Sunita Murmu',
        notes: 'Routine home check',
        createdAt: daysAgo(120),
      },
      {
        id: 'read_hero_2',
        patientId: heroId,
        type: 'systolic',
        value: 146,
        measuredAt: daysAgo(65),
        enteredBy: 'Sunita Murmu',
        notes: 'Patient felt dizzy after morning tea',
        createdAt: daysAgo(65),
      },
      {
        id: 'read_hero_3',
        patientId: heroId,
        type: 'bloodSugar',
        value: 138,
        measuredAt: daysAgo(65),
        enteredBy: 'Sunita Murmu',
        notes: 'Fasting finger-prick glucometer test',
        createdAt: daysAgo(65),
      },
      {
        id: 'read_hero_4',
        patientId: heroId,
        type: 'systolic',
        value: 162,
        measuredAt: daysAgo(14),
        enteredBy: 'Sunita Murmu',
        notes: 'ASHA weekly follow-up. BP still elevated.',
        createdAt: daysAgo(14),
      },
      {
        id: 'read_hero_5',
        patientId: heroId,
        type: 'systolic',
        value: 168,
        measuredAt: daysAgo(7),
        enteredBy: 'Sunita Murmu',
        notes: 'Severe reading. Advised patient to attend upcoming doctor visit.',
        createdAt: daysAgo(7),
      },
      {
        id: 'read_hero_6',
        patientId: heroId,
        type: 'diastolic',
        value: 102,
        measuredAt: daysAgo(7),
        enteredBy: 'Sunita Murmu',
        notes: 'High diastolic reading',
        createdAt: daysAgo(7),
      },
      {
        id: 'read_hero_7',
        patientId: heroId,
        type: 'bloodSugar',
        value: 154,
        measuredAt: daysAgo(7),
        enteredBy: 'Sunita Murmu',
        notes: 'Random blood sugar higher than target',
        createdAt: daysAgo(7),
      }
    );

    // Hero alerts (one overdue follow-up, one deterioration alert)
    alerts.push(
      {
        id: 'alt_hero_1',
        patientId: heroId,
        type: 'follow_up',
        reason: 'Scheduled 7-day follow-up after escalating Telmisartan & Amlodipine regimen',
        dueDate: daysAgo(5), // 5 days overdue!
        status: 'open',
        createdAt: daysAgo(12),
      },
      {
        id: 'alt_hero_2',
        patientId: heroId,
        type: 'deterioration',
        reason: 'Rapid upward progression in Systolic BP (+28 mmHg slope over last 5 readings, current 168 mmHg)',
        dueDate: daysAgo(7),
        status: 'open',
        createdAt: daysAgo(7),
      }
    );

    const syntheticArchetypes: {
      name: string;
      age: number;
      sex: 'Male' | 'Female' | 'Other';
      village: string;
      conditions: Condition[];
      status: 'Stable' | 'Watch' | 'Worsening';
      reason: string;
      trend: string;
    }[] = [
      // Kasmar village
      { name: 'Parvati Devi', age: 62, sex: 'Female' as const, village: 'Kasmar', conditions: ['diabetes' as const], status: 'Watch' as const, reason: 'Fasting blood sugar drifting upwards (138 to 152 mg/dL)', trend: 'sugar_drift' },
      { name: 'Sohan Lal Kisku', age: 49, sex: 'Male' as const, village: 'Kasmar', conditions: ['hypertension' as const], status: 'Stable' as const, reason: 'Blood pressure stable within target (128/82 mmHg)', trend: 'stable_bp' },
      { name: 'Manju Devi', age: 54, sex: 'Female' as const, village: 'Kasmar', conditions: ['hypertension' as const, 'diabetes' as const], status: 'Stable' as const, reason: 'BP and glucose under control with current dual therapy', trend: 'stable_all' },
      { name: 'Birendra Singh', age: 70, sex: 'Male' as const, village: 'Kasmar', conditions: ['hypertension' as const], status: 'Watch' as const, reason: 'Mild isolated systolic elevation (148 mmHg), weight declining', trend: 'weight_loss' },
      { name: 'Kanti Devi', age: 44, sex: 'Female' as const, village: 'Kasmar', conditions: ['diabetes' as const], status: 'Stable' as const, reason: 'Blood sugar fasting 112 mg/dL, well within 70-130 range', trend: 'stable_sugar' },
      { name: 'Arjun Mahato', age: 52, sex: 'Male' as const, village: 'Kasmar', conditions: ['hypertension' as const], status: 'Worsening' as const, reason: 'Systolic BP jumped to 164 mmHg, patient missed medicine supply', trend: 'bp_jump' },
      { name: 'Sumitra Kumari', age: 39, sex: 'Female' as const, village: 'Kasmar', conditions: ['hypertension' as const], status: 'Stable' as const, reason: 'Vitals stable on low-dose monotherapy (124/78 mmHg)', trend: 'stable_bp' },
      { name: 'Ganesh Soren', age: 65, sex: 'Male' as const, village: 'Kasmar', conditions: ['diabetes' as const], status: 'Watch' as const, reason: 'Post-prandial glucose spiking to 160 mg/dL', trend: 'sugar_spike' },
      { name: 'Lalita Baski', age: 59, sex: 'Female' as const, village: 'Kasmar', conditions: ['hypertension' as const, 'diabetes' as const], status: 'Stable' as const, reason: 'Regular clinic adherence, stable vitals', trend: 'stable_all' },
      { name: 'Devendra Prasad', age: 61, sex: 'Male' as const, village: 'Kasmar', conditions: ['diabetes' as const], status: 'Stable' as const, reason: 'Controlled on Metformin 500mg BD', trend: 'stable_sugar' },

      // Petarwar village
      { name: 'Basanti Tudu', age: 55, sex: 'Female' as const, village: 'Petarwar', conditions: ['hypertension' as const, 'diabetes' as const], status: 'Worsening' as const, reason: 'Both systolic BP (162 mmHg) and fasting glucose (168 mg/dL) worsening', trend: 'dual_worse' },
      { name: 'Chotu Ram Munda', age: 47, sex: 'Male' as const, village: 'Petarwar', conditions: ['hypertension' as const], status: 'Stable' as const, reason: 'Systolic BP well maintained at 130 mmHg', trend: 'stable_bp' },
      { name: 'Shanti Hembram', age: 63, sex: 'Female' as const, village: 'Petarwar', conditions: ['diabetes' as const], status: 'Watch' as const, reason: 'Fasting glucose steady but elevated above target (142 mg/dL)', trend: 'sugar_drift' },
      { name: 'Manoj Kumar Karmali', age: 51, sex: 'Male' as const, village: 'Petarwar', conditions: ['hypertension' as const], status: 'Stable' as const, reason: 'BP 126/80 mmHg, compliant with lifestyle advice', trend: 'stable_bp' },
      { name: 'Geeta Devi', age: 48, sex: 'Female' as const, village: 'Petarwar', conditions: ['diabetes' as const], status: 'Stable' as const, reason: 'Fasting glucose 118 mg/dL, reports no symptoms', trend: 'stable_sugar' },
      { name: 'Rajendra Mahto', age: 67, sex: 'Male' as const, village: 'Petarwar', conditions: ['hypertension' as const, 'diabetes' as const], status: 'Watch' as const, reason: 'Systolic BP hovering at 146 mmHg, follow-up overdue by 3 days', trend: 'bp_hover' },
      { name: 'Sunita Marandi', age: 41, sex: 'Female' as const, village: 'Petarwar', conditions: ['hypertension' as const], status: 'Stable' as const, reason: 'Controlled BP 122/76 mmHg', trend: 'stable_bp' },
      { name: 'Budhan Besra', age: 72, sex: 'Male' as const, village: 'Petarwar', conditions: ['diabetes' as const], status: 'Worsening' as const, reason: 'Fasting blood sugar climbing over last 4 visits (currently 178 mg/dL)', trend: 'sugar_worse' },
      { name: 'Urmila Devi', age: 56, sex: 'Female' as const, village: 'Petarwar', conditions: ['hypertension' as const], status: 'Stable' as const, reason: 'Vitals stable on Amlodipine 5mg', trend: 'stable_bp' },
      { name: 'Sanjay Hansda', age: 53, sex: 'Male' as const, village: 'Petarwar', conditions: ['diabetes' as const], status: 'Stable' as const, reason: 'Diet regulated, blood glucose 126 mg/dL', trend: 'stable_sugar' },

      // Gola village
      { name: 'Anita Soren', age: 50, sex: 'Female' as const, village: 'Gola', conditions: ['hypertension' as const], status: 'Worsening' as const, reason: 'Systolic BP trending up from 134 to 160 mmHg over 2 months', trend: 'bp_jump' },
      { name: 'Ramcharan Patel', age: 66, sex: 'Male' as const, village: 'Gola', conditions: ['diabetes' as const], status: 'Stable' as const, reason: 'Fasting blood sugar 120 mg/dL, symptoms resolved', trend: 'stable_sugar' },
      { name: 'Saraswati Devi', age: 58, sex: 'Female' as const, village: 'Gola', conditions: ['hypertension' as const, 'diabetes' as const], status: 'Watch' as const, reason: 'Elevated blood sugar 145 mg/dL, overdue for quarterly foot exam', trend: 'sugar_drift' },
      { name: 'Naresh Murmu', age: 43, sex: 'Male' as const, village: 'Gola', conditions: ['hypertension' as const], status: 'Stable' as const, reason: 'BP 128/84 mmHg, regular adherence', trend: 'stable_bp' },
      { name: 'Radha Devi', age: 60, sex: 'Female' as const, village: 'Gola', conditions: ['diabetes' as const], status: 'Stable' as const, reason: 'Fasting glucose 115 mg/dL, stable weight', trend: 'stable_sugar' },
      { name: 'Kameshwar Bediya', age: 57, sex: 'Male' as const, village: 'Gola', conditions: ['hypertension' as const], status: 'Watch' as const, reason: 'Systolic BP 144 mmHg with occasional chest heaviness on exertion', trend: 'bp_hover' },
      { name: 'Fulmani Tudu', age: 46, sex: 'Female' as const, village: 'Gola', conditions: ['diabetes' as const], status: 'Stable' as const, reason: 'Controlled glucose 122 mg/dL', trend: 'stable_sugar' },
      { name: 'Binod Mahto', age: 64, sex: 'Male' as const, village: 'Gola', conditions: ['hypertension' as const, 'diabetes' as const], status: 'Stable' as const, reason: 'Dual conditions well compensated on current dosage', trend: 'stable_all' },
      { name: 'Jharna Devi', age: 52, sex: 'Female' as const, village: 'Gola', conditions: ['hypertension' as const], status: 'Stable' as const, reason: 'BP stable at 126/82 mmHg', trend: 'stable_bp' },
    ];

    syntheticArchetypes.forEach((arch, idx) => {
      const pid = `pat_synth_${idx + 1}`;
      const lastVisitDays = 8 + (idx * 4) % 60; // 8 to 68 days ago
      const consentDays = 120 + (idx * 3);

      patients.push({
        id: pid,
        name: arch.name,
        age: arch.age,
        sex: arch.sex,
        village: arch.village,
        conditions: arch.conditions,
        consentGiven: true,
        consentAt: daysAgo(consentDays),
        lastVisitDate: daysAgo(lastVisitDays),
        riskStatus: arch.status,
        riskReason: arch.reason,
        createdAt: daysAgo(consentDays),
      });

      // Generate 4 to 6 visits for each patient
      const visitIntervals = [lastVisitDays + 75, lastVisitDays + 50, lastVisitDays + 25, lastVisitDays];
      visitIntervals.forEach((vDays, vIdx) => {
        let sys = 128;
        let dia = 82;
        let sugar = 120;
        let wt = 58 + (idx % 12);

        if (arch.trend === 'bp_jump' || arch.trend === 'dual_worse') {
          sys = 132 + vIdx * 8; // 132 -> 140 -> 148 -> 156+
          dia = 82 + vIdx * 4;
        } else if (arch.trend === 'sugar_worse') {
          sugar = 130 + vIdx * 14; // 130 -> 144 -> 158 -> 172+
        } else if (arch.trend === 'sugar_drift') {
          sugar = 126 + vIdx * 6;
        } else if (arch.trend === 'bp_hover') {
          sys = 142 + (vIdx % 2) * 4;
        }

        visits.push({
          id: `vis_${pid}_${vIdx + 1}`,
          patientId: pid,
          date: daysAgo(vDays),
          vitals: {
            systolic: arch.conditions.includes('hypertension') ? sys : undefined,
            diastolic: arch.conditions.includes('hypertension') ? dia : undefined,
            bloodSugar: arch.conditions.includes('diabetes') ? sugar : undefined,
            weight: wt,
          },
          symptoms: vIdx === 3 && arch.status === 'Worsening' ? ['Fatigue', 'Dizziness'] : ['None reported'],
          medicines: [
            arch.conditions.includes('hypertension') ? { name: 'Amlodipine', dosage: '5mg', frequency: 'Once daily' } : { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily' },
          ],
          notes: `Routine village checkup in ${arch.village}. Vitals reviewed against guidelines.`,
          enteredBy: 'Dr. Ravi Kumar',
          enteredByRole: 'doctor',
          createdAt: daysAgo(vDays),
        });
      });

      // Generate 2 to 4 between-visit readings by ASHA
      const readingIntervals = [lastVisitDays + 35, lastVisitDays + 12, lastVisitDays + 3];
      readingIntervals.forEach((rDays, rIdx) => {
        let val = 128;
        let type: 'systolic' | 'bloodSugar' = 'systolic';
        if (arch.conditions.includes('hypertension')) {
          type = 'systolic';
          val = arch.status === 'Worsening' ? 146 + rIdx * 6 : 126 + (rIdx % 3) * 2;
        } else {
          type = 'bloodSugar';
          val = arch.status === 'Worsening' ? 148 + rIdx * 10 : 118 + (rIdx % 3) * 4;
        }

        readings.push({
          id: `read_${pid}_${rIdx + 1}`,
          patientId: pid,
          type,
          value: val,
          measuredAt: daysAgo(rDays),
          enteredBy: 'Sunita Murmu',
          notes: 'Home monitoring visit',
          createdAt: daysAgo(rDays),
        });
      });

      // Generate alerts for overdue / worsening patients
      if (arch.status === 'Worsening') {
        alerts.push({
          id: `alt_${pid}_worse`,
          patientId: pid,
          type: 'deterioration',
          reason: arch.reason,
          dueDate: daysAgo(2),
          status: 'open',
          createdAt: daysAgo(4),
        });
      } else if (lastVisitDays > 35) {
        alerts.push({
          id: `alt_${pid}_followup`,
          patientId: pid,
          type: 'overdue',
          reason: `Chronic condition follow-up overdue by ${lastVisitDays - 30} days`,
          dueDate: daysAgo(lastVisitDays - 30),
          status: 'open',
          createdAt: daysAgo(lastVisitDays - 15),
        });
      } else {
        // Normal open follow-up in the future
        alerts.push({
          id: `alt_${pid}_next`,
          patientId: pid,
          type: 'follow_up',
          reason: 'Scheduled routine 30-day chronic disease checkup',
          dueDate: daysFromNow(30 - lastVisitDays),
          status: 'open',
          createdAt: daysAgo(lastVisitDays),
        });
      }
    });

    // Bulk save all records using idempotent bulkPut
    await db.patients.bulkPut(patients);
    await db.visits.bulkPut(visits);
    await db.readings.bulkPut(readings);
    await db.alerts.bulkPut(alerts);

    // Initial audit log with unique ID
    await db.auditLogs.put({
      id: `audit_seed_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: 'user_admin_anil',
      userName: 'Anil Soren',
      userRole: 'admin',
      action: 'reset_data',
      resource: 'system',
      details: 'Synthetic seed data populated with 3 villages, 30 patients, and historical visits.',
      timestamp: now.toISOString(),
    });
  });

  // Dynamically calibrate and save real Progression Watch status for all seeded patients
  await recalculateAllPatientsRisk();

  console.log('[SwasthaSetu] Database seeded and risk statuses calibrated successfully.');
}
