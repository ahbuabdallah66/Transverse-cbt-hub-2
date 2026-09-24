import React, { useState, useEffect } from 'react';
import {
  X,
  History,
  Sparkles,
  Award,
  CheckCircle2,
  AlertCircle,
  Clock,
  WifiOff,
  Wifi,
  ChevronRight,
  BrainCircuit,
  FileText
} from 'lucide-react';
import { getOfflineAssessments, saveAssessmentAiAnalysis, SavedAssessmentRecord } from '../utils/offlineStorage';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

interface CandidateAssessmentHistoryModalProps {
  candidateEmail: string;
  candidateName: string;
  onClose: () => void;
  onSelectForAiModal?: (record: SavedAssessmentRecord) => void;
}

export const CandidateAssessmentHistoryModal: React.FC<CandidateAssessmentHistoryModalProps> = ({
  candidateEmail,
  candidateName,
  onClose,
}) => {
  const { isOnline } = useNetworkStatus();
  const [assessments, setAssessments] = useState<SavedAssessmentRecord[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<SavedAssessmentRecord | null>(null);
  const [isAnalyzingId, setIsAnalyzingId] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  useEffect(() => {
    const list = getOfflineAssessments(candidateEmail);
    setAssessments(list);
    if (list.length > 0 && !selectedAssessment) {
      setSelectedAssessment(list[0]);
    }
  }, [candidateEmail]);

  const handleRunAiAnalysis = async (record: SavedAssessmentRecord) => {
    if (!isOnline) {
      setAnalysisError('Internet connection required: STELLA AI Assessment Analysis requires network access. Your results are safely saved offline.');
      return;
    }

    setIsAnalyzingId(record.id);
    setAnalysisError(null);

    try {
      const missedQuestions = (record.sessionData?.questions || [])
        .filter((q) => record.sessionData.selectedAnswers[q.id] !== q.correctAnswer)
        .map((q) => {
          const userPick = record.sessionData.selectedAnswers[q.id];
          const userChoice = q.options.find((o) => o.key === userPick);
          const correctChoice = q.options.find((o) => o.key === q.correctAnswer);
          return {
            id: q.id,
            text: q.text,
            category: q.category,
            userChoiceKey: userPick || 'Unanswered',
            userChoiceText: userChoice?.text || 'Unanswered',
            correctAnswerKey: q.correctAnswer,
            correctAnswerText: correctChoice?.text || '',
            referencePolicy: q.referencePolicy,
            explanation: q.explanation,
          };
        });

      const response = await fetch('/api/ai/analyze-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate: {
            fullName: record.candidateName,
            email: record.candidateEmail,
            gradeLevel: record.gradeLevel,
          },
          score: record.score,
          totalQuestions: record.totalQuestions,
          percentage: record.percentage,
          timeSpentSeconds: record.totalTimeSpentSeconds,
          infractionsCount: record.sessionData.infractions?.length || 0,
          categoryBreakdown: record.categoryBreakdown,
          missedQuestions,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.analysis) {
        saveAssessmentAiAnalysis(candidateEmail, record.id, data.analysis);
        // Refresh local state
        const updatedList = getOfflineAssessments(candidateEmail);
        setAssessments(updatedList);
        const currentUpdated = updatedList.find((a) => a.id === record.id) || null;
        setSelectedAssessment(currentUpdated);
      }
    } catch (err: any) {
      setAnalysisError(err.message || 'Could not complete STELLA AI Analysis. Please try again.');
    } finally {
      setIsAnalyzingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="bg-emerald-950 px-6 py-4 border-b border-emerald-900 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-800 text-amber-400 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider">
                My Assessment History &amp; STELLA AI Analysis
              </h3>
              <p className="text-[11px] text-emerald-300">
                {candidateName} ({candidateEmail}) · Offline Preserved
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 ${
              isOnline ? 'bg-emerald-800/80 text-emerald-200 border border-emerald-600/50' : 'bg-amber-900/60 text-amber-300 border border-amber-600/50'
            }`}>
              {isOnline ? <Wifi className="w-3 h-3 text-emerald-400" /> : <WifiOff className="w-3 h-3 text-amber-400" />}
              <span>{isOnline ? 'Online (AI Enabled)' : 'Offline (Saved Locally)'}</span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-emerald-300 hover:text-white hover:bg-emerald-900 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {analysisError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{analysisError}</span>
            </div>
          )}

          {assessments.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                <FileText className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-slate-800">No Assessment Records Found</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Completed practice examinations are automatically cached here. You can take assessments completely offline and run STELLA AI diagnostics when connected.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              {/* Assessments List */}
              <div className="md:col-span-5 space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
                <div className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Completed Sessions ({assessments.length})</span>
                </div>

                {assessments.map((rec) => {
                  const isSelected = selectedAssessment?.id === rec.id;
                  const isPassed = rec.percentage >= 60;
                  return (
                    <button
                      key={rec.id}
                      onClick={() => setSelectedAssessment(rec)}
                      className={`w-full text-left p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-emerald-700 bg-emerald-50/70 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 text-emerald-700" />
                          Grade Level {rec.gradeLevel}
                        </span>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          isPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {rec.percentage}% · {isPassed ? 'PASSED' : 'NEEDS REV'}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                        <span>{rec.score}/{rec.totalQuestions} Correct</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {Math.floor(rec.totalTimeSpentSeconds / 60)}m {rec.totalTimeSpentSeconds % 60}s
                        </span>
                      </div>

                      <div className="mt-1 text-[10px] text-slate-400 font-mono">
                        {rec.submittedAt}
                      </div>

                      {rec.aiAnalysis && (
                        <div className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100/60 px-2 py-0.5 rounded">
                          <BrainCircuit className="w-3 h-3 text-emerald-700" />
                          <span>STELLA AI Diagnostic Cached</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Assessment Detail & AI Panel */}
              <div className="md:col-span-7 bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 max-h-[60vh] overflow-y-auto">
                {selectedAssessment ? (
                  <>
                    <div className="flex items-start justify-between border-b border-slate-200 pb-3">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                          Grade Level {selectedAssessment.gradeLevel} ({selectedAssessment.examMode === 'exam' ? 'Promotional Exam' : 'Self-Paced Study'})
                        </div>
                        <h4 className="text-lg font-extrabold text-slate-900 mt-0.5">
                          Score: {selectedAssessment.score} / {selectedAssessment.totalQuestions} ({selectedAssessment.percentage}%)
                        </h4>
                        <div className="text-[11px] text-slate-500 font-mono">
                          Submitted: {selectedAssessment.submittedAt}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-extrabold ${
                          selectedAssessment.percentage >= 60
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}>
                          {selectedAssessment.percentage >= 60 ? 'BENCHMARK MET (60%+)' : 'REVISION NEEDED (<60%)'}
                        </span>
                      </div>
                    </div>

                    {/* Domain Breakdown */}
                    <div>
                      <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        Curriculum Domain Breakdown
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {Object.entries(selectedAssessment.categoryBreakdown || {}).map(([cat, stat]) => (
                          <div key={cat} className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
                            <span className="font-medium text-slate-800 truncate mr-2">{cat}</span>
                            <span className="font-bold text-emerald-900 shrink-0">
                              {stat.correct}/{stat.total} ({stat.percentage}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* STELLA AI Analysis Section */}
                    <div className="pt-2 border-t border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-amber-500" />
                          <span>STELLA AI with ZVEZDA Analysis</span>
                        </h5>

                        <button
                          type="button"
                          onClick={() => handleRunAiAnalysis(selectedAssessment)}
                          disabled={isAnalyzingId === selectedAssessment.id}
                          className="px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                        >
                          <BrainCircuit className="w-3.5 h-3.5 text-amber-300" />
                          <span>
                            {isAnalyzingId === selectedAssessment.id
                              ? 'Analyzing...'
                              : selectedAssessment.aiAnalysis
                              ? 'Re-Run AI Analysis'
                              : 'Run STELLA AI Analysis'}
                          </span>
                        </button>
                      </div>

                      {selectedAssessment.aiAnalysis ? (
                        <div className="p-4 bg-white border border-emerald-200 rounded-xl text-xs text-slate-700 leading-relaxed max-h-72 overflow-y-auto whitespace-pre-wrap font-sans space-y-2">
                          <div className="text-[11px] font-bold text-emerald-800 border-b border-emerald-100 pb-1 mb-2 flex items-center justify-between">
                            <span>Diagnostic Report (Cached Offline)</span>
                            <span className="text-slate-400 font-normal">STELLA AI · ZVEZDA Model</span>
                          </div>
                          {selectedAssessment.aiAnalysis}
                        </div>
                      ) : (
                        <div className="p-4 bg-white border border-slate-200 rounded-xl text-center space-y-2">
                          <p className="text-xs text-slate-600">
                            No AI diagnostic generated for this session yet.
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {isOnline
                              ? 'Click "Run STELLA AI Analysis" above to generate a curriculum diagnostic with statutory civil service explanations.'
                              : 'Connect to the internet to run STELLA AI analysis. Once generated, it will be cached for offline viewing.'}
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="py-12 text-center text-xs text-slate-500">
                    Select an assessment on the left to view details and run AI analysis.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="text-[11px]">
            © Transverse Inc for Kryztalcorp Ind. · Powered by <strong>STELLA AI with ZVEZDA logic</strong>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
