import React, { useState } from 'react';
import { Unlock, CheckCircle2, XCircle, ShieldCheck, Printer, AlertTriangle, FileText, Search, BookOpen, Sparkles } from 'lucide-react';
import { ExamSession } from '../types/exam';

interface AdminReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: ExamSession;
}

export const AdminReviewModal: React.FC<AdminReviewModalProps> = ({
  isOpen,
  onClose,
  session,
}) => {
  const [isUnlocked, setIsUnlocked] = useState(true); // Open directly for practice review
  const [reviewFilter, setReviewFilter] = useState<'all' | 'missed' | 'correct'>('missed');
  const [searchQuery, setSearchQuery] = useState('');
  const [supervisorNotes, setSupervisorNotes] = useState('');

  if (!isOpen) return null;

  const missedQuestions = session.questions.filter((q) => {
    const selected = session.selectedAnswers[q.id];
    return selected !== q.correctAnswer;
  });

  const correctQuestions = session.questions.filter((q) => {
    const selected = session.selectedAnswers[q.id];
    return selected === q.correctAnswer;
  });

  // Filtered list
  const displayedQuestions = session.questions.filter((q) => {
    const selected = session.selectedAnswers[q.id];
    const isCorrect = selected === q.correctAnswer;
    
    if (reviewFilter === 'missed' && isCorrect) return false;
    if (reviewFilter === 'correct' && !isCorrect) return false;

    if (searchQuery.trim()) {
      const qText = q.text.toLowerCase();
      const catText = q.category.toLowerCase();
      const term = searchQuery.toLowerCase();
      return qText.includes(term) || catText.includes(term);
    }
    return true;
  });

  const handlePrintAudit = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-emerald-950 px-6 py-4 border-b border-emerald-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-900 border border-amber-400 flex items-center justify-center text-amber-300">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">
                Practice Assessment Audit & Marking Scheme Review
              </h3>
              <p className="text-xs text-emerald-300">
                Detailed Response History, Explanations & Curriculum Policy References
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-900 text-emerald-200 hover:text-white hover:bg-emerald-800 transition-colors"
          >
            Close Review
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Summary Strip */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-4 text-xs">
            <div>
              <span className="text-slate-500 block">Candidate Name:</span>
              <strong className="text-slate-900 text-sm">{session.candidate.fullName}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Email Address:</span>
              <strong className="text-slate-800 font-mono">{session.candidate.email}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Curriculum Stream:</span>
              <strong className="text-emerald-800 font-bold">GL {session.candidate.gradeLevel} Stream</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Overall Score:</span>
              <span className="font-mono font-bold text-sm text-emerald-800">
                {session.score} / {session.totalQuestions} ({Math.round((session.score / session.totalQuestions) * 100)}%)
              </span>
            </div>
          </div>

          {/* Filtering Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setReviewFilter('missed')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  reviewFilter === 'missed'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Missed Questions ({missedQuestions.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setReviewFilter('correct')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  reviewFilter === 'correct'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Correct Answers ({correctQuestions.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setReviewFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  reviewFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>All ({session.questions.length})</span>
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search questions or policy..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
          </div>

          {/* Question List */}
          <div className="space-y-4">
            {displayedQuestions.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-300 rounded-xl">
                {reviewFilter === 'missed' && missedQuestions.length === 0
                  ? 'Outstanding performance! The candidate answered all questions correctly in this assessment session.'
                  : 'No questions match the current filter or search criteria.'}
              </div>
            ) : (
              displayedQuestions.map((q, idx) => {
                const userPick = session.selectedAnswers[q.id];
                const isCorrect = userPick === q.correctAnswer;
                const wasAnswered = !!userPick;

                return (
                  <div
                    key={q.id}
                    className={`p-4 sm:p-5 rounded-xl border-2 transition-all ${
                      isCorrect
                        ? 'border-emerald-200 bg-emerald-50/30'
                        : wasAnswered
                        ? 'border-rose-200 bg-rose-50/20'
                        : 'border-amber-200 bg-amber-50/20'
                    }`}
                  >
                    {/* Item Header */}
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                          #{session.questions.findIndex((item) => item.id === q.id) + 1}
                        </span>
                        <span className="text-[11px] font-semibold text-emerald-900 bg-emerald-100/70 px-2 py-0.5 rounded">
                          {q.category}
                        </span>
                      </div>

                      <div className="shrink-0">
                        {isCorrect ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Correct Choice</span>
                          </span>
                        ) : wasAnswered ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-800 bg-rose-100 px-2.5 py-0.5 rounded-full">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Incorrect Selection</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Left Unanswered</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Question Text */}
                    <p className="text-sm font-semibold text-slate-900 leading-snug mb-3">
                      {q.text}
                    </p>

                    {/* Options Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3 text-xs">
                      {q.options.map((opt) => {
                        const isUserChoice = userPick === opt.key;
                        const isTheCorrectAnswer = opt.key === q.correctAnswer;

                        let optClass = 'bg-white border-slate-200 text-slate-700';
                        if (isTheCorrectAnswer) {
                          optClass = 'bg-emerald-100 border-emerald-400 text-emerald-950 font-bold';
                        } else if (isUserChoice) {
                          optClass = 'bg-rose-100 border-rose-300 text-rose-950 font-medium';
                        }

                        return (
                          <div
                            key={opt.key}
                            className={`p-2.5 rounded-lg border flex items-start gap-2 ${optClass}`}
                          >
                            <span className="font-mono font-bold w-5 shrink-0">
                              {opt.key}.
                            </span>
                            <span className="leading-tight flex-1">
                              {opt.text}
                            </span>
                            {isUserChoice && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-white shrink-0">
                                Candidate Pick
                              </span>
                            )}
                            {isTheCorrectAnswer && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-800 text-white shrink-0">
                                Correct Answer
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Statutory Explanation & Reference Box */}
                    <div className="p-3 rounded-lg bg-white border border-slate-200 text-xs space-y-1.5">
                      <div className="flex items-center gap-1.5 text-emerald-900 font-bold">
                        <FileText className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Curriculum Explanation & Statutory Rationale:</span>
                      </div>
                      <p className="text-slate-700 leading-relaxed">
                        {q.explanation}
                      </p>
                      <div className="text-[11px] text-emerald-800 font-medium pt-0.5">
                        <strong>Policy Authority / Citation:</strong> {q.referencePolicy}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Supervisor Clearance & Recommendations */}
          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>Supervisor & Proctor Endorsement Notes</span>
            </h4>
            <textarea
              rows={2}
              value={supervisorNotes}
              onChange={(e) => setSupervisorNotes(e.target.value)}
              placeholder="Enter optional supervisor diagnostic notes or study recommendations for this candidate..."
              className="w-full p-3 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
            <div className="flex justify-between items-center text-[11px] text-slate-500">
              <span>Candidate Hardware ID: {session.candidate.hardwareId || 'HID-VERIFIED'}</span>
              <span>Passkey: {session.candidate.accessCode}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handlePrintAudit}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs shadow-xs"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>Print Audit Marking Slip</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
          >
            Done Reviewing
          </button>
        </div>

      </div>
    </div>
  );
};
