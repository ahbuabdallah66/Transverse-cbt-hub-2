import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { QUESTION_POOL } from './src/data/questions.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// Server-side initialization of Gemini API Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

/**
 * Resilient multi-model execution helper with retry
 */
async function generateWithFallback(params: {
  contents: any;
  config?: any;
}) {
  const candidateModels = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
  let lastError: any = null;

  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config,
      });
      if (response && response.text) {
        return response.text;
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`Model ${model} unavailable (${err.status || err.message}), trying next candidate...`);
    }
  }

  throw lastError;
}

/**
 * Generates an in-depth curriculum diagnostic when the cloud model encounters transient 503 capacity limits
 */
function generateStructuredDiagnosticFallback(data: {
  candidate: any;
  score: number;
  totalQuestions: number;
  percentage: number;
  timeSpentSeconds: number;
  infractionsCount: number;
  categoryBreakdown: Record<string, any>;
  missedQuestions: any[];
}): string {
  const { candidate, score, totalQuestions, percentage, timeSpentSeconds, infractionsCount, categoryBreakdown, missedQuestions } = data;
  const isPassed = percentage >= 60;
  const mins = Math.floor((timeSpentSeconds || 0) / 60);
  const secs = (timeSpentSeconds || 0) % 60;

  const sortedCategories = Object.entries(categoryBreakdown || {}).sort(([, a], [, b]) => a.percentage - b.percentage);
  const weakest = sortedCategories[0];
  const strongest = sortedCategories[sortedCategories.length - 1];

  let missedSection = '';
  if (Array.isArray(missedQuestions) && missedQuestions.length > 0) {
    missedSection = missedQuestions.slice(0, 8).map((m: any, idx: number) => {
      return `### Question #${idx + 1}: ${m.text}
- **Your Pick:** \`${m.userChoiceKey || 'Blank'}\` — ${m.userChoiceText || 'Unanswered'}
- **Statutory Correct Answer:** \`${m.correctAnswerKey}\` — ${m.correctAnswerText}
- **Regulatory Authority:** *${m.referencePolicy || 'Civil Service Regulations'}*
- **Diagnostic Explanation:** ${m.explanation}`;
    }).join('\n\n');
  } else {
    missedSection = `**Perfect Score!** You achieved 100% accuracy with zero incorrect responses across all curriculum sections.`;
  }

  return `## 1. Executive Evaluation & Promotional Readiness

- **Candidate:** **${candidate?.fullName || 'Candidate'}** (Grade Level **${candidate?.gradeLevel || '07-10'}** Stream)
- **Score:** **${score}/${totalQuestions} (${percentage}%)** — **${isPassed ? 'READY / PASS BENCHMARK MET' : 'TARGETED REVISION REQUIRED'}**
- **Time Allocated:** 60 minutes | **Time Utilized:** ${mins}m ${secs}s (Pacing: ${(timeSpentSeconds / totalQuestions).toFixed(0)} seconds/question)
- **Exam Integrity:** ${infractionsCount === 0 ? 'Flawless browser focus (0 infractions)' : `${infractionsCount} tab/window blur alert(s)`}

${isPassed
  ? `Your performance demonstrates solid competence in civil service administration and healthcare governance. You have crossed the official 60% composite promotional benchmark.`
  : `Your score is currently below the 60% promotional benchmark. A focused review of statutory regulations and departmental schemes of service will close the knowledge gap.`}

---

## 2. Diagnostic Review of Missed Questions & Statutory Explanations

${missedSection}

---

## 3. Domain Strengths vs Priority Revision Areas

- **Strongest Competency:** **${strongest ? strongest[0] : 'General Civil Service'}** (${strongest ? strongest[1].percentage : 100}%)
- **Primary Area for Growth:** **${weakest ? weakest[0] : 'Public Service Rules'}** (${weakest ? weakest[1].percentage : 0}%)

### Breakdown Summary:
${sortedCategories.map(([cat, stat]) => `• **${cat}:** ${stat.correct}/${stat.total} (${stat.percentage}%) — ${stat.percentage >= 70 ? 'Mastered' : stat.percentage >= 50 ? 'Moderate' : 'Needs Urgent Review'}`).join('\n')}

---

## 4. High-Yield Action Plan for Grade Level ${candidate?.gradeLevel || '07-10'} Promotion

1. **Master Public Service Rules (PSR Chapters 02 & 03):** Review compulsory retirement rules, disciplinary query timelines (72 hours), misconduct vs serious misconduct distinctions, and study leave eligibility.
2. **Memorize Cadre Progression Criteria:** Confirm the approved Scheme of Service progression milestones, terminal grade levels for your health cadre, and administrative reporting chains.
3. **Practice Pacing & Flagging:** Utilize the split-screen matrix grid to immediately flag complex procurement or financial regulation questions for review in the final 10 minutes.
4. **Use the Interactive AI Tutor:** Use the **"Ask AI Tutor"** tab right here to ask specific questions about any of your missed questions or difficult regulatory concepts!`;
}

/**
 * Generates an informative tutor reply when the cloud model encounters transient 503 capacity limits
 */
function generateTutorChatFallback(message: string, context: any): string {
  const lower = message.toLowerCase();

  // Search if user asks about a specific question
  const qMatch = lower.match(/(?:question|q)\s*(?:#|\s)?\s*(\d+)/i);
  if (qMatch) {
    const qNum = parseInt(qMatch[1], 10);
    const question = QUESTION_POOL.find((q) => q.id === qNum) || QUESTION_POOL[qNum - 1];
    if (question) {
      return `### Question #${qNum} Statutory Explanation:
**Question:** ${question.text}

- **Correct Answer (${question.correctAnswer}):** ${question.options.find(o => o.key === question.correctAnswer)?.text}
- **Official Policy Reference:** *${question.referencePolicy}*
- **Regulatory Rationale:** ${question.explanation}

**Exam Tip:** In civil service assessments, always look for exact statutory keywords in the question stem. What else would you like to review?`;
    }
  }

  if (lower.includes('misconduct') || lower.includes('serious misconduct')) {
    return `### Misconduct vs. Serious Misconduct (PSR Chapter 03):
- **Misconduct (PSR 030301):** A specific act of wrongdoing or improper behavior which can be investigated and dealt with at the Ministry level. Examples include: unpunctuality, sleeping on duty, improper dressing, or refusal to obey lawful orders.
- **Serious Misconduct (PSR 030402):** A specific act of very grave nature and culpable negligence. Examples include: **Falsification of official records**, **Absence from Duty Without Leave (AWOL)**, **Corruption/Bribery**, **Embezzlement**, **Engaging in partisan political activities**, and **Unauthorized disclosure of official secrets**.
- **Disciplinary Action:** Serious misconduct may result in interdiction, suspension, reduction in rank, or outright dismissal by the Civil Service Commission.`;
  }

  if (lower.includes('retirement') || lower.includes('age') || lower.includes('35') || lower.includes('60')) {
    return `### Compulsory Retirement Age (PSR 020810):
- **Statutory Rule:** All pensionable civil servants must retire upon reaching **60 years of age** or completing **35 years of pensionable service**, whichever comes earlier.
- **Constitutional Exceptions:** Judicial officers and university professors who have special constitutional retirement provisions.`;
  }

  if (lower.includes('query') || lower.includes('72 hours') || lower.includes('defense')) {
    return `### Disciplinary Query Representation (PSR 030302):
- When an official query is served on an officer alleging misconduct, the officer must submit a written representation within **72 hours (3 working days)**.
- If the officer fails to reply within the statutory 72-hour window, the disciplinary committee may presume that the officer has no defense and proceed to recommendation.`;
  }

  return `### AI Tutor Guidance for Grade Level ${context?.gradeLevel || '07-10'}:
Regarding your question: *"${message}"*

In Civil Service and Healthcare promotion evaluations:
1. **Statutory Primacy:** Answers are judged strictly against the Public Service Rules (PSR), the Scheme of Service, and Financial Regulations.
2. **Disciplinary Strictness:** Always remember the difference between general misconduct and serious misconduct.
3. **Core Health Protocols:** Familiarize yourself with KADCHMA contributory health insurance, essential drug lists, and clinical governance structures.

Would you like me to explain a specific question from your test, or clarify another administrative regulation?`;
}

/**
 * Endpoint 1: Comprehensive AI Performance Diagnostic & Analysis
 */
app.post('/api/ai/analyze-assessment', async (req, res) => {
  const {
    candidate,
    score,
    totalQuestions,
    percentage,
    timeSpentSeconds,
    infractionsCount,
    categoryBreakdown,
    missedQuestions,
  } = req.body;

  const missedDetails = Array.isArray(missedQuestions) && missedQuestions.length > 0
    ? missedQuestions
        .slice(0, 15)
        .map(
          (q: any, i: number) =>
            `Missed Question #${i + 1}:
- Question: "${q.text}"
- Candidate Chosen: ${q.userChoiceText ? `${q.userChoiceKey}: ${q.userChoiceText}` : 'Unanswered / Blank'}
- Correct Answer: ${q.correctAnswerKey}: ${q.correctAnswerText}
- Category: ${q.category}
- Statutory Rule/Citation: ${q.referencePolicy}
- Official Rationale: ${q.explanation}`
        )
        .join('\n\n')
    : 'None (Candidate achieved 100% score)';

  const prompt = `You are a Senior Civil Service Examination Evaluator and Healthcare Education Specialist.
A candidate has just completed their promotional practice CBT assessment on the platform.

Here is their performance dossier:
- Candidate Name: ${candidate?.fullName || 'Candidate'}
- Target Curriculum Stream: Grade Level ${candidate?.gradeLevel || '07-10'}
- Cadre / Speciality: ${candidate?.cadre || 'Civil Service'}
- Department / Health Sector: ${candidate?.department || 'Health Services'}
- Overall Score: ${score} out of ${totalQuestions} (${percentage}%)
- Standard Promotion Benchmark: 60% (Result: ${percentage >= 60 ? 'BENCHMARK MET (READY)' : 'BELOW BENCHMARK (NEEDS REVISION)'})
- Time Utilized: ${Math.floor((timeSpentSeconds || 0) / 60)} minutes ${(timeSpentSeconds || 0) % 60} seconds (Allocated: 60 minutes)
- Security Tab/Window Shifts: ${infractionsCount || 0} event(s)

Subject Domain Breakdown:
${Object.entries(categoryBreakdown || {})
  .map(
    ([cat, stat]: [string, any]) =>
      `• ${cat}: ${stat.correct}/${stat.total} correct (${stat.percentage}%)`
  )
  .join('\n')}

Specific Missed Questions and Regulatory References:
${missedDetails}

Please generate an in-depth, structured, encouraging, and pedagogically rich performance analysis for this candidate.
Format your response using clean Markdown with distinct headers and bullet points:

1. **Executive Evaluation & Promotional Readiness**: High-level verdict on their readiness for promotion, pace analysis, and exam temperament.
2. **Diagnostic Review of Missed Questions**: Clear, easy-to-understand explanations of the key statutory concepts (e.g. Public Service Rules, Scheme of Service, financial regulations, or health protocols) they got wrong, explaining *why* the correct answer is statutory standard.
3. **Domain Strengths vs Priority Revision Areas**: Contrast their strongest topics against areas that need urgent brush-up.
4. **Targeted High-Yield Action Plan**: 3 to 4 actionable, practical revision recommendations tailored for Grade Level ${candidate?.gradeLevel || '07-10'} promotional examinations.`;

  try {
    const analysisText = await generateWithFallback({
      contents: prompt,
      config: {
        systemInstruction:
          'You are an authoritative, encouraging, and precise Civil Service & Healthcare Examination Tutor. Provide clear, accurate statutory and professional guidance without bureaucratic jargon.',
      },
    });

    return res.json({ analysis: analysisText });
  } catch (err: any) {
    console.warn('Gemini API call failed (likely 503 spike). Serving curriculum diagnostic:', err.message);
    const fallbackText = generateStructuredDiagnosticFallback({
      candidate,
      score,
      totalQuestions,
      percentage,
      timeSpentSeconds,
      infractionsCount,
      categoryBreakdown,
      missedQuestions,
    });
    return res.json({ analysis: fallbackText });
  }
});

/**
 * Endpoint 2: Interactive AI Tutor Q&A Chat
 */
app.post('/api/ai/chat-assessment', async (req, res) => {
  const { assessmentContext, conversationHistory, message } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required.' });
  }

  const contextPrompt = `ASSESSMENT CONTEXT:
- Candidate: ${assessmentContext?.candidateName || 'Candidate'}
- Stream: Grade Level ${assessmentContext?.gradeLevel || '07-10'}
- Cadre: ${assessmentContext?.cadre || 'Healthcare / Admin'}
- Overall Score: ${assessmentContext?.score}/${assessmentContext?.totalQuestions} (${assessmentContext?.percentage}%)
- Weakest Areas: ${assessmentContext?.weakestCategories || 'None specified'}
- Missed Topics: ${assessmentContext?.missedTopicsSummary || 'None'}`;

  const contents: any[] = [];

  contents.push({
    role: 'user',
    parts: [
      {
        text: `${contextPrompt}\n\nCandidate has completed the practice CBT assessment. Please assist them as their personal Civil Service & Healthcare study tutor.`,
      },
    ],
  });

  contents.push({
    role: 'model',
    parts: [
      {
        text: `Understood! I have reviewed your completed assessment for Grade Level ${assessmentContext?.gradeLevel || '07-10'}. I'm ready to answer any questions about the questions you encountered, explain Public Service Rules, clarify healthcare procedures and financial guidelines, or provide revision strategies. What would you like to explore?`,
      },
    ],
  });

  if (Array.isArray(conversationHistory)) {
    for (const turn of conversationHistory) {
      if (turn.role === 'user' || turn.role === 'model') {
        contents.push({
          role: turn.role,
          parts: [{ text: turn.content }],
        });
      }
    }
  }

  contents.push({
    role: 'user',
    parts: [{ text: message }],
  });

  try {
    const replyText = await generateWithFallback({
      contents,
      config: {
        systemInstruction:
          'You are an interactive, articulate AI Examination Tutor for Civil Service & Healthcare promotion candidates. You provide concise, insightful explanations of Public Service Rules (PSR), health cadres, scheme of service, and disciplinary laws. Use formatting, bullet points, and mnemonics where appropriate.',
      },
    });

    return res.json({ reply: replyText });
  } catch (err: any) {
    console.warn('Gemini chat call failed (likely 503 spike). Serving curriculum guidance:', err.message);
    const tutorReply = generateTutorChatFallback(message, assessmentContext);
    return res.json({ reply: tutorReply });
  }
});

async function startServer() {
  const distPath = path.resolve(__dirname, 'dist');
  const hasDist = fs.existsSync(path.resolve(distPath, 'index.html'));
  const isProd =
    process.env.NODE_ENV === 'production' ||
    Boolean(process.env.K_SERVICE) ||
    Boolean(process.env.K_REVISION) ||
    (hasDist && process.env.npm_lifecycle_event !== 'dev');

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();
