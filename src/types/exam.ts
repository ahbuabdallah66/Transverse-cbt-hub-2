import { Question } from '../data/questions';

export type GradeLevel = '07-10' | '12-13';
export type ExamMode = 'exam' | 'practice';

export interface CandidateInfo {
  fullName: string;
  email: string;
  department: string;
  cadre: string;
  gradeLevel: GradeLevel;
  examMode: ExamMode;
  accessCode: string;
  hardwareId?: string;
}

export interface SecurityInfraction {
  id: string;
  timestamp: string;
  event: string;
  details: string;
}

export interface ExamSession {
  candidate: CandidateInfo;
  questions: Question[];
  selectedAnswers: Record<number, 'A' | 'B' | 'C' | 'D'>;
  flaggedQuestions: Record<number, boolean>;
  currentIndex: number;
  timeRemainingSeconds: number; // 60 mins = 3600s
  totalTimeSpentSeconds: number;
  isStarted: boolean;
  isSubmitted: boolean;
  submissionType: 'manual' | 'timeout' | 'infraction_limit' | null;
  score: number;
  totalQuestions: number;
  infractions: SecurityInfraction[];
  categoryBreakdown: Record<string, { correct: number; total: number; percentage: number }>;
}

export type AccessKeyStatus = 'unclaimed' | 'claimed' | 'disabled';

export interface AccessCodeRecord {
  id: string; // The code itself (e.g. PASS-4921)
  code: string;
  createdAt: number;
  status: 'active' | 'disabled'; // admin master toggle
  keyStatus?: AccessKeyStatus; // 'unclaimed' | 'claimed' | 'disabled'
  usedCount: number;
  boundHardwareId?: string | null;
  boundDeviceId?: string | null;
  boundEmail?: string | null;
  boundUserName?: string | null;
  activatedAt?: number | null;
  assignedGradeLevel?: 'ANY'; // Universal for all grade levels
  notes?: string;
  gpuRenderer?: string;
}

export interface RegisteredUserRecord {
  id: string; // sanitized email or hardwareId
  email: string;
  fullName: string;
  department?: string;
  cadre?: string;
  hardwareId: string; // Canonical Hardware Fingerprint
  accessCode: string;
  registeredAt: number;
  lastActiveAt: number;
  totalPracticeSessions: number;
  highestScore: number;
  gpuRenderer?: string;
}

export interface AuditDeletedProfileRecord {
  id: string;
  candidateEmail: string;
  candidateName: string;
  department?: string;
  cadre?: string;
  hardwareId: string;
  accessCode: string;
  totalPracticeSessions: number;
  highestScore: number;
  registeredAt?: number;
  deletedAt: number;
  deletedBy: 'candidate_self' | 'admin';
  deletionReason?: string;
  action: string;
}
