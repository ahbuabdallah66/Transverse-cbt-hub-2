import { QUESTION_POOL, Question } from '../data/questions';
import { ExamSession } from '../types/exam';

const OFFLINE_QUESTIONS_KEY = 'cbt_offline_question_bank_v1';
const OFFLINE_ASSESSMENTS_PREFIX = 'cbt_offline_assessments_';

export interface SavedAssessmentRecord {
  id: string;
  candidateEmail: string;
  candidateName: string;
  gradeLevel: string;
  examMode: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  totalTimeSpentSeconds: number;
  submittedAt: string;
  timestamp: number;
  submissionType: string;
  categoryBreakdown: Record<string, { correct: number; total: number; percentage: number }>;
  aiAnalysis?: string;
  sessionData: ExamSession;
}

/**
 * Pre-caches the full 120-question bank in local storage for offline assessment taking
 */
export function cacheQuestionsOffline(): { count: number; timestamp: number } {
  try {
    const payload = {
      version: '1.0',
      count: QUESTION_POOL.length,
      timestamp: Date.now(),
      questions: QUESTION_POOL,
    };
    localStorage.setItem(OFFLINE_QUESTIONS_KEY, JSON.stringify(payload));
    return { count: QUESTION_POOL.length, timestamp: payload.timestamp };
  } catch (err) {
    console.warn('Could not cache questions in localStorage:', err);
    return { count: QUESTION_POOL.length, timestamp: Date.now() };
  }
}

/**
 * Returns cached offline questions, falling back to in-memory question pool
 */
export function getOfflineQuestions(): Question[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUESTIONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
        return parsed.questions;
      }
    }
  } catch (err) {
    console.warn('Error reading offline question cache:', err);
  }
  return QUESTION_POOL;
}

/**
 * Checks if the question bank is cached locally
 */
export function isQuestionBankCached(): boolean {
  try {
    return !!localStorage.getItem(OFFLINE_QUESTIONS_KEY);
  } catch {
    return false;
  }
}

/**
 * Saves a completed assessment record locally so candidates can review and run AI analysis on them
 */
export function saveOfflineAssessment(session: ExamSession): SavedAssessmentRecord {
  const candidateEmail = (session.candidate?.email || 'guest').toLowerCase().trim();
  const key = `${OFFLINE_ASSESSMENTS_PREFIX}${candidateEmail}`;

  const recordId = `exam_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const percentage = Math.round((session.score / (session.totalQuestions || 40)) * 100);

  const newRecord: SavedAssessmentRecord = {
    id: recordId,
    candidateEmail,
    candidateName: session.candidate?.fullName || 'Candidate',
    gradeLevel: session.candidate?.gradeLevel || '07-10',
    examMode: session.candidate?.examMode || 'exam',
    score: session.score,
    totalQuestions: session.totalQuestions || 40,
    percentage,
    totalTimeSpentSeconds: session.totalTimeSpentSeconds || 0,
    submittedAt: new Date().toLocaleString(),
    timestamp: Date.now(),
    submissionType: session.submissionType || 'manual',
    categoryBreakdown: session.categoryBreakdown || {},
    sessionData: session,
  };

  try {
    const existingRaw = localStorage.getItem(key);
    let list: SavedAssessmentRecord[] = [];
    if (existingRaw) {
      list = JSON.parse(existingRaw);
    }
    // Prepend latest assessment
    list.unshift(newRecord);
    // Keep up to 50 assessments locally
    if (list.length > 50) list = list.slice(0, 50);
    localStorage.setItem(key, JSON.stringify(list));
  } catch (err) {
    console.warn('Could not store assessment offline:', err);
  }

  return newRecord;
}

/**
 * Retrieves all offline assessments for a given candidate email
 */
export function getOfflineAssessments(candidateEmail: string): SavedAssessmentRecord[] {
  const email = (candidateEmail || '').toLowerCase().trim();
  const key = `${OFFLINE_ASSESSMENTS_PREFIX}${email}`;

  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) return list;
    }
  } catch (err) {
    console.warn('Could not read saved offline assessments:', err);
  }
  return [];
}

/**
 * Updates an assessment record with STELLA AI Analysis output
 */
export function saveAssessmentAiAnalysis(candidateEmail: string, assessmentId: string, analysisText: string): void {
  const email = (candidateEmail || '').toLowerCase().trim();
  const key = `${OFFLINE_ASSESSMENTS_PREFIX}${email}`;

  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const list: SavedAssessmentRecord[] = JSON.parse(raw);
      const updated = list.map((item) => {
        if (item.id === assessmentId) {
          return { ...item, aiAnalysis: analysisText };
        }
        return item;
      });
      localStorage.setItem(key, JSON.stringify(updated));
    }
  } catch (err) {
    console.warn('Failed to save AI analysis to assessment record:', err);
  }
}
