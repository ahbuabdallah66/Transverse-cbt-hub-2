import React, { useState, useEffect, useRef, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, ADMIN_EMAIL } from './firebase';
import { Header } from './components/Header';
import { RegistrationView } from './components/RegistrationView';
import { InstructionsView } from './components/InstructionsView';
import { ExamWorkspace } from './components/ExamWorkspace';
import { EvaluationView } from './components/EvaluationView';
import { AntiCheatModal } from './components/AntiCheatModal';
import { AdminReviewModal } from './components/AdminReviewModal';
import { AdminOverviewModal } from './components/AdminOverviewModal';
import { CadreSyllabusModal } from './components/CadreSyllabusModal';
import { Footer } from './components/Footer';
import { CandidateInfo, ExamSession, SecurityInfraction } from './types/exam';
import { generateExamQuestions } from './utils/shuffle';
import { savePracticeSession } from './services/dbService';
import { saveOfflineAssessment, cacheQuestionsOffline } from './utils/offlineStorage';
import { HelpCircle, CheckCircle2, AlertCircle } from 'lucide-react';

const MAX_INFRACTIONS = 5;

export default function App() {
  const [currentView, setCurrentView] = useState<'registration' | 'instructions' | 'exam' | 'evaluation'>('registration');
  const [candidate, setCandidate] = useState<CandidateInfo | null>(null);
  const [session, setSession] = useState<ExamSession | null>(null);

  // Security & Anti-Cheat State (Max 5 Infractions)
  const [infractionCount, setInfractionCount] = useState(0);
  const [infractionsList, setInfractionsList] = useState<SecurityInfraction[]>([]);
  const [showAntiCheatModal, setShowAntiCheatModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Modals
  const [showAdminReviewModal, setShowAdminReviewModal] = useState(false);
  const [showAdminOverviewModal, setShowAdminOverviewModal] = useState(false);
  const [showSyllabusModal, setShowSyllabusModal] = useState(false);
  const [showConfirmSubmitModal, setShowConfirmSubmitModal] = useState(false);

  // Auth User
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Timer Ref
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Listen for Google Auth state
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });

    return () => unsubscribe();
  }, []);

  // Pre-cache questions locally for instant offline usage
  useEffect(() => {
    cacheQuestionsOffline();
  }, []);

  // Fullscreen state listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Submission Calculation & Cloud Firestore Persistence
  const finalizeSubmission = useCallback((submissionType: 'manual' | 'timeout' | 'infraction_limit') => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setSession((currSession) => {
      if (!currSession || currSession.isSubmitted) return currSession;

      let score = 0;
      const categoryStats: Record<string, { correct: number; total: number; percentage: number }> = {};

      currSession.questions.forEach((q) => {
        const isCorrect = currSession.selectedAnswers[q.id] === q.correctAnswer;
        if (isCorrect) score++;

        if (!categoryStats[q.category]) {
          categoryStats[q.category] = { correct: 0, total: 0, percentage: 0 };
        }
        categoryStats[q.category].total++;
        if (isCorrect) {
          categoryStats[q.category].correct++;
        }
      });

      Object.keys(categoryStats).forEach((cat) => {
        const stat = categoryStats[cat];
        stat.percentage = Math.round((stat.correct / stat.total) * 100);
      });

      const totalTimeSpent = 3600 - currSession.timeRemainingSeconds;

      const completedSession: ExamSession = {
        ...currSession,
        isSubmitted: true,
        submissionType,
        score,
        totalTimeSpentSeconds: totalTimeSpent,
        infractions: infractionsList,
        categoryBreakdown: categoryStats,
      };

      // Persist to local offline storage and Firebase Firestore database
      saveOfflineAssessment(completedSession);
      savePracticeSession(completedSession);

      return completedSession;
    });

    setShowConfirmSubmitModal(false);
    setCurrentView('evaluation');
  }, [infractionsList]);

  // Anti-Cheat Window Blur Tracker (Auto-Submit on 5th infraction)
  useEffect(() => {
    if (currentView !== 'exam' || !session?.isStarted || session?.isSubmitted) {
      return;
    }

    const recordInfraction = (reason: string) => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString();
      const newInfraction: SecurityInfraction = {
        id: Math.random().toString(36).substring(7),
        timestamp: timeStr,
        event: 'Focus Loss / Window Blur',
        details: reason,
      };

      setInfractionsList((prev) => [...prev, newInfraction]);

      setInfractionCount((prevCount) => {
        const updatedCount = prevCount + 1;
        setShowAntiCheatModal(true);

        if (updatedCount >= MAX_INFRACTIONS) {
          // Strictly lock out and automatically submit upon 5th infraction!
          setTimeout(() => {
            finalizeSubmission('infraction_limit');
          }, 300);
        }

        return updatedCount;
      });
    };

    const handleWindowBlur = () => {
      recordInfraction('Window blur (candidate navigated away or switched applications)');
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordInfraction('Browser tab switched to background');
      }
    };

    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentView, session?.isStarted, session?.isSubmitted, finalizeSubmission]);

  // Timer Countdown Engine
  useEffect(() => {
    if (currentView === 'exam' && session?.isStarted && !session?.isSubmitted) {
      timerRef.current = setInterval(() => {
        setSession((prev) => {
          if (!prev) return null;
          if (prev.timeRemainingSeconds <= 1) {
            clearInterval(timerRef.current!);
            finalizeSubmission('timeout');
            return { ...prev, timeRemainingSeconds: 0 };
          }
          return {
            ...prev,
            timeRemainingSeconds: prev.timeRemainingSeconds - 1,
          };
        });
      }, 1000);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [currentView, session?.isStarted, session?.isSubmitted, finalizeSubmission]);

  // Candidate Registration Proceed
  const handleCandidateRegister = (info: CandidateInfo) => {
    setCandidate(info);
    setCurrentView('instructions');
  };

  // Begin active practice exam session
  const handleBeginExam = () => {
    if (!candidate) return;

    try {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch {
      // Ignore
    }

    const selectedQuestions = generateExamQuestions(candidate.gradeLevel, 40);

    const newSession: ExamSession = {
      candidate,
      questions: selectedQuestions,
      selectedAnswers: {},
      flaggedQuestions: {},
      currentIndex: 0,
      timeRemainingSeconds: 3600,
      totalTimeSpentSeconds: 0,
      isStarted: true,
      isSubmitted: false,
      submissionType: null,
      score: 0,
      totalQuestions: 40,
      infractions: [],
      categoryBreakdown: {},
    };

    setSession(newSession);
    setInfractionCount(0);
    setInfractionsList([]);
    setCurrentView('exam');
  };

  const handleSelectAnswer = (questionId: number, optionKey: 'A' | 'B' | 'C' | 'D') => {
    setSession((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        selectedAnswers: {
          ...prev.selectedAnswers,
          [questionId]: optionKey,
        },
      };
    });
  };

  const handleClearAnswer = (questionId: number) => {
    setSession((prev) => {
      if (!prev) return null;
      const updated = { ...prev.selectedAnswers };
      delete updated[questionId];
      return {
        ...prev,
        selectedAnswers: updated,
      };
    });
  };

  const handleToggleFlag = (questionId: number) => {
    setSession((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        flaggedQuestions: {
          ...prev.flaggedQuestions,
          [questionId]: !prev.flaggedQuestions[questionId],
        },
      };
    });
  };

  const handleNavigateQuestion = (index: number) => {
    setSession((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        currentIndex: index,
      };
    });
  };

  const handleRetakeExam = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCurrentView('registration');
    setSession(null);
    setInfractionCount(0);
    setInfractionsList([]);
  };

  const answeredCount = session ? Object.keys(session.selectedAnswers).length : 0;
  const unansweredCount = session ? session.questions.length - answeredCount : 0;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-emerald-100 selection:text-emerald-900">
      
      {/* Top Bar Header */}
      <Header
        candidate={session?.candidate || candidate}
        timeRemaining={session?.timeRemainingSeconds ?? 3600}
        isExamActive={currentView === 'exam' && !!session?.isStarted && !session?.isSubmitted}
        infractionCount={infractionCount}
        maxInfractions={MAX_INFRACTIONS}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        onSubmitExam={() => setShowConfirmSubmitModal(true)}
        answeredCount={answeredCount}
        totalQuestions={session?.questions.length ?? 40}
        onOpenAdmin={() => setShowAdminOverviewModal(true)}
      />

      {/* Main Content Router */}
      <div className="flex-1 flex flex-col">
        {currentView === 'registration' && (
          <RegistrationView
            currentUser={currentUser}
            onStartExam={handleCandidateRegister}
            onOpenSyllabus={() => setShowSyllabusModal(true)}
            onOpenAdminAuth={() => setShowAdminOverviewModal(true)}
          />
        )}

        {currentView === 'instructions' && candidate && (
          <InstructionsView
            candidate={candidate}
            onBeginExam={handleBeginExam}
            onBackToReg={() => setCurrentView('registration')}
          />
        )}

        {currentView === 'exam' && session && (
          <ExamWorkspace
            questions={session.questions}
            currentIndex={session.currentIndex}
            selectedAnswers={session.selectedAnswers}
            flaggedQuestions={session.flaggedQuestions}
            examMode={session.candidate.examMode}
            onSelectAnswer={handleSelectAnswer}
            onClearAnswer={handleClearAnswer}
            onToggleFlag={handleToggleFlag}
            onNavigate={handleNavigateQuestion}
            onSubmit={() => setShowConfirmSubmitModal(true)}
          />
        )}

        {currentView === 'evaluation' && session && (
          <EvaluationView
            session={session}
            onOpenAdminReview={() => setShowAdminReviewModal(true)}
            onRetakeExam={handleRetakeExam}
          />
        )}

        {currentView !== 'exam' && <Footer />}
      </div>

      {/* SUBMISSION CONFIRMATION MODAL */}
      {showConfirmSubmitModal && session && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center mx-auto mb-4">
              <HelpCircle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 text-center">
              Finish Practice Assessment?
            </h3>

            <div className="my-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-600">Total Practice Questions:</span>
                <span className="font-mono font-bold text-slate-900">{session.questions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Answered:</span>
                <span className="font-mono font-bold text-emerald-800">{answeredCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Left Blank:</span>
                <span className="font-mono font-bold text-amber-800">{unansweredCount}</span>
              </div>
            </div>

            {unansweredCount > 0 && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  You have <strong>{unansweredCount} unanswered questions</strong>. Submitting will finalize your practice score and sync your performance to the database.
                </span>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmSubmitModal(false)}
                className="flex-1 py-2.5 px-4 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors"
              >
                Continue Practice
              </button>
              <button
                type="button"
                onClick={() => finalizeSubmission('manual')}
                className="flex-1 py-2.5 px-4 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-colors flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Submit & View Results</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ANTI-CHEAT MODAL */}
      <AntiCheatModal
        isOpen={showAntiCheatModal}
        infractionCount={infractionCount}
        maxInfractions={MAX_INFRACTIONS}
        onDismiss={() => {
          setShowAntiCheatModal(false);
          if (infractionCount >= MAX_INFRACTIONS) {
            setCurrentView('evaluation');
          }
        }}
      />

      {/* DETAILED ANSWER AUDIT MODAL */}
      {session && (
        <AdminReviewModal
          isOpen={showAdminReviewModal}
          onClose={() => setShowAdminReviewModal(false)}
          session={session}
        />
      )}

      {/* PLATFORM ADMIN OVERVIEW (GOOGLE AUTH / CODES / USERS) */}
      <AdminOverviewModal
        isOpen={showAdminOverviewModal}
        onClose={() => setShowAdminOverviewModal(false)}
        currentUser={currentUser}
      />

      {/* CURRICULUM SYLLABUS MODAL */}
      <CadreSyllabusModal
        isOpen={showSyllabusModal}
        onClose={() => setShowSyllabusModal(false)}
      />

    </div>
  );
}
