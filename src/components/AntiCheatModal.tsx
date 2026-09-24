import React from 'react';
import { ShieldAlert, AlertTriangle, ArrowRight, Lock } from 'lucide-react';

interface AntiCheatModalProps {
  isOpen: boolean;
  infractionCount: number;
  onDismiss: () => void;
  maxInfractions?: number;
}

export const AntiCheatModal: React.FC<AntiCheatModalProps> = ({
  isOpen,
  infractionCount,
  onDismiss,
  maxInfractions = 5,
}) => {
  if (!isOpen) return null;

  const isLockout = infractionCount >= maxInfractions;
  const remaining = Math.max(0, maxInfractions - infractionCount);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4">
      <div className={`bg-white rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl border-2 animate-in fade-in zoom-in-95 duration-200 ${
        isLockout ? 'border-rose-600' : 'border-amber-500'
      }`}>
        <div className={`w-14 h-14 mx-auto rounded-full border-2 flex items-center justify-center mb-4 ${
          isLockout
            ? 'bg-rose-100 border-rose-400 text-rose-600'
            : 'bg-amber-100 border-amber-400 text-amber-700'
        }`}>
          {isLockout ? <Lock className="w-7 h-7" /> : <ShieldAlert className="w-7 h-7" />}
        </div>

        <h3 className="text-lg font-extrabold text-slate-900 text-center">
          {isLockout
            ? 'Security Lockout: 5/5 Infractions Exceeded!'
            : `Security Alert: Focus Lost (Strike ${infractionCount} of ${maxInfractions})`}
        </h3>

        <div className="flex justify-center mt-2 mb-4">
          <div className={`text-xs font-bold font-mono px-3 py-1 rounded-full border ${
            isLockout
              ? 'bg-rose-100 text-rose-800 border-rose-300'
              : 'bg-amber-100 text-amber-900 border-amber-300'
          }`}>
            {isLockout ? 'AUTOMATIC SUBMISSION TRIGGERED' : `${remaining} Warning${remaining === 1 ? '' : 's'} Remaining Before Lockout`}
          </div>
        </div>

        <p className="text-xs text-slate-600 text-center leading-relaxed mb-4">
          {isLockout ? (
            <>
              You have switched windows or browser tabs <strong>5 times</strong>. To uphold CBT assessment integrity, your examination session has been terminated and your marked choices have been compiled and sent to the grading pipeline.
            </>
          ) : (
            <>
              The CBT anti-cheat tracker detected that you navigated away from the active examination window or minimized the screen. Each occurrence is recorded with exact timestamps in your audit log.
            </>
          )}
        </p>

        {!isLockout && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 mb-5 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="leading-normal">
              <strong>Strict 5-Infraction Policy:</strong> If you navigate away <strong>{remaining} more time{remaining === 1 ? '' : 's'}</strong>, the system will automatically submit your assessment without further warnings.
            </div>
          </div>
        )}

        <button
          onClick={onDismiss}
          type="button"
          className={`w-full py-3 px-4 rounded-lg font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-2 ${
            isLockout
              ? 'bg-rose-700 hover:bg-rose-800 text-white'
              : 'bg-emerald-800 hover:bg-emerald-700 text-white'
          }`}
        >
          <span>{isLockout ? 'View Evaluation Dossier & Scores' : `Acknowledge & Return to Exam (${remaining} left)`}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
