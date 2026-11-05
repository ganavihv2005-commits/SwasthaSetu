import type { SupportedLanguage } from './types';

export interface MedicalTerm {
  en: string;
  hi: string;
  kn: string;
}

export const CONDITIONS_GLOSSARY: Record<string, MedicalTerm> = {
  hypertension: {
    en: 'Hypertension (High Blood Pressure)',
    hi: 'उच्च रक्तचाप (हाई बीपी)',
    kn: 'ಅಧಿಕ ರಕ್ತದೊತ್ತಡ (ಹೈ ಬಿಪಿ)',
  },
  diabetes: {
    en: 'Type 2 Diabetes (High Blood Sugar)',
    hi: 'टाइप 2 मधुमेह (शुगर)',
    kn: 'ಟೈಪ್ 2 ಮಧುಮೇಹ (ಸಕ್ಕರೆ ಕಾಯಿಲೆ)',
  },
};

export const SYMPTOMS_GLOSSARY: Record<string, MedicalTerm> = {
  headache: {
    en: 'Headache',
    hi: 'सिरदर्द',
    kn: 'ತಲೆನೋವು',
  },
  dizziness: {
    en: 'Dizziness',
    hi: 'चक्कर आना',
    kn: 'ತಲೆತಿರುಗುವಿಕೆ',
  },
  fatigue: {
    en: 'Fatigue / Weakness',
    hi: 'थकान व कमजोरी',
    kn: 'ಆಯಾಸ ಮತ್ತು ದೌರ್ಬಲ್ಯ',
  },
  blurry_vision: {
    en: 'Blurry Vision',
    hi: 'धुंधला दिखाई देना',
    kn: 'ಮಸುಕಾದ ದೃಷ್ಟಿ',
  },
  excessive_thirst: {
    en: 'Excessive Thirst',
    hi: 'अत्यधिक प्यास लगना',
    kn: 'ಅತಿಯಾದ ಬಾಯಾರಿಕೆ',
  },
  frequent_urination: {
    en: 'Frequent Urination',
    hi: 'बार-बार पेशाब आना',
    kn: 'ಪದೇ ಪದೇ ಮೂತ್ರ ವಿಸರ್ಜನೆ',
  },
  chest_heaviness: {
    en: 'Chest Heaviness',
    hi: 'छाती में भारीपन',
    kn: 'ಎದೆ ಬಿಗಿತ / ಭಾರ',
  },
  swelling_feet: {
    en: 'Swelling in Feet',
    hi: 'पैरों में सूजन',
    kn: 'ಪಾದಗಳಲ್ಲಿ ಊತ',
  },
};

export const MEDICINES_GLOSSARY: Record<string, MedicalTerm> = {
  amlodipine: {
    en: 'Amlodipine (5mg / 10mg)',
    hi: 'एम्लोडिपिन (5 मि.ग्रा / 10 मि.ग्रा)',
    kn: 'ಆಮ್ಲೋಡಿಪಿನ್ (5ಮಿ.ಗ್ರಾಂ / 10ಮಿ.ಗ್ರಾಂ)',
  },
  telmisartan: {
    en: 'Telmisartan (40mg)',
    hi: 'टेल्मीसार्टन (40 मि.ग्रा)',
    kn: 'ಟೆಲ್ಮಿಸಾರ್ಟನ್ (40ಮಿ.ಗ್ರಾಂ)',
  },
  metformin: {
    en: 'Metformin (500mg)',
    hi: 'मेटफॉर्मिन (500 मि.ग्रा)',
    kn: 'ಮೆಟ್ಫಾರ್ಮಿನ್ (500ಮಿ.ಗ್ರಾಂ)',
  },
  glimepiride: {
    en: 'Glimepiride (1mg / 2mg)',
    hi: 'ग्लीमेपिराइड (1 मि.ग्रा / 2 मि.ग्रा)',
    kn: 'ಗ್ಲೈಮೆಪಿರಿಡ್ (1ಮಿ.ಗ್ರಾಂ / 2ಮಿ.ಗ್ರಾಂ)',
  },
};

export function getTerm(glossary: Record<string, MedicalTerm>, key: string, lang: SupportedLanguage): string {
  const normalized = key.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  const found = glossary[normalized] || Object.values(glossary).find((item) => item.en.toLowerCase() === key.toLowerCase());
  if (found) {
    return found[lang] || found.en;
  }
  return key;
}
