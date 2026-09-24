import React from 'react';
import { Maximize2, Minimize2, ShieldAlert, CheckCircle2, Lock, WifiOff } from 'lucide-react';
import { CandidateInfo } from '../types/exam';
import { PWAInstallButton } from './PWAInstallButton';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

interface HeaderProps {
  candidate?: CandidateInfo | null;
  timeRemaining?: number;
  isExamActive?: boolean;
  infractionCount?: number;
  maxInfractions?: number;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onSubmitExam?: () => void;
  answeredCount?: number;
  totalQuestions?: number;
  onOpenAdmin?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  candidate,
  timeRemaining = 3600,
  isExamActive = false,
  infractionCount = 0,
  maxInfractions = 5,
  isFullscreen = false,
  onToggleFullscreen,
  onSubmitExam,
  answeredCount = 0,
  totalQuestions = 40,
  onOpenAdmin,
}) => {
  const { isOnline } = useNetworkStatus();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const isTimeCritical = timeRemaining <= 300 && isExamActive;
  const isNearLockout = infractionCount >= 3;

  return (
    <header className="sticky top-0 z-30 bg-emerald-950 text-white border-b border-emerald-900 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        
        {/* Brand / Logo Zone */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-900 border border-emerald-700/60 flex items-center justify-center font-bold text-amber-300 text-sm tracking-tight shadow-inner">
            CBT
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-50 tracking-tight leading-tight">
                Civil Service & Health CBT Practice Portal
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Practice Mode
              </span>
            </div>
            <p className="text-xs text-emerald-300/80 hidden sm:block">
              Promotional & Cadre Evaluation Preparatory Simulator
            </p>
          </div>
        </div>

        {/* Center / Exam Status Zone */}
        {isExamActive && candidate && (
          <div className="hidden md:flex items-center gap-6">
            <div className="text-left text-xs">
              <div className="text-emerald-300 font-medium">Candidate</div>
              <div className="font-semibold text-white truncate max-w-[140px]">
                {candidate.fullName}
              </div>
            </div>

            <div className="text-left text-xs">
              <div className="text-emerald-300 font-medium">Curriculum</div>
              <div className="font-semibold text-amber-300">
                GL {candidate.gradeLevel}
              </div>
            </div>

            <div className="text-left text-xs">
              <div className="text-emerald-300 font-medium">Completed</div>
              <div className="font-semibold text-white tabular-nums">
                {answeredCount} / {totalQuestions}
              </div>
            </div>

            {infractionCount > 0 && (
              <div className={`flex items-center gap-1.5 text-xs font-mono font-bold px-2.5 py-1 rounded border ${
                isNearLockout
                  ? 'bg-rose-950 text-rose-300 border-rose-600 animate-pulse'
                  : 'bg-amber-950/80 text-amber-300 border-amber-600/50'
              }`}>
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span>Infractions: {infractionCount}/{maxInfractions}</span>
              </div>
            )}
          </div>
        )}

        {/* Action Controls & Countdown Timer Zone */}
        <div className="flex items-center gap-3">
          {isExamActive ? (
            <>
              {/* Countdown Timer */}
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-mono text-base font-bold border transition-colors ${
                  isTimeCritical
                    ? 'bg-rose-600 text-white border-rose-400 animate-pulse shadow-lg shadow-rose-900/50'
                    : 'bg-emerald-900/80 text-emerald-100 border-emerald-700'
                }`}
                title="Time Remaining"
              >
                <span className="text-xs font-sans font-semibold tracking-wider uppercase text-emerald-300 hidden sm:inline">
                  Time:
                </span>
                <span className="tabular-nums tracking-widest">{formatTime(timeRemaining)}</span>
              </div>

              {/* Fullscreen Toggle */}
              {onToggleFullscreen && (
                <button
                  onClick={onToggleFullscreen}
                  type="button"
                  className="p-2 rounded bg-emerald-900 hover:bg-emerald-800 text-emerald-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                  title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen Mode'}
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              )}

              {/* Final Submit Button */}
              {onSubmitExam && (
                <button
                  onClick={onSubmitExam}
                  type="button"
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Finish Practice</span>
                </button>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2.5">
              {!isOnline && (
                <div
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-950/80 text-amber-300 border border-amber-600/50 text-[11px] font-bold"
                  title="Offline mode active. All 120 questions are stored locally."
                >
                  <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Offline Mode</span>
                </div>
              )}
              <PWAInstallButton />
              {onOpenAdmin && (
                <button
                  onClick={onOpenAdmin}
                  type="button"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-900 hover:bg-emerald-800 text-amber-300 text-xs font-bold border border-emerald-700/80 transition-colors shadow-xs"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Admin Portal</span>
                </button>
              )}
            </div>
          )}
        </div>

      </div>
    </header>
  );
};
