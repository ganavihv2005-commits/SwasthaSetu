export type SupportedLanguage = 'en' | 'hi' | 'kn';

export interface Translations {
  appName: string;
  appSubtitle: string;
  doctorRole: string;
  healthWorkerRole: string;
  adminRole: string;
  patientRole: string;
  pendingRole: string;
  loginTitle: string;
  loginSubtitle: string;
  signInWithGoogle: string;
  signInWithEmail: string;
  email: string;
  password: string;
  registerStaff: string;
  registerPrompt: string;
  alreadyHaveAccount: string;
  signOut: string;
  sessionTimeoutWarning: string;
  reauthRequired: string;
  confirmPassword: string;
  accessDenied: string;
  accessDeniedDesc: string;
  pendingApprovalTitle: string;
  pendingApprovalDesc: string;

  // Sync and connection status
  savedOnDevice: string;
  syncingWithCloud: string;
  syncedWithCloud: string;
  pendingChanges: string;
  live: string;
  lastUpdated: string;

  // Nav and sections
  rounds: string;
  patients: string;
  alerts: string;
  admin: string;
  settings: string;
  about: string;
  myHealth: string;
  myReadings: string;
  myMedicines: string;
  mySummaryCard: string;
  myAuditLog: string;
  whoViewedMyRecord: string;

  // Fields and labels
  village: string;
  date: string;
  worseningPatients: string;
  overdueFollowups: string;
  stable: string;
  watch: string;
  worsening: string;
  insufficientData: string;
  markSeenToday: string;
  seenTodaySuccess: string;
  visitBrief: string;
  readAloud: string;
  readingAloud: string;
  voiceInput: string;
  listening: string;
  whyExplanation: string;
  targetRange: string;
  demoDisclaimer: string;
  aiBriefBadge: string;
  offlineTemplateBadge: string;
  dismissFlag: string;
  overrideRisk: string;
  newPatient: string;
  newVisit: string;
  addReading: string;
  consentMandatory: string;
  consentText: string;
  savePatient: string;
  patientName: string;
  age: string;
  gender: string;
  male: string;
  female: string;
  other: string;
  conditions: string;
  diabetes: string;
  hypertension: string;
  systolicBP: string;
  diastolicBP: string;
  bloodSugar: string;
  weight: string;
  symptoms: string;
  medicines: string;
  notes: string;
  saveVisit: string;
  saveReading: string;
  sourceDoctor: string;
  sourceHealthWorker: string;
  sourcePatient: string;

  // Patient dashboard gentle status
  patientStatusGood: string;
  patientStatusAttention: string;
  nextFollowupDate: string;
  enterLinkCodePrompt: string;
  linkPatientButton: string;
  generateLinkCode: string;
  linkCodeExpires: string;
  withdrawConsent: string;
  consentWithdrawnWarning: string;
  restoreConsent: string;

  // Admin and guidelines
  userManagement: string;
  roleAssignment: string;
  villageAssignment: string;
  guidelines: string;
  demoDataToggle: string;
  loadDemoData: string;
  clearDemoData: string;
  auditLog: string;
  anonymisedStats: string;
  prototypeNotice: string;
  decisionSupportOnly: string;

  // Additional interface labels
  simulatedOfflineBanner?: string;
  language?: string;
  logout?: string;
  stopListening?: string;
  startVoiceInput?: string;
  noAlerts?: string;
  dismiss?: string;
  markDone?: string;
  timeline?: string;
  simulatedOffline?: string;
  syncNow?: string;
  selectRole?: string;
}
