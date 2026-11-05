import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { LOCALES, type SupportedLanguage, type Translations } from './index';

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: Translations;
  speak: (text: string) => void;
  stopSpeaking: () => void;
  isSpeaking: boolean;
  voiceSupported: boolean;
  speechRecognitionSupported: boolean;
  listen: (onResult: (transcript: string) => void, onEnd?: () => void) => () => void;
  startSpeechRecognition: (onResult: (transcript: string) => void, onEnd?: () => void) => () => void;
  stopSpeechRecognition: () => void;
  isListening: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const BROWSER_LANG_MAP: Record<SupportedLanguage, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  kn: 'kn-IN',
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    const saved = localStorage.getItem('swasthasetu_lang');
    return (saved as SupportedLanguage) || 'en';
  });

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const voiceSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const speechRecognitionSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    localStorage.setItem('swasthasetu_lang', lang);
  };

  const t = LOCALES[language] || LOCALES.en;

  // Voice Output (Speech Synthesis)
  const speak = useCallback(
    (text: string) => {
      if (!voiceSupported) {
        console.warn('Speech synthesis not supported in this browser.');
        return;
      }
      window.speechSynthesis.cancel();
      const cleanText = text.replace(/[*#_~]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      const targetLang = BROWSER_LANG_MAP[language] || 'en-IN';
      utterance.lang = targetLang;

      // Try to find matching voice
      const voices = window.speechSynthesis.getVoices();
      const match = voices.find((v) => v.lang.startsWith(language) || v.lang === targetLang);
      if (match) {
        utterance.voice = match;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    },
    [language, voiceSupported]
  );

  const stopSpeaking = useCallback(() => {
    if (voiceSupported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [voiceSupported]);

  // Voice Input (Speech Recognition)
  const listen = useCallback(
    (onResult: (transcript: string) => void, onEnd?: () => void) => {
      if (!speechRecognitionSupported) {
        alert('Voice input is not supported in this browser. Please type directly.');
        return () => {};
      }

      const SpeechRecognitionClass =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognitionClass();
      recognition.lang = BROWSER_LANG_MAP[language] || 'en-IN';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          onResult(transcript);
        }
      };
      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
      };
      recognition.onend = () => {
        setIsListening(false);
        if (onEnd) onEnd();
      };

      recognition.start();

      return () => {
        try {
          recognition.abort();
        } catch {}
        setIsListening(false);
      };
    },
    [language, speechRecognitionSupported]
  );

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        speak,
        stopSpeaking,
        isSpeaking,
        voiceSupported,
        speechRecognitionSupported,
        listen,
        startSpeechRecognition: listen,
        stopSpeechRecognition: () => setIsListening(false),
        isListening,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};
