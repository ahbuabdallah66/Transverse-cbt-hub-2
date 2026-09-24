import React, { useState, useEffect, useCallback } from 'react';
import { Flag, ArrowLeft, ArrowRight, CheckCircle2, RotateCcw, HelpCircle, Eye, EyeOff, LayoutGrid } from 'lucide-react';
import { Question } from '../data/questions';
import { ExamMode } from '../types/exam';

interface ExamWorkspaceProps {
  questions: Question[];
  currentIndex: number;
  selectedAnswers: Record<number, 'A' | 'B' | 'C' | 'D'>;
  flaggedQuestions: Record<number, boolean>;
  examMode: ExamMode;
  onSelectAnswer: (questionId: number, optionKey: 'A' | 'B' | 'C' | 'D') => void;
  onClearAnswer: (questionId: number) => void;
  onToggleFlag: (questionId: number) => void;
  onNavigate: (index: number) => void;
  onSubmit: () => void;
}

export const ExamWorkspace: React.FC<ExamWorkspaceProps> = ({
  questions,
  currentIndex,
  selectedAnswers,
  flaggedQuestions,
  examMode,
  onSelectAnswer,
  onClearAnswer,
  onToggleFlag,
  onNavigate,
  onSubmit,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'answered' | 'unanswered' | 'flagged'>('all');
  const [showPracticeExplanation, setShowPracticeExplanation] = useState(false);
  const [isMobileGridOpen, setIsMobileGridOpen] = useState(false);

  const currentQ = questions[currentIndex];
  const isCurrentFlagged = !!flaggedQuestions[currentQ?.id];
  const currentSelection = selectedAnswers[currentQ?.id];

  // Hotkey listener for A, B, C, D, ArrowRight, ArrowLeft, N, P, F
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't intercept if an input is focused
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      const key = e.key.toUpperCase();

      if (['A', 'B', 'C', 'D'].includes(key) && currentQ) {
        e.preventDefault();
        onSelectAnswer(currentQ.id, key as 'A' | 'B' | 'C' | 'D');
      } else if (key === '1' && currentQ) {
        e.preventDefault();
        onSelectAnswer(currentQ.id, 'A');
      } else if (key === '2' && currentQ) {
        e.preventDefault();
        onSelectAnswer(currentQ.id, 'B');
      } else if (key === '3' && currentQ) {
        e.preventDefault();
        onSelectAnswer(currentQ.id, 'C');
      } else if (key === '4' && currentQ) {
        e.preventDefault();
        onSelectAnswer(currentQ.id, 'D');
      } else if ((e.key === 'ArrowRight' || key === 'N') && currentIndex < questions.length - 1) {
        e.preventDefault();
        onNavigate(currentIndex + 1);
      } else if ((e.key === 'ArrowLeft' || key === 'P') && currentIndex > 0) {
        e.preventDefault();
        onNavigate(currentIndex - 1);
      } else if (key === 'F' && currentQ) {
        e.preventDefault();
        onToggleFlag(currentQ.id);
      }
    },
    [currentQ, currentIndex, questions.length, onSelectAnswer, onNavigate, onToggleFlag]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Reset practice explanation when question changes
  useEffect(() => {
    setShowPracticeExplanation(false);
  }, [currentIndex]);

  const answeredCount = Object.keys(selectedAnswers).length;
  const flaggedCount = Object.values(flaggedQuestions).filter(Boolean).length;
  const unansweredCount = questions.length - answeredCount;

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4.5rem)] bg-slate-100 overflow-hidden">
      
      {/* MOBILE GRID TOGGLE BAR (Visible on small screens) */}
      <div className="lg:hidden bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between">
        <button
          onClick={() => setIsMobileGridOpen(!isMobileGridOpen)}
          className="flex items-center gap-2 text-xs font-bold text-slate-800 bg-slate-100 px-3 py-1.5 rounded-md"
        >
          <LayoutGrid className="w-4 h-4 text-emerald-700" />
          <span>Question Grid ({answeredCount}/{questions.length})</span>
        </button>
        <span className="text-xs font-semibold text-slate-600">
          Question {currentIndex + 1} of {questions.length}
        </span>
      </div>

      {/* LEFT MATRIX GRID PANEL */}
      <aside
        className={`w-full lg:w-80 bg-white border-r border-slate-200 flex flex-col shrink-0 z-20 transition-all ${
          isMobileGridOpen ? 'fixed inset-x-0 top-18 bottom-0 bg-white p-4 overflow-y-auto block' : 'hidden lg:flex'
        }`}
      >
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <LayoutGrid className="w-4 h-4 text-emerald-700" />
              <span>Question Matrix (40)</span>
            </h3>
            {isMobileGridOpen && (
              <button
                onClick={() => setIsMobileGridOpen(false)}
                className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded"
              >
                Done
              </button>
            )}
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-medium text-slate-600">
              <span>Completion Rate</span>
              <span className="font-mono font-bold text-slate-900 tabular-nums">
                {Math.round((answeredCount / questions.length) * 100)}%
              </span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 transition-all duration-300 rounded-full"
                style={{ width: `${(answeredCount / questions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Filter Tabs (Interactive Segmented Buttons) */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-lg mt-3 text-xs">
            <button
              onClick={() => setFilterMode('all')}
              className={`py-1 rounded font-medium transition-colors ${
                filterMode === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterMode('answered')}
              className={`py-1 rounded font-medium transition-colors ${
                filterMode === 'answered'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ans ({answeredCount})
            </button>
            <button
              onClick={() => setFilterMode('unanswered')}
              className={`py-1 rounded font-medium transition-colors ${
                filterMode === 'unanswered'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Left ({unansweredCount})
            </button>
            <button
              onClick={() => setFilterMode('flagged')}
              className={`py-1 rounded font-medium transition-colors ${
                filterMode === 'flagged'
                  ? 'bg-white text-amber-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Flag ({flaggedCount})
            </button>
          </div>
        </div>

        {/* 40 Questions Grid Boxes */}
        <div className="p-4 flex-1 overflow-y-auto">
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
            {questions.map((q, idx) => {
              const isAnswered = selectedAnswers[q.id] !== undefined;
              const isFlagged = !!flaggedQuestions[q.id];
              const isCurrent = idx === currentIndex;

              // Filter logic
              if (filterMode === 'answered' && !isAnswered) return null;
              if (filterMode === 'unanswered' && isAnswered) return null;
              if (filterMode === 'flagged' && !isFlagged) return null;

              return (
                <button
                  key={q.id}
                  onClick={() => {
                    onNavigate(idx);
                    setIsMobileGridOpen(false);
                  }}
                  className={`relative h-11 rounded-lg font-mono text-sm font-bold transition-all flex items-center justify-center border ${
                    isCurrent
                      ? 'ring-2 ring-emerald-600 ring-offset-2 border-emerald-700 shadow-sm z-10'
                      : ''
                  } ${
                    isAnswered
                      ? 'bg-emerald-700 text-white border-emerald-800 hover:bg-emerald-800'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                  title={`Question ${idx + 1}: ${isAnswered ? 'Answered' : 'Unanswered'}${
                    isFlagged ? ' (Flagged)' : ''
                  }`}
                >
                  <span>{String(idx + 1).padStart(2, '0')}</span>

                  {/* Flag indicator dot */}
                  {isFlagged && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full ring-2 ring-white" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Grid Legend & Submit Action */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/50 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-700 inline-block shrink-0" />
              <span>Answered</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-white border border-slate-300 inline-block shrink-0" />
              <span>Unanswered</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded border-2 border-emerald-600 inline-block shrink-0" />
              <span>Current</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-500 inline-block shrink-0" />
              <span>Flagged</span>
            </div>
          </div>

          <button
            onClick={onSubmit}
            className="w-full py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Finish & Submit Evaluation</span>
          </button>
        </div>
      </aside>

      {/* MAIN QUESTION WORKSPACE STAGE */}
      <main className="flex-1 flex flex-col overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl w-full mx-auto flex-1 flex flex-col justify-between">
          
          {/* Question Card Box */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 mb-6">
            
            {/* Header Kicker (Category & Curriculum Domain) */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-100">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="font-bold text-emerald-800 uppercase tracking-wider">
                  Question {currentIndex + 1} of {questions.length}
                </span>
                <span aria-hidden="true">·</span>
                <span className="text-slate-600 font-medium">
                  {currentQ?.category}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Flag for Review Button */}
                <button
                  onClick={() => onToggleFlag(currentQ.id)}
                  type="button"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    isCurrentFlagged
                      ? 'bg-amber-100 border-amber-300 text-amber-900'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                  title="Flag for later review (Hotkey: F)"
                >
                  <Flag className={`w-3.5 h-3.5 ${isCurrentFlagged ? 'fill-amber-600 text-amber-600' : ''}`} />
                  <span>{isCurrentFlagged ? 'Flagged for Review' : 'Flag Question'}</span>
                  <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono">
                    F
                  </kbd>
                </button>

                {/* Practice Mode Instant Hint Toggle */}
                {examMode === 'practice' && (
                  <button
                    onClick={() => setShowPracticeExplanation(!showPracticeExplanation)}
                    type="button"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                  >
                    {showPracticeExplanation ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showPracticeExplanation ? 'Hide Answer' : 'Reveal Answer'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Question Text */}
            <div className="mb-6">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                {currentQ?.text}
              </h2>
            </div>

            {/* Option Choices A, B, C, D */}
            <div className="space-y-3">
              {currentQ?.options.map((opt) => {
                const isSelected = currentSelection === opt.key;
                const isCorrect = opt.key === currentQ.correctAnswer;
                
                // Show color coding only if in practice mode and user asked to reveal
                const isPracticeRevealed = examMode === 'practice' && showPracticeExplanation;

                let optionClasses = 'border-slate-200 bg-white hover:bg-slate-50/80 text-slate-800';
                if (isSelected) {
                  optionClasses = 'border-emerald-700 bg-emerald-50/60 text-emerald-950 font-semibold shadow-xs ring-1 ring-emerald-700';
                }
                if (isPracticeRevealed) {
                  if (isCorrect) {
                    optionClasses = 'border-emerald-600 bg-emerald-100 text-emerald-950 font-bold';
                  } else if (isSelected && !isCorrect) {
                    optionClasses = 'border-rose-400 bg-rose-50 text-rose-900';
                  }
                }

                return (
                  <div
                    key={opt.key}
                    onClick={() => onSelectAnswer(currentQ.id, opt.key)}
                    className={`flex items-start gap-3.5 p-4 rounded-xl border-2 cursor-pointer transition-all ${optionClasses}`}
                  >
                    {/* Option Badge */}
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-sm shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-emerald-800 text-white'
                          : 'bg-slate-100 text-slate-700 border border-slate-300'
                      }`}
                    >
                      {opt.key}
                    </div>

                    <div className="flex-1 text-sm pt-1 leading-relaxed">
                      {opt.text}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Practice Mode Explanation Box */}
            {examMode === 'practice' && showPracticeExplanation && (
              <div className="mt-6 p-4 rounded-lg bg-emerald-50 border border-emerald-300 text-xs text-slate-800 space-y-1.5">
                <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  <span>Official Answer: Option {currentQ.correctAnswer}</span>
                </div>
                <p className="leading-relaxed text-slate-700">
                  {currentQ.explanation}
                </p>
                <div className="text-[11px] text-emerald-800 font-semibold pt-1">
                  Policy Reference: {currentQ.referencePolicy}
                </div>
              </div>
            )}

            {/* Clear Response Button */}
            {currentSelection && (
              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => onClearAnswer(currentQ.id)}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-rose-600 font-medium transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear selection</span>
                </button>
              </div>
            )}
          </div>

          {/* Action Navigation Bar */}
          <div className="flex items-center justify-between gap-3 py-2">
            <button
              onClick={() => onNavigate(currentIndex - 1)}
              disabled={currentIndex === 0}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold border transition-all ${
                currentIndex === 0
                  ? 'border-slate-200 text-slate-300 cursor-not-allowed bg-slate-50'
                  : 'border-slate-300 text-slate-700 bg-white hover:bg-slate-50 shadow-xs'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous</span>
              <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono text-slate-500">
                P / ←
              </kbd>
            </button>

            {/* Keyboard Shortcut Reminder Strip */}
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-500">
              <span>Hotkeys:</span>
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono font-bold text-slate-700">
                A B C D
              </kbd>
              <span>to select</span>
              <span aria-hidden="true">·</span>
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono font-bold text-slate-700">
                N / →
              </kbd>
              <span>for next</span>
            </div>

            {currentIndex < questions.length - 1 ? (
              <button
                onClick={() => onNavigate(currentIndex + 1)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold bg-emerald-800 hover:bg-emerald-700 text-white shadow-xs transition-all"
              >
                <span>Next</span>
                <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 bg-emerald-900 rounded text-[10px] font-mono text-emerald-200">
                  N / →
                </kbd>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onSubmit}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-xs transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Submit Assessment</span>
              </button>
            )}
          </div>

        </div>
      </main>

    </div>
  );
};
