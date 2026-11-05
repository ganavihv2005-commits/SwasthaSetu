import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldCheck,
  Cpu,
  Database,
  Lock,
  Stethoscope,
  Heart,
  CheckCircle2,
  FileText,
  AlertTriangle,
  Globe,
  Mic,
  KeyRound,
  Users,
} from 'lucide-react';

export const AboutPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-2xl mx-auto px-3.5 py-6 space-y-5">
      {/* Back button */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">About SwasthaSetu</h2>
          <p className="text-xs text-slate-500">
            Empowering Traveling Doctors & Rural Communities with Responsible AI & Cloud Firestore
          </p>
        </div>
      </div>

      {/* Mission / Persona */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Stethoscope className="w-4 h-4 text-teal-600" />
          <span>The Persona: Dr. Ravi in Rural Jharkhand</span>
        </h3>
        <p className="text-xs text-slate-700 leading-relaxed">
          Dr. Ravi is a traveling medical officer who serves remote villages in Jharkhand (Kasmar, Petarwar, and Gola). Patients in these communities suffer from chronic diseases like hypertension and type 2 diabetes. Paper records are frequently lost, weather-damaged, or incomplete. Dr. Ravi needs an ultra-lightweight, offline-resilient tool that ranks which patients are worsening, coordinates between-visit readings with local ASHA health workers, and provides plain-language visit briefs before each village arrival.
        </p>
      </div>

      {/* Architecture */}
      <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-5 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-teal-950 flex items-center gap-2">
          <Database className="w-4 h-4 text-teal-700" />
          <span>Real Cloud Infrastructure & Offline Resilience</span>
        </h3>

        <div className="space-y-2 text-xs text-slate-700">
          <div className="p-3 bg-white rounded-xl border border-teal-100">
            <p className="font-bold text-teal-900">1. Google Cloud Firestore with Multi-Tab Local Persistence:</p>
            <p className="text-slate-600 mt-0.5">
              100% real cloud backend with <code className="font-mono text-[11px] bg-slate-100 px-1 py-0.5 rounded">persistentLocalCache</code>. Changes sync automatically across tabs and devices within seconds using real-time listeners (<code className="font-mono text-[11px] bg-slate-100 px-1 py-0.5 rounded">onSnapshot</code>). Works offline seamlessly and syncs pending writes once network connectivity returns.
            </p>
          </div>

          <div className="p-3 bg-white rounded-xl border border-teal-100">
            <p className="font-bold text-teal-900">2. Firebase Authentication & Strict Default-Deny Security Rules:</p>
            <p className="text-slate-600 mt-0.5">
              Supports Google Sign-in and Email/Password authentication. Role-based access control enforces distinct permissions for <strong>Doctors</strong>, <strong>Health Workers</strong>, <strong>Patients</strong>, and <strong>Administrators</strong>. Security rules at the database boundary ensure staff only access patients within their assigned rural villages.
            </p>
          </div>

          <div className="p-3 bg-white rounded-xl border border-teal-100">
            <p className="font-bold text-teal-900">3. Deterministic Progression Watch (Linear Regression):</p>
            <p className="text-slate-600 mt-0.5">
              Progression analysis computes the slope of the last 4 readings against clinical guideline bounds. Zero hallucination: clinical flags always state the exact mathematical slope and cite guideline references (e.g., IGH-IV, ICMR Type 2 Diabetes).
            </p>
          </div>

          <div className="p-3 bg-white rounded-xl border border-teal-100">
            <p className="font-bold text-teal-900">4. Responsible Gemini 3.8 Flash AI Integration:</p>
            <p className="text-slate-600 mt-0.5">
              Used strictly for synthesizing structured facts into readable visit briefs and reassuring patient summaries. <strong>Zero PII</strong>: Patient names and phone numbers are never transmitted to the model or URL parameters. Automatic fallback to deterministic offline templates when disconnected.
            </p>
          </div>
        </div>
      </div>

      {/* Multilingual & Accessibility */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Globe className="w-4 h-4 text-teal-600" />
          <span>Regional Languages & Voice Accessibility</span>
        </h3>
        <p className="text-xs text-slate-700 leading-relaxed">
          SwasthaSetu supports <strong>English</strong>, <strong>Hindi (हिंदी)</strong>, and <strong>Kannada (ಕನ್ನಡ)</strong>. Features Web Speech Recognition for hands-free clinical notes by doctors and health workers, plus SpeechSynthesis for text-to-speech reading aloud in rural dialects.
        </p>
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <strong className="block">Machine-Assisted Translation Notice:</strong>
            Translations are machine-assisted for regional health worker accessibility. Clinicians and patients must verify critical clinical instructions directly with a certified medical officer.
          </div>
        </div>
      </div>

      {/* Responsible AI & Privacy Pillars */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-teal-600" />
          <span>Responsible AI & Privacy Safeguards</span>
        </h3>

        <ul className="space-y-2 text-xs text-slate-700 list-disc list-inside">
          <li>
            <strong>Mandatory Informed Consent:</strong> Patient registry creation requires explicit confirmation that oral or written consent was obtained.
          </li>
          <li>
            <strong>Patient Linking & Access Isolation:</strong> Patients access their own records using a secure 7-day linking code. They can view who accessed their record and update their consent.
          </li>
          <li>
            <strong>Immutable Audit Log:</strong> Every record access, creation, risk override, and guideline modification is recorded in an append-only Firestore collection viewable by authenticated administrators.
          </li>
          <li>
            <strong>Doctor Clinical Override:</strong> Algorithmic suggestions can be overridden by Dr. Ravi at any time with a mandatory clinical rationale.
          </li>
          <li>
            <strong>Session Security:</strong> Inactivity timeout auto sign-out after 15 minutes of idle time, and mandatory re-authentication for administrative security audits.
          </li>
        </ul>
      </div>

      <div className="text-center pt-2 text-xs text-slate-400">
        SwasthaSetu v2.0 • Firebase Cloud Backend • Rural Health Decision Support Prototype
      </div>
    </div>
  );
};
