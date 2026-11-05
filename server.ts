import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

async function startServer() {
  const app = express();
  app.use(express.json());

  // Setup Gemini SDK
  const apiKey = process.env.GEMINI_API_KEY;
  let ai: GoogleGenAI | null = null;
  if (apiKey) {
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      hasGeminiKey: !!apiKey,
      timestamp: new Date().toISOString(),
    });
  });

  // Plain-language visit brief generation endpoint (strictly de-identified facts)
  app.post('/api/gemini/visit-brief', async (req, res) => {
    try {
      const {
        age,
        sex,
        village,
        conditions,
        lastVisitSummary,
        recentTrends,
        overdueAlerts,
        guidelineChecks,
        language,
      } = req.body;

      if (!ai) {
        return res.status(503).json({
          error: 'Gemini API key is not configured in environment',
          fallbackNeeded: true,
        });
      }

      const langInstruction =
        language === 'hi'
          ? 'Produce the summary strictly in natural, everyday Hindi (Devanagari script).'
          : language === 'kn'
          ? 'Produce the summary strictly in natural, everyday Kannada script.'
          : 'Produce the summary in clear, professional English.';

      const prompt = `You are a clinical decision support assistant for Dr. Ravi, a traveling village doctor in rural India.
Summarize the following patient's longitudinal history into 2 to 3 concise, highly readable clinical sentences to prepare Dr. Ravi before his village visit.

STRICT CONSTRAINTS (Responsible AI, Privacy & Clinical Safety):
- NEVER use or ask for patient personal names or contact information.
- Use ONLY the provided structured facts below.
- Do NOT diagnose any medical condition.
- Do NOT prescribe or recommend unlisted treatments.
- Do NOT invent numbers, dates, symptoms, or lab values.
- Highlight the patient's progression trend, any overdue alert, and specific physical checks to prioritize.
- ${langInstruction}

STRUCTURED PATIENT FACTS (ANONYMISED):
- Patient: Individual (${age} years, ${sex}) in ${village}
- Chronic Conditions: ${Array.isArray(conditions) ? conditions.join(', ') : conditions}
- Last Visit Recorded: ${lastVisitSummary || 'No previous visit recorded'}
- Recent Readings & Progression: ${recentTrends || 'No recent monitoring data'}
- Overdue Follow-ups / Alerts: ${overdueAlerts || 'None'}
- Guideline Target Checks: ${guidelineChecks || 'General chronic condition review'}
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      const summary = response.text?.trim() || '';
      return res.json({
        summary,
        source: 'gemini-3.8-flash',
        model: 'gemini-3.8-flash',
      });
    } catch (err: any) {
      console.error('Gemini brief generation error:', err);
      return res.status(500).json({
        error: err.message || 'Gemini generation error',
        fallbackNeeded: true,
      });
    }
  });

  // Patient gentle summary endpoint (no diagnosis, never say worsening)
  app.post('/api/gemini/patient-summary', async (req, res) => {
    try {
      const { age, sex, village, conditions, recentReadings, nextVisitDate, medicines, language } = req.body;

      if (!ai) {
        return res.status(503).json({
          error: 'Gemini API key is not configured',
          fallbackNeeded: true,
        });
      }

      const langInstruction =
        language === 'hi'
          ? 'Produce the summary strictly in simple, reassuring Hindi (Devanagari script).'
          : language === 'kn'
          ? 'Produce the summary strictly in simple, reassuring Kannada script.'
          : 'Produce the summary in simple, reassuring English.';

      const prompt = `You are a warm, supportive rural health guide creating a personal health summary card for a villager.
Write a 2-sentence encouraging health status update that the patient can read or hear aloud.

STRICT CONSTRAINTS (Patient Safety & Responsible AI):
- NEVER include personal names, phone numbers, or identifiers.
- NEVER diagnose any disease or tell the patient they have a condition they didn't list.
- NEVER use the word "Worsening" or frightening clinical jargon. If their vitals are elevated, gently say: "Please check in with your ASHA health worker or visit Dr. Ravi on upcoming village rounds."
- If vitals are steady, encourage them to continue taking their prescribed medicines and attending regular visits.
- ${langInstruction}

FACTS:
- Patient: Villager (${age}y ${sex}) in ${village}
- Chronic Care: ${Array.isArray(conditions) ? conditions.join(', ') : conditions}
- Recent Readings: ${recentReadings || 'Vitals checked recently'}
- Current Medicines: ${medicines || 'Prescribed regimen'}
- Next Doctor Rounds: ${nextVisitDate || 'Next monthly village visit'}
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      const summary = response.text?.trim() || '';
      return res.json({
        summary,
        source: 'gemini-3.8-flash',
      });
    } catch (err: any) {
      console.error('Gemini patient summary error:', err);
      return res.status(500).json({
        error: err.message || 'Gemini generation error',
        fallbackNeeded: true,
      });
    }
  });

  const httpServer = http.createServer(app);

  // Serve static dist in production, or mount Vite middleware in development
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[SwasthaSetu] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[SwasthaSetu] Failed to start server:', err);
  process.exit(1);
});
