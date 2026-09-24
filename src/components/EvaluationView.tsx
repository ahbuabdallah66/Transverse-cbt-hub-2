import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Lock,
  Printer,
  RotateCcw,
  BookOpen,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  Trash2,
  ShieldCheck
} from 'lucide-react';
import { ExamSession } from '../types/exam';
import { AiAssessmentAnalysisModal } from './AiAssessmentAnalysisModal';
import { candidateDeleteProfile } from '../services/dbService';
import { clearStoredUserSession } from '../utils/device';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { WifiOff } from 'lucide-react';

interface EvaluationViewProps {
  session: ExamSession;
  onOpenAdminReview: () => void;
  onRetakeExam: () => void;
}

export const EvaluationView: React.FC<EvaluationViewProps> = ({
  session,
  onOpenAdminReview,
  onRetakeExam,
}) => {
  const { isOnline } = useNetworkStatus();
  const [showAiModal, setShowAiModal] = useState(false);
  const [showDeleteProfileModal, setShowDeleteProfileModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('Candidate self-requested profile removal after assessment');
  const [isDeleting, setIsDeleting] = useState(false);

  const percentage = Math.round((session.score / session.totalQuestions) * 100);
  const isPassed = percentage >= 60; // Standard 60% Civil Service Benchmark

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleConfirmDeleteProfile = async () => {
    setIsDeleting(true);
    try {
      const res = await candidateDeleteProfile(
        session.candidate.email,
        session.candidate.hardwareId || '',
        deleteReason.trim() || 'Candidate self-requested profile removal after assessment'
      );
      if (res.success) {
        clearStoredUserSession();
        setShowDeleteProfileModal(false);
        alert(res.message);
        onRetakeExam(); // Return to registration page
      } else {
        alert(res.message);
      }
    } catch (err: any) {
      alert('Failed to delete candidate profile: ' + (err.message || 'Unknown error'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      
      {/* Official Practice Assessment Notice */}
      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center text-xs text-amber-950 font-medium no-print">
        <strong>Civil Service & Health CBT Practice Platform</strong> · Evaluation Dossier & Diagnostic Report
      </div>

      {/* SUBMISSION STATUS BANNER */}
      {session.submissionType === 'infraction_limit' && (
        <div className="p-4 bg-rose-50 border-2 border-rose-500 rounded-xl flex items-center gap-3 text-rose-950 shadow-sm animate-in fade-in">
          <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-rose-900">
              Session Locked & Auto-Submitted by Security Engine
            </h4>
            <p className="text-xs text-rose-800 mt-0.5">
              This practice attempt was automatically finalized because the candidate navigated away or switched browser tabs <strong>5 times</strong> (maximum allowable focus infractions reached).
            </p>
          </div>
        </div>
      )}

      {session.submissionType === 'timeout' && (
        <div className="p-4 bg-amber-50 border-2 border-amber-500 rounded-xl flex items-center gap-3 text-amber-950 shadow-sm animate-in fade-in">
          <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900">
              Exam Period Expired (Timeout Auto-Submitted)
            </h4>
            <p className="text-xs text-amber-800 mt-0.5">
              The allotted 60-minute duration elapsed and all answered questions were secured and graded.
            </p>
          </div>
        </div>
      )}

      {/* HERO BANNER: ANALYSE WITH AI */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 rounded-2xl p-5 sm:p-6 text-white shadow-lg border-2 border-emerald-500/50 flex flex-col md:flex-row items-center justify-between gap-5 no-print">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-amber-300 shrink-0 shadow-inner">
            <Sparkles className="w-7 h-7 text-amber-300 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-400">
                STELLA AI Diagnostic &amp; Coaching Engine
              </span>
              <span className="text-[10px] bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded font-mono font-bold border border-amber-400/30">
                ZVEZDA logic
              </span>
            </div>
            <h3 className="text-lg font-black text-white mt-0.5">
              Analyse Performance with STELLA AI &amp; Ask Questions
            </h3>
            <p className="text-xs text-slate-300 max-w-xl mt-1 leading-relaxed">
              {isOnline
                ? 'Get an instant statutory breakdown of missed questions, study domain strengths and weaknesses, and ask follow-up questions to STELLA AI.'
                : 'Offline Notice: Your full test evaluation and answers are safely saved locally. Connect to internet to run the STELLA AI diagnostic.'}
            </p>
          </div>
        </div>

        <div className="shrink-0 w-full md:w-auto">
          {isOnline ? (
            <button
              onClick={() => setShowAiModal(true)}
              type="button"
              className="w-full md:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>Analyse with STELLA AI</span>
              <ArrowRight className="w-4 h-4 text-slate-950" />
            </button>
          ) : (
            <div className="p-3 bg-amber-950/80 border border-amber-600/50 rounded-xl text-amber-200 text-xs flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
              <span>STELLA AI requires internet to run diagnostic</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Printable Dossier Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:border-none print:shadow-none">
        
        {/* Dossier Header */}
        <div className="bg-emerald-950 px-6 sm:px-8 py-6 border-b border-emerald-900 text-white text-center relative">
          <div className="w-14 h-14 rounded-2xl bg-emerald-900 border border-emerald-700/60 flex items-center justify-center font-black text-amber-300 text-xl mx-auto mb-3 shadow-inner">
            CBT
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Civil Service & Health CBT Practice Simulator
          </h2>
          <p className="text-xs font-bold text-amber-300 uppercase tracking-widest mt-1">
            Performance Assessment & Practice Dossier
          </p>
          <div className="text-[11px] text-emerald-300 mt-2 font-mono">
            Session ID: PRAC-{Date.now().toString().slice(-6)} · Grade Level {session.candidate.gradeLevel} Stream
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-8">
          
          {/* Candidate Dossier & Overall Score Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Candidate Metadata */}
            <div className="md:col-span-2 p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Candidate Particulars
                </h3>
                <button
                  type="button"
                  onClick={() => setShowDeleteProfileModal(true)}
                  className="text-[11px] text-rose-700 hover:text-rose-900 font-bold underline flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete Profile (Keep Audit Copy)</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block">Candidate Name:</span>
                  <span className="text-sm font-bold text-slate-900">{session.candidate.fullName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Email Address:</span>
                  <span className="text-sm font-mono font-bold text-slate-900">{session.candidate.email}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Cadre & Speciality:</span>
                  <span className="font-semibold text-slate-800">{session.candidate.cadre}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Department / Center:</span>
                  <span className="font-semibold text-slate-800">{session.candidate.department}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Curriculum Stream:</span>
                  <span className="font-bold text-emerald-800">GL {session.candidate.gradeLevel} Stream</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Bound Hardware ID:</span>
                  <span className="font-mono text-emerald-900 font-bold">{session.candidate.hardwareId || 'HID-VERIFIED'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Universal Passkey:</span>
                  <span className="font-mono font-bold text-slate-800">{session.candidate.accessCode}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Time Utilized:</span>
                  <span className="font-mono font-bold text-slate-900">{formatDuration(session.totalTimeSpentSeconds)} / 60m</span>
                </div>
              </div>
            </div>

            {/* Score & Evaluation Stamp */}
            <div className={`p-5 rounded-xl border-2 flex flex-col items-center justify-center text-center ${
              isPassed
                ? 'bg-emerald-50/60 border-emerald-600'
                : 'bg-rose-50/60 border-rose-500'
            }`}>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Practice Score
              </div>
              <div className={`text-4xl font-black font-mono tracking-tight ${
                isPassed ? 'text-emerald-800' : 'text-rose-700'
              }`}>
                {percentage}%
              </div>
              <div className="text-xs font-bold font-mono text-slate-600 mt-1">
                {session.score} of {session.totalQuestions} Correct Answers
              </div>

              <div className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                isPassed
                  ? 'bg-emerald-700 text-white'
                  : 'bg-rose-600 text-white'
              }`}>
                {isPassed ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                <span>{isPassed ? 'READY / PASS BENCHMARK' : 'NEEDS IMPROVEMENT'}</span>
              </div>
              <span className="text-[10px] text-slate-500 mt-1.5">
                Standard Benchmark: 60%
              </span>
            </div>

          </div>

          {/* Curriculum Category Performance Breakdown */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-emerald-800" />
              <span>Competency Breakdown by Subject Domain</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(session.categoryBreakdown).map(([cat, stats]) => (
                <div key={cat} className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-xs font-bold text-slate-900 truncate" title={cat}>
                    {cat}
                  </div>
                  <div className="flex items-baseline justify-between mt-2">
                    <span className="font-mono text-sm font-bold text-slate-800">
                      {stats.correct} / {stats.total}
                    </span>
                    <span className={`font-mono text-xs font-bold ${
                      stats.percentage >= 60 ? 'text-emerald-700' : 'text-rose-600'
                    }`}>
                      {stats.percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        stats.percentage >= 60 ? 'bg-emerald-600' : 'bg-rose-500'
                      }`}
                      style={{ width: `${stats.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Security & Integrity Record */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-emerald-800" />
                <span>Security & Anti-Cheat Focus Log</span>
              </h3>
              <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
                session.infractions.length === 0
                  ? 'bg-emerald-100 text-emerald-900'
                  : session.infractions.length >= 5
                  ? 'bg-rose-100 text-rose-900'
                  : 'bg-amber-100 text-amber-900'
              }`}>
                {session.infractions.length} / 5 Infraction(s) Recorded
              </span>
            </div>

            {session.infractions.length > 0 ? (
              <div className="space-y-1.5 pt-1">
                <p className="text-xs text-rose-800 font-medium">
                  Window focus losses recorded during this assessment attempt:
                </p>
                <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                  {session.infractions.map((inf, idx) => (
                    <div key={idx} className="text-[11px] font-mono text-slate-700 flex justify-between bg-white p-1.5 rounded border border-slate-200">
                      <span>Event #{idx + 1}: {inf.details}</span>
                      <span className="text-slate-500">{inf.timestamp}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-600">
                Continuous browser focus maintained throughout the evaluation.
              </p>
            )}
          </div>

        </div>
      </div>

      {/* Action Controls & Admin Review Access */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 no-print">
        
        {/* Left Actions */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => setShowAiModal(true)}
            type="button"
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-xs"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Analyse with AI</span>
          </button>

          <button
            onClick={handlePrint}
            type="button"
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition-colors shadow-xs"
          >
            <Printer className="w-4 h-4 text-emerald-800" />
            <span>Print Practice Slip</span>
          </button>

          <button
            onClick={onRetakeExam}
            type="button"
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition-colors shadow-xs"
          >
            <RotateCcw className="w-4 h-4 text-emerald-800" />
            <span>Take Another Practice Assessment</span>
          </button>
        </div>

        {/* Right Action: Administrative Review Window */}
        <div className="w-full sm:w-auto">
          <button
            onClick={onOpenAdminReview}
            type="button"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-amber-300 text-xs font-bold border border-amber-400/40 shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <Lock className="w-4 h-4 text-amber-400" />
            <span>Detailed Answer History & Marking Scheme</span>
          </button>
        </div>

      </div>

      {/* AI Assessment Diagnostic & Q&A Modal */}
      <AiAssessmentAnalysisModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        session={session}
      />

      {/* CANDIDATE DELETE PROFILE MODAL */}
      {showDeleteProfileModal && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-xl bg-rose-100 border border-rose-300 text-rose-700 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 text-center">
              Delete Candidate Profile & Reset Device
            </h3>

            <p className="text-xs text-slate-600 mt-2 text-center leading-relaxed">
              You are about to delete candidate account <strong>{session.candidate.fullName}</strong> (<span className="font-mono">{session.candidate.email}</span>) from this device.
            </p>

            <div className="my-4 p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-950 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>Compliance Audit Copy Preserved:</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                In compliance with regulatory examination procedures, an immutable audit record with your score metrics ({percentage}%), session timestamps, and bound hardware ID will be preserved in the compliance audit database. Your device registration and passkey binding will be released.
              </p>
            </div>

            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Reason for Deletion
                </label>
                <input
                  type="text"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                  placeholder="e.g. Assessment completed, device reset"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteProfileModal(false)}
                disabled={isDeleting}
                className="flex-1 py-2.5 px-4 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteProfile}
                disabled={isDeleting}
                className="flex-1 py-2.5 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? 'Deleting...' : 'Confirm & Delete Profile'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
