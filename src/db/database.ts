import Dexie, { type Table } from 'dexie';

export type UserRole = 'doctor' | 'health_worker' | 'admin';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  language: 'en' | 'hi' | 'kn';
  title: string;
}

export type Condition = 'diabetes' | 'hypertension';
export type RiskStatus = 'Stable' | 'Watch' | 'Worsening' | 'Insufficient Data';

export interface Patient {
  id: string;
  name: string;
  age: number;
  sex: 'Male' | 'Female' | 'Other';
  village: string;
  conditions: Condition[];
  consentGiven: boolean;
  consentAt: string;
  lastVisitDate: string;
  riskStatus: RiskStatus;
  riskReason: string;
  riskOverridden?: boolean;
  riskOverriddenReason?: string;
  riskDismissed?: boolean;
  createdAt: string;
}

export interface VisitVitals {
  systolic?: number;
  diastolic?: number;
  bloodSugar?: number; // mg/dL
  weight?: number; // kg
}

export interface Visit {
  id: string;
  patientId: string;
  date: string;
  vitals: VisitVitals;
  symptoms: string[];
  medicines: { name: string; dosage: string; frequency: string }[];
  notes: string;
  enteredBy: string; // User Name
  enteredByRole: UserRole;
  createdAt: string;
}

export type ReadingType = 'systolic' | 'diastolic' | 'bloodSugar' | 'weight';

export interface Reading {
  id: string;
  patientId: string;
  type: ReadingType;
  value: number;
  measuredAt: string;
  enteredBy: string; // User Name
  notes?: string;
  createdAt: string;
}

export type AlertType = 'follow_up' | 'deterioration' | 'overdue';
export type AlertStatus = 'open' | 'done' | 'dismissed';

export interface Alert {
  id: string;
  patientId: string;
  type: AlertType;
  reason: string;
  dueDate: string;
  status: AlertStatus;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface Guideline {
  id?: number;
  parameter: ReadingType;
  condition: Condition | 'general';
  targetMin: number;
  targetMax: number;
  unit: string;
  source: string;
  note: string;
  isDemo: boolean;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: 'view' | 'create' | 'edit' | 'override_risk' | 'dismiss_risk' | 'sync' | 'update_guideline' | 'reset_data' | 'resolve_alert';
  resource: 'patient' | 'visit' | 'reading' | 'alert' | 'guideline' | 'system';
  resourceId?: string;
  details: string;
  timestamp: string;
}

export interface PendingSyncItem {
  id: string;
  table: 'patients' | 'visits' | 'readings' | 'alerts' | 'guidelines';
  recordId: string;
  action: 'insert' | 'update' | 'delete';
  dataSummary: string;
  createdAt: string;
}

export class SwasthaSetuDB extends Dexie {
  users!: Table<User, string>;
  patients!: Table<Patient, string>;
  visits!: Table<Visit, string>;
  readings!: Table<Reading, string>;
  alerts!: Table<Alert, string>;
  guidelines!: Table<Guideline, number>;
  auditLogs!: Table<AuditLog, string>;
  pendingSync!: Table<PendingSyncItem, string>;

  constructor() {
    super('SwasthaSetuDB');
    this.version(1).stores({
      users: 'id, role, language',
      patients: 'id, village, riskStatus, lastVisitDate, consentGiven',
      visits: 'id, patientId, date, enteredBy',
      readings: 'id, patientId, type, measuredAt',
      alerts: 'id, patientId, type, status, dueDate',
      guidelines: '++id, parameter, condition',
      auditLogs: 'id, userId, action, resource, timestamp',
      pendingSync: 'id, table, recordId, createdAt',
    });
  }
}

export const db = new SwasthaSetuDB();
