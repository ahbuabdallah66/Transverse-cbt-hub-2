import React from 'react';
import { Clock, Keyboard, AlertTriangle, ArrowRight, BookOpen, Smartphone, ShieldAlert } from 'lucide-react';
import { CandidateInfo } from '../types/exam';

interface InstructionsViewProps {
  candidate: CandidateInfo;
  onBeginExam: () => void;
  onBackToReg: () => void;
}

export const InstructionsView: React.FC<InstructionsViewProps> = ({
  candidate,
  onBeginExam,
  onBackToReg,
}) => {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Banner */}
        <div className="bg-emerald-950 px-6 py-5 border-b border-emerald-900 text-white flex items-center justify-between">
          <div>
            <span className="text-xs uppercase font-bold tracking-widest text-emerald-400">
              CBT Practice & Evaluation Simulator
            </span>
            <h2 className="text-xl font-bold mt-0.5">
              Practice Examination Instructions
            </h2>
          </div>
          <div className="px-3 py-1 rounded bg-emerald-900/90 text-amber-300 font-mono text-xs font-bold border border-emerald-700">
            GL {candidate.gradeLevel} Stream
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {/* Candidate Card Summary */}
          <div className="p-4 rounded-lg bg-emerald-50/60 border border-emerald-200 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold text-emerald-800 uppercase">
                Active Enrolled Candidate
              </div>
              <div className="text-base font-bold text-slate-900">
                {candidate.fullName}
              </div>
              <div className="text-xs text-slate-600 font-mono mt-0.5">
                {candidate.email} · {candidate.department}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] font-mono font-bold text-emerald-800 bg-white px-2 py-1 rounded border border-emerald-200">
                Universal Passkey: {candidate.accessCode}
              </div>
            </div>
          </div>

          {/* Core Rules List */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-700" />
              <span>Practice Simulator Rules & Security Protocols</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-xs mb-1.5">
                  <Clock className="w-4 h-4 text-emerald-700" />
                  <span>Timed 60-Minute Limit</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Mimics the official examination pace. If the countdown reaches 00:00, all answered choices are scored automatically.
                </p>
              </div>

              <div className="p-4 rounded-lg border border-rose-200 bg-rose-50/50">
                <div className="flex items-center gap-2 font-bold text-rose-950 text-xs mb-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <span>5-Infraction Limit</span>
                </div>
                <p className="text-xs text-rose-800 leading-relaxed">
                  Switching windows or tabs is tracked. On the <strong>5th infraction</strong>, the exam will automatically lock and submit.
                </p>
              </div>

              <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-xs mb-1.5">
                  <Smartphone className="w-4 h-4 text-emerald-700" />
                  <span>Device Hardware Lock</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Your passkey is bound to this physical machine. Attempting to log in from other devices will trigger access denial.
                </p>
              </div>
            </div>
          </div>

          {/* Hotkey Engine Guide */}
          <div className="p-4 rounded-lg border border-slate-200 bg-slate-50">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5 flex items-center gap-2">
              <Keyboard className="w-4 h-4 text-emerald-700" />
              <span>Rapid Keyboard Shortcuts</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs text-slate-700">
              <div className="flex items-center gap-2 p-2 bg-white rounded border border-slate-200">
                <kbd className="px-2 py-1 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-slate-900 shadow-xs">
                  A B C D
                </kbd>
                <span>Select option</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-white rounded border border-slate-200">
                <kbd className="px-2 py-1 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-slate-900 shadow-xs">
                  → / N
                </kbd>
                <span>Next question</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-white rounded border border-slate-200">
                <kbd className="px-2 py-1 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-slate-900 shadow-xs">
                  ← / P
                </kbd>
                <span>Previous</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-white rounded border border-slate-200">
                <kbd className="px-2 py-1 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-slate-900 shadow-xs">
                  F
                </kbd>
                <span>Flag question</span>
              </div>
            </div>
          </div>

          {/* Practice Disclaimer Box */}
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs leading-relaxed">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong>Practice Simulation Notice:</strong> You will be served <strong>40 randomized questions</strong> dynamically extracted via the Fisher-Yates shuffle engine from the comprehensive curriculum pool for Grade Level {candidate.gradeLevel}.
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={onBackToReg}
              className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition-colors"
            >
              Back to Registration
            </button>
            <button
              type="button"
              onClick={onBeginExam}
              className="w-full sm:w-auto px-7 py-3 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
              <span>Begin Practice Assessment</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
