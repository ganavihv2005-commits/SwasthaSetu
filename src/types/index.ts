export type UserRole = 'admin' | 'doctor' | 'healthWorker' | 'patient' | 'pending';
export type UserStatus = 'active' | 'pending' | 'disabled';

export interface UserProfile {
  id: string; // Firebase Auth UID
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  assignedVillages: string[];
  language: 'en' | 'hi' | 'kn';
  linkedPatientId?: string;
  createdAt: string;
  updatedAt?: string;
}

export type Condition = 'diabetes' | 'hypertension';
export type RiskStatus = 'Stable' | 'Watch' | 'Worsening' | 'Insufficient Data';
export type ReadingType = 'systolic' | 'diastolic' | 'bloodSugar' | 'weight';
export type ReadingSource = 'doctor' | 'healthWorker' | 'patient';

export interface Patient {
  id: string;
  name: string;
  age: number;
  sex: 'Male' | 'Female' | 'Other';
  village: string;
  conditions: Condition[];
  consentGiven: boolean;
  consentAt: string;
  consentWithdrawnAt?: string;
  linkCode?: string;
  linkCodeExpiresAt?: string;
  linkedUserId?: string;
  lastVisitDate?: string;
  riskStatus: RiskStatus;
  riskReason: string;
  riskOverridden?: boolean;
  riskOverriddenReason?: string;
  riskDismissed?: boolean;
  isDemo?: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface VisitVitals {
  systolic?: number;
  diastolic?: number;
  bloodSugar?: number; // mg/dL
  weight?: number; // kg
}

export interface VisitMedicine {
  name: string;
  dosage: string;
  frequency: string;
}

export interface Visit {
  id: string;
  patientId: string;
  village: string;
  date: string;
  vitals: VisitVitals;
  symptoms: string[];
  medicines: VisitMedicine[];
  notes: string;
  enteredBy: string;
  enteredByRole: 'doctor' | 'healthWorker' | 'admin';
  isDemo?: boolean;
  createdAt: string;
}

export interface Reading {
  id: string;
  patientId: string;
  village: string;
  type: ReadingType;
  value: number;
  measuredAt: string;
  source: ReadingSource;
  enteredBy: string;
  notes?: string;
  isDemo?: boolean;
  createdAt: string;
}

export type AlertType = 'follow_up' | 'deterioration' | 'overdue';
export type AlertStatus = 'open' | 'done' | 'dismissed';

export interface Alert {
  id: string;
  patientId: string;
  village: string;
  type: AlertType;
  reason: string;
  dueDate: string;
  status: AlertStatus;
  isDemo?: boolean;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface Guideline {
  id: string;
  parameter: ReadingType;
  condition: Condition | 'general';
  targetMin: number;
  targetMax: number;
  unit: string;
  source: string;
  note: string;
  isDemo: boolean;
  updatedAt?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action:
    | 'view'
    | 'create'
    | 'edit'
    | 'override_risk'
    | 'dismiss_risk'
    | 'sync'
    | 'update_guideline'
    | 'reset_data'
    | 'resolve_alert'
    | 'signin'
    | 'role_change'
    | 'withdraw_consent'
    | 'link_patient'
    | 'generate_link_code';
  resource: 'patient' | 'visit' | 'reading' | 'alert' | 'guideline' | 'system' | 'user';
  resourceId?: string;
  details: string;
  timestamp: string;
}
