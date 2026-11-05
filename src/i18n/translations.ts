export type SupportedLanguage = 'en' | 'hi' | 'kn';

export interface Translations {
  appName: string;
  appSubtitle: string;
  doctorRole: string;
  healthWorkerRole: string;
  adminRole: string;
  loginTitle: string;
  loginSubtitle: string;
  selectRole: string;
  startRounds: string;
  offlineReady: string;
  offlineReadyDesc: string;
  rounds: string;
  patients: string;
  alerts: string;
  admin: string;
  settings: string;
  about: string;
  village: string;
  date: string;
  worseningPatients: string;
  overdueFollowups: string;
  pendingSync: string;
  syncNow: string;
  syncing: string;
  allSynced: string;
  stable: string;
  watch: string;
  worsening: string;
  insufficientData: string;
  markSeenToday: string;
  seenTodaySuccess: string;
  visitBrief: string;
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
  simulatedOffline: string;
  simulatedOfflineBanner: string;
  toggleOffline: string;
  resetDemoData: string;
  language: string;
  auditLog: string;
  guidelines: string;
  villageStats: string;
  prototypeNotice: string;
  decisionSupportOnly: string;
  measuredBy: string;
  timeline: string;
  noAlerts: string;
  allAlerts: string;
  overdue: string;
  deterioration: string;
  followUp: string;
  markDone: string;
  dismiss: string;
  recentTrends: string;
  guidelineSource: string;
}

export const TRANSLATIONS: Record<SupportedLanguage, Translations> = {
  en: {
    appName: 'SwasthaSetu',
    appSubtitle: 'Traveling Doctor Decision Support & Longitudinal Records',
    doctorRole: 'Doctor (Dr. Ravi)',
    healthWorkerRole: 'Health Worker (Sunita ASHA)',
    adminRole: 'Health Admin (Anil)',
    loginTitle: 'Welcome to SwasthaSetu',
    loginSubtitle: 'Empowering traveling rural doctors with offline longitudinal records & disease progression watch.',
    selectRole: 'Select Demo User Role',
    startRounds: 'Enter Clinic Rounds',
    offlineReady: 'Offline-Ready',
    offlineReadyDesc: 'Local IndexedDB active. Operates fully without internet connectivity.',
    rounds: 'Rounds',
    patients: 'Patients',
    alerts: 'Alerts',
    admin: 'Admin',
    settings: 'Settings',
    about: 'About',
    village: 'Village',
    date: 'Date',
    worseningPatients: 'Worsening',
    overdueFollowups: 'Overdue',
    pendingSync: 'Pending Sync',
    syncNow: 'Sync Now',
    syncing: 'Syncing records...',
    allSynced: 'All records synced to server',
    stable: 'Stable',
    watch: 'Watch',
    worsening: 'Worsening',
    insufficientData: 'Need 3+ Readings',
    markSeenToday: 'Mark Seen Today',
    seenTodaySuccess: 'Patient marked as evaluated today.',
    visitBrief: 'Pre-Visit Clinical Brief',
    whyExplanation: 'Why this risk status?',
    targetRange: 'Target Guideline Range',
    demoDisclaimer: 'Decision support, not a diagnosis. Synthetic demonstration data.',
    aiBriefBadge: 'AI Clinical Brief (Gemini)',
    offlineTemplateBadge: 'Offline Templated Brief',
    dismissFlag: 'Dismiss Flag',
    overrideRisk: 'Override Status',
    newPatient: 'Register Patient',
    newVisit: 'New Visit',
    addReading: 'Add Reading',
    consentMandatory: 'Informed Consent Required',
    consentText: 'I confirm that I have explained to the patient (in their local language) that their health data is stored locally on this traveling device for continuity of care across village visits, and the patient has given consent.',
    savePatient: 'Register Patient',
    patientName: 'Patient Full Name',
    age: 'Age (Years)',
    gender: 'Gender',
    male: 'Male',
    female: 'Female',
    other: 'Other',
    conditions: 'Chronic Conditions',
    diabetes: 'Type 2 Diabetes',
    hypertension: 'Hypertension',
    systolicBP: 'Systolic BP (mmHg)',
    diastolicBP: 'Diastolic BP (mmHg)',
    bloodSugar: 'Blood Sugar (mg/dL)',
    weight: 'Body Weight (kg)',
    symptoms: 'Observed Symptoms',
    medicines: 'Medications Prescribed',
    notes: 'Clinical Field Notes',
    saveVisit: 'Save Clinic Visit',
    saveReading: 'Save Field Reading',
    simulatedOffline: 'Simulate Offline Mode',
    simulatedOfflineBanner: 'Simulate Offline is ACTIVE: Gemini API is bypassed; fallback clinical templates and local storage are in use.',
    toggleOffline: 'Toggle Simulated Offline',
    resetDemoData: 'Reset Demo Data',
    language: 'Language',
    auditLog: 'Clinical Audit Log',
    guidelines: 'Clinical Guidelines (Demo Ranges)',
    villageStats: 'Village Epidemiology Statistics',
    prototypeNotice: 'Prototype with synthetic data',
    decisionSupportOnly: 'Decision support, not a diagnosis',
    measuredBy: 'Measured by',
    timeline: 'Longitudinal Timeline',
    noAlerts: 'No active clinical alerts.',
    allAlerts: 'All Alerts',
    overdue: 'Overdue Follow-ups',
    deterioration: 'Deteriorations',
    followUp: 'Follow-ups',
    markDone: 'Mark Done',
    dismiss: 'Dismiss',
    recentTrends: 'Recent Parameter Trends',
    guidelineSource: 'Guideline Source',
  },
  hi: {
    appName: 'स्वास्थ्यसेतु (SwasthaSetu)',
    appSubtitle: 'भ्रमणशील डॉक्टर निर्णय सहायता एवं मरीज इतिहास',
    doctorRole: 'डॉक्टर (डॉ. रवि)',
    healthWorkerRole: 'स्वास्थ्य कार्यकर्ता (सुनीता आशा)',
    adminRole: 'प्रशासक (अनिल सोरेन)',
    loginTitle: 'स्वास्थ्यसेतु में आपका स्वागत है',
    loginSubtitle: 'ग्रामीण भ्रमणशील डॉक्टरों के लिए ऑफलाइन अनुदैर्ध्य रिकॉर्ड और बीमारी निगरानी प्रणाली।',
    selectRole: 'डेमो भूमिका चुनें',
    startRounds: 'दौरा शुरू करें',
    offlineReady: 'ऑफलाइन तैयार',
    offlineReadyDesc: 'लोकल डेटाबेस सक्रिय है। बिना इंटरनेट भी पूरी तरह कार्य करता है।',
    rounds: 'दौरे (Rounds)',
    patients: 'मरीज (Patients)',
    alerts: 'अलर्ट (Alerts)',
    admin: 'प्रशासन (Admin)',
    settings: 'सेटिंग्स (Settings)',
    about: 'के बारे में (About)',
    village: 'गांव',
    date: 'तारीख',
    worseningPatients: 'गंभीर / बिगड़ते',
    overdueFollowups: 'अतिदेय (Overdue)',
    pendingSync: 'सिंक प्रतीक्षारत',
    syncNow: 'अभी सिंक करें',
    syncing: 'सिंक हो रहा है...',
    allSynced: 'सभी रिकॉर्ड सिंक हो चुके हैं',
    stable: 'स्थिर (Stable)',
    watch: 'निगरानी (Watch)',
    worsening: 'बिगड़ता हुआ (Worsening)',
    insufficientData: '3+ जांच आवश्यक',
    markSeenToday: 'आज देखा गया चिह्नित करें',
    seenTodaySuccess: 'मरीज को आज देखा गया चिह्नित कर दिया गया है।',
    visitBrief: 'दौरा-पूर्व संक्षिप्त क्लिनिकल सारांश',
    whyExplanation: 'यह जोखिम स्थिति क्यों?',
    targetRange: 'दिशानिर्देश लक्ष्य सीमा',
    demoDisclaimer: 'निर्णय सहायता, निदान नहीं। कृत्रिम डेमो डेटा।',
    aiBriefBadge: 'AI क्लिनिकल सारांश (जेमिनी)',
    offlineTemplateBadge: 'ऑफलाइन टेम्पलेटेड सारांश',
    dismissFlag: 'फ्लैग हटाएं',
    overrideRisk: 'स्थिति बदलें',
    newPatient: 'नया मरीज जोड़ें',
    newVisit: 'नई मुलाकात दर्ज करें',
    addReading: 'रीडिंग जोड़ें',
    consentMandatory: 'सूचित सहमति अनिवार्य है',
    consentText: 'मैं पुष्टि करता/करती हूँ कि मैंने मरीज को स्थानीय भाषा में समझाया है कि उनका स्वास्थ्य डेटा इस उपकरण पर सुरक्षित रहेगा और उन्होंने सहमति दी है।',
    savePatient: 'मरीज पंजीकृत करें',
    patientName: 'मरीज का पूरा नाम',
    age: 'आयु (वर्ष)',
    gender: 'लिंग',
    male: 'पुरुष',
    female: 'महिला',
    other: 'अन्य',
    conditions: 'दीर्घकालिक बीमारियां',
    diabetes: 'डायबिटीज (मधुमेह)',
    hypertension: 'उच्च रक्तचाप (बीपी)',
    systolicBP: 'सिस्टोलिक बीपी (mmHg)',
    diastolicBP: 'डायस्टोलिक बीपी (mmHg)',
    bloodSugar: 'ब्लड शुगर (mg/dL)',
    weight: 'वजन (किलो)',
    symptoms: 'देखे गए लक्षण',
    medicines: 'दवाइयां',
    notes: 'क्लिनिकल फील्ड नोट्स',
    saveVisit: 'मुलाकात सहेजें',
    saveReading: 'रीडिंग सहेजें',
    simulatedOffline: 'सिम्युलेटेड ऑफलाइन मोड',
    simulatedOfflineBanner: 'सिम्युलेटेड ऑफलाइन सक्रिय: जेमिनी एपीआई बाईपास है; स्थानीय टेम्पलेट और ऑफलाइन स्टोरेज सक्रिय हैं।',
    toggleOffline: 'ऑफलाइन मोड बदलें',
    resetDemoData: 'डेमो डेटा रीसेट करें',
    language: 'भाषा (Language)',
    auditLog: 'ऑडिट लॉग',
    guidelines: 'क्लिनिकल दिशानिर्देश (डेमो सीमाएं)',
    villageStats: 'गांव आंकड़े',
    prototypeNotice: 'सिंथेटिक डेटा प्रोटोटाइप',
    decisionSupportOnly: 'निर्णय सहायता, निदान नहीं',
    measuredBy: 'द्वारा मापा गया',
    timeline: 'समयानुसार इतिहास',
    noAlerts: 'कोई सक्रिय अलर्ट नहीं है।',
    allAlerts: 'सभी अलर्ट',
    overdue: 'अतिदेय फॉलो-अप',
    deterioration: 'गंभीर गिरावट',
    followUp: 'फॉलो-अप',
    markDone: 'पूर्ण चिह्नित करें',
    dismiss: 'खारिज करें',
    recentTrends: 'हालिया रुझान',
    guidelineSource: 'दिशानिर्देश स्रोत',
  },
  kn: {
    appName: 'ಸ್ವಾಸ್ಥ್ಯಸೇತು (SwasthaSetu)',
    appSubtitle: 'ಸಂಚಾರಿ ವೈದ್ಯರ ನಿರ್ಧಾರ ಬೆಂಬಲ ಮತ್ತು ರೋಗಿ ದಾಖಲೆಗಳು',
    doctorRole: 'ವೈದ್ಯರು (ಡಾ. ರವಿ)',
    healthWorkerRole: 'ಆರೋಗ್ಯ ಕಾರ್ಯಕರ್ತೆ (ಸುನೀತಾ ಆಶಾ)',
    adminRole: 'ಆಡಳಿತಾಧಿಕಾರಿ (ಅನಿಲ್)',
    loginTitle: 'ಸ್ವಾಸ್ಥ್ಯಸೇತುವಿಗೆ ಸುಸ್ವಾಗತ',
    loginSubtitle: 'ಗ್ರಾಮೀಣ ಸಂಚಾರಿ ವೈದ್ಯರಿಗಾಗಿ ಆಫ್‌ಲೈನ್ ರೋಗಿ ಇತಿಹಾಸ ಮತ್ತು ಕಾಯಿಲೆ ಪ್ರಗತಿ ಕಣ್ಗಾವಲು.',
    selectRole: 'ಡೆಮೊ ಪಾತ್ರವನ್ನು ಆಯ್ಕೆಮಾಡಿ',
    startRounds: 'ಕ್ಲಿನಿಕ್ ಪ್ರವಾಸ ಪ್ರಾರಂಭಿಸಿ',
    offlineReady: 'ಆಫ್‌ಲೈನ್‌ಗೆ ಸಿದ್ಧ',
    offlineReadyDesc: 'ಸ್ಥಳೀಯ ಡೇಟಾಬೇಸ್ ಸಕ್ರಿಯವಾಗಿದೆ. ಇಂಟರ್ನೆಟ್ ಇಲ್ಲದೆಯೂ ಪೂರ್ಣ ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತದೆ.',
    rounds: 'ಸುತ್ತುಗಳು (Rounds)',
    patients: 'ರೋಗಿಗಳು (Patients)',
    alerts: 'ಎಚ್ಚರಿಕೆಗಳು (Alerts)',
    admin: 'ಆಡಳಿತ (Admin)',
    settings: 'ಸೆಟ್ಟಿಂಗ್ಸ್ (Settings)',
    about: 'ಕುರಿತು (About)',
    village: 'ಗ್ರಾಮ',
    date: 'ದಿನಾಂಕ',
    worseningPatients: 'ಉಲ್ಬಣಗೊಳ್ಳುತ್ತಿರುವವರು',
    overdueFollowups: 'ಬಾಕಿ ಇರುವವು',
    pendingSync: 'ಸಿಂಕ್ ಬಾಕಿ',
    syncNow: 'ಈಗಲೇ ಸಿಂಕ್ ಮಾಡಿ',
    syncing: 'ಸಿಂಕ್ ಆಗುತ್ತಿದೆ...',
    allSynced: 'ಎಲ್ಲಾ ದಾಖಲೆಗಳು ಸಿಂಕ್ ಆಗಿವೆ',
    stable: 'ಸ್ಥಿರ (Stable)',
    watch: 'ಗಮನಿಸಿ (Watch)',
    worsening: 'ಹದಗೆಡುತ್ತಿದೆ (Worsening)',
    insufficientData: '3+ ಪರೀಕ್ಷೆಗಳು ಬೇಕು',
    markSeenToday: 'ಇಂದು ನೋಡಲಾಗಿದೆ ಎಂದು ಗುರುತಿಸಿ',
    seenTodaySuccess: 'ರೋಗಿಯನ್ನು ಇಂದು ಪರೀಕ್ಷಿಸಲಾಗಿದೆ ಎಂದು ಗುರುತಿಸಲಾಗಿದೆ.',
    visitBrief: 'ಭೇಟಿ ಪೂರ್ವ ಸಂಕ್ಷಿಪ್ತ ವಿವರ',
    whyExplanation: 'ಈ ಅಪಾಯದ ಸ್ಥಿತಿಗೆ ಕಾರಣವೇನು?',
    targetRange: 'ಮಾರ್ಗಸೂಚಿ ಗುರಿ ಶ್ರೇಣಿ',
    demoDisclaimer: 'ನಿರ್ಧಾರ ಬೆಂಬಲ ಮಾತ್ರ, ರೋಗನಿರ್ಣಯವಲ್ಲ. ಡೆಮೊ ಡೇಟಾ.',
    aiBriefBadge: 'AI ಕ್ಲಿನಿಕಲ್ ಸಾರಾಂಶ (ಜೆಮಿನಿ)',
    offlineTemplateBadge: 'ಆಫ್‌ಲೈನ್ ಮಾದರಿ ಸಾರಾಂಶ',
    dismissFlag: 'ಫ್ಲ್ಯಾಗ್ ತೆಗೆದುಹಾಕಿ',
    overrideRisk: 'ಸ್ಥಿತಿ ಬದಲಾಯಿಸಿ',
    newPatient: 'ರೋಗಿ ನೋಂದಣಿ',
    newVisit: 'ಹೊಸ ಭೇಟಿ ದಾಖಲಿಸಿ',
    addReading: 'ರೀಡಿಂಗ್ ಸೇರಿಸಿ',
    consentMandatory: 'ಮಾಹಿತಿಪೂರ್ಣ ಒಪ್ಪಿಗೆ ಕಡ್ಡಾಯ',
    consentText: 'ರೋಗಿಯ ಆರೋಗ್ಯ ಮಾಹಿತಿಯನ್ನು ಈ ಸಾಧನದಲ್ಲಿ ಸ್ಥಳೀಯವಾಗಿ ಸಂಗ್ರಹಿಸಲಾಗುವುದು ಎಂಬುದನ್ನು ನಾನು ರೋಗಿಗೆ ವಿವರಿಸಿದ್ದೇನೆ ಮತ್ತು ಅವರು ಒಪ್ಪಿಗೆ ನೀಡಿದ್ದಾರೆ.',
    savePatient: 'ರೋಗಿಯನ್ನು ನೋಂದಾಯಿಸಿ',
    patientName: 'ರೋಗಿಯ ಪೂರ್ಣ ಹೆಸರು',
    age: 'ವಯಸ್ಸು (ವರ್ಷ)',
    gender: 'ಲಿಂಗ',
    male: 'ಪುರುಷ',
    female: 'ಮಹಿಳೆ',
    other: 'ಇತರ',
    conditions: 'ದೀರ್ಘಕಾಲದ ಕಾಯಿಲೆಗಳು',
    diabetes: 'ಮಧುಮೇಹ (Diabetes)',
    hypertension: 'ರಕ್ತದೊತ್ತಡ (BP)',
    systolicBP: 'ಸಿಸ್ಟೊಲಿಕ್ ಬಿಪಿ (mmHg)',
    diastolicBP: 'ಡಯಾಸ್ಟೊಲಿಕ್ ಬಿಪಿ (mmHg)',
    bloodSugar: 'ರಕ್ತದ ಸಕ್ಕರೆ (mg/dL)',
    weight: 'ತೂಕ (ಕೆಜಿ)',
    symptoms: 'ಲಕ್ಷಣಗಳು',
    medicines: 'ಔಷಧಿಗಳು',
    notes: 'ಕ್ಲಿನಿಕಲ್ ಟಿಪ್ಪಣಿಗಳು',
    saveVisit: 'ಭೇಟಿ ಉಳಿಸಿ',
    saveReading: 'ರೀಡಿಂಗ್ ಉಳಿಸಿ',
    simulatedOffline: 'ಆಫ್‌ಲೈನ್ ಅನುಕರಣೆ ಮೋಡ್',
    simulatedOfflineBanner: 'ಆಫ್‌ಲೈನ್ ಅನುಕರಣೆ ಸಕ್ರಿಯವಾಗಿದೆ: ಜೆಮಿನಿ ಸಂಪರ್ಕ ಸ್ಥಗಿತಗೊಂಡಿದೆ; ಸ್ಥಳೀಯ ಮಾದರಿಗಳನ್ನು ಬಳಸಲಾಗುತ್ತಿದೆ.',
    toggleOffline: 'ಆಫ್‌ಲೈನ್ ಬದಲಾಯಿಸಿ',
    resetDemoData: 'ಡೆಮೊ ಡೇಟಾ ಮರುಹೊಂದಿಸಿ',
    language: 'ಭಾಷೆ (Language)',
    auditLog: 'ಆಡಿಟ್ ಲಾಗ್',
    guidelines: 'ಕ್ಲಿನಿಕಲ್ ಮಾರ್ಗಸೂಚಿಗಳು (ಡೆಮೊ)',
    villageStats: 'ಗ್ರಾಮ ಅಂಕಿಅಂಶಗಳು',
    prototypeNotice: 'ಕೃತಕ ಡೇಟಾ ಮಾದರಿ',
    decisionSupportOnly: 'ನಿರ್ಧಾರ ಬೆಂಬಲ, ರೋಗನಿರ್ಣಯವಲ್ಲ',
    measuredBy: 'ಪರೀಕ್ಷಿಸಿದವರು',
    timeline: 'ಕಾಲಾನುಕ್ರಮ ಇತಿಹಾಸ',
    noAlerts: 'ಯಾವುದೇ ಸಕ್ರಿಯ ಎಚ್ಚರಿಕೆಗಳಿಲ್ಲ.',
    allAlerts: 'ಎಲ್ಲಾ ಎಚ್ಚರಿಕೆಗಳು',
    overdue: 'ಬಾಕಿ ಇರುವ ಭೇಟಿಗಳು',
    deterioration: 'ತೀವ್ರ ಏರಿಳಿತಗಳು',
    followUp: 'ಫಾಲೋ-ಅಪ್',
    markDone: 'ಮುಗಿದಿದೆ ಎಂದು ಗುರುತಿಸಿ',
    dismiss: 'ತಿರಸ್ಕರಿಸಿ',
    recentTrends: 'ಇತ್ತೀಚಿನ ಪ್ರವೃತ್ತಿಗಳು',
    guidelineSource: 'ಮಾರ್ಗಸೂಚಿ ಮೂಲ',
  },
};
