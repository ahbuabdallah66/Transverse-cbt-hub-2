import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Bot,
  User,
  Send,
  RefreshCw,
  X,
  BookOpen,
  Award,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  MessageSquare,
  HelpCircle,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { ExamSession } from '../types/exam';

interface AiAssessmentAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: ExamSession;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

export const AiAssessmentAnalysisModal: React.FC<AiAssessmentAnalysisModalProps> = ({
  isOpen,
  onClose,
  session,
}) => {
  const [activeTab, setActiveTab] = useState<'analysis' | 'chat'>('analysis');

  // AI Diagnostic State
  const [analysisText, setAnalysisText] = useState<string>('');
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string>('');
  const [copiedAnalysis, setCopiedAnalysis] = useState<boolean>(false);

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [isSendingChat, setIsSendingChat] = useState<boolean>(false);
  const [chatError, setChatError] = useState<string>('');

  const chatEndRef = useRef<HTMLDivElement>(null);

  const percentage = Math.round((session.score / session.totalQuestions) * 100);
  const missedList = session.questions.filter(
    (q) => session.selectedAnswers[q.id] !== q.correctAnswer
  );

  // Weakest category
  const weakestCategory = Object.entries(session.categoryBreakdown)
    .sort(([, a], [, b]) => a.percentage - b.percentage)[0]?.[0] || 'Public Service Rules';

  const fetchAiAnalysis = async (forceRefresh = false) => {
    if (analysisText && !forceRefresh) return;

    setIsLoadingAnalysis(true);
    setAnalysisError('');

    try {
      const missedPayload = missedList.map((q) => {
        const userKey = session.selectedAnswers[q.id];
        const userOpt = q.options.find((o) => o.key === userKey);
        const correctOpt = q.options.find((o) => o.key === q.correctAnswer);

        return {
          id: q.id,
          text: q.text,
          category: q.category,
          userChoiceKey: userKey || 'None',
          userChoiceText: userOpt?.text || 'Left Unanswered',
          correctAnswerKey: q.correctAnswer,
          correctAnswerText: correctOpt?.text || '',
          explanation: q.explanation,
          referencePolicy: q.referencePolicy,
        };
      });

      const response = await fetch('/api/ai/analyze-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate: session.candidate,
          score: session.score,
          totalQuestions: session.totalQuestions,
          percentage,
          timeSpentSeconds: session.totalTimeSpentSeconds,
          infractionsCount: session.infractions.length,
          categoryBreakdown: session.categoryBreakdown,
          missedQuestions: missedPayload,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate AI performance analysis.');
      }

      setAnalysisText(data.analysis || 'Analysis generated successfully.');
    } catch (err: any) {
      console.error(err);
      setAnalysisError(err.message || 'Could not connect to AI Diagnostic service.');
    } finally {
      setIsLoadingAnalysis(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (!analysisText && !isLoadingAnalysis) {
        fetchAiAnalysis();
      }
      if (chatMessages.length === 0) {
        // Initialize welcoming tutor greeting
        setChatMessages([
          {
            id: 'init-1',
            role: 'model',
            content: `Hello ${session.candidate.fullName}! I am your AI Examination Coach. I've reviewed your results (${percentage}%, ${session.score}/${session.totalQuestions}) for the Grade Level ${session.candidate.gradeLevel} curriculum.\n\nYou can ask me to explain any question you found difficult, clarify civil service rules (PSR), or explain healthcare and financial guidelines. What would you like to ask?`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTab]);

  if (!isOpen) return null;

  const handleSendChat = async (messageText?: string) => {
    const textToSend = (messageText || chatInput).trim();
    if (!textToSend || isSendingChat) return;

    setChatError('');
    setChatInput('');

    const userMsg: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...chatMessages, userMsg];
    setChatMessages(newHistory);
    setIsSendingChat(true);

    try {
      const assessmentContext = {
        candidateName: session.candidate.fullName,
        gradeLevel: session.candidate.gradeLevel,
        cadre: session.candidate.cadre,
        score: session.score,
        totalQuestions: session.totalQuestions,
        percentage,
        weakestCategories: weakestCategory,
        missedTopicsSummary: missedList
          .slice(0, 5)
          .map((m) => `Q: ${m.text.slice(0, 60)}... (Ref: ${m.referencePolicy})`)
          .join('; '),
      };

      const historyPayload = newHistory.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch('/api/ai/chat-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessmentContext,
          conversationHistory: historyPayload.slice(-8), // last turns
          message: textToSend,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to receive response from AI Tutor.');
      }

      const botMsg: ChatMessage = {
        id: Math.random().toString(36).substring(7),
        role: 'model',
        content: data.reply || 'Here is the statutory explanation.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setChatMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      console.error(err);
      setChatError(err.message || 'Error communicating with AI tutor.');
    } finally {
      setIsSendingChat(false);
    }
  };

  const handleCopyAnalysis = () => {
    if (!analysisText) return;
    navigator.clipboard.writeText(analysisText);
    setCopiedAnalysis(true);
    setTimeout(() => setCopiedAnalysis(false), 2000);
  };

  // Quick Prompt Chips
  const firstMissed = missedList[0];
  const quickPrompts = [
    firstMissed ? `Explain why I missed Question #${session.questions.findIndex(q => q.id === firstMissed.id) + 1}` : 'Give me 3 tips to score higher',
    `Break down statutory rules for ${weakestCategory}`,
    'Explain the difference between Misconduct and Serious Misconduct in PSR',
    `What are the most frequent exam questions for GL ${session.candidate.gradeLevel}?`,
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-hidden">
      <div className="bg-white rounded-2xl max-w-4xl w-full h-[90vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Modal Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 text-white px-6 py-4 flex items-center justify-between border-b border-emerald-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-800/80 border border-emerald-500/50 flex items-center justify-center text-amber-300 shadow-inner">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight text-white">
                  STELLA AI Diagnostic &amp; Performance Coaching
                </h3>
                <span className="text-[10px] bg-amber-400/20 text-amber-300 font-mono font-bold px-2 py-0.5 rounded border border-amber-400/30">
                  STELLA AI · ZVEZDA logic
                </span>
              </div>
              <p className="text-xs text-emerald-300/90">
                Grade Level {session.candidate.gradeLevel} Stream · Candidate: {session.candidate.fullName} ({percentage}%)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-emerald-900 hover:bg-emerald-800 text-emerald-300 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Toggle Navigation Bar */}
        <div className="bg-slate-100 px-6 py-2.5 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('analysis')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'analysis'
                  ? 'bg-white text-emerald-950 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-4 h-4 text-emerald-700" />
              <span>Full AI Diagnostic & Explanations</span>
            </button>

            <button
              onClick={() => setActiveTab('chat')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'chat'
                  ? 'bg-white text-emerald-950 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageSquare className="w-4 h-4 text-emerald-700" />
              <span>Ask AI Tutor (Interactive Q&A)</span>
            </button>
          </div>

          {activeTab === 'analysis' && analysisText && !isLoadingAnalysis && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyAnalysis}
                className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded text-[11px] font-bold text-slate-700 flex items-center gap-1"
                title="Copy analysis text"
              >
                {copiedAnalysis ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-500" />}
                <span>{copiedAnalysis ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                onClick={() => fetchAiAnalysis(true)}
                disabled={isLoadingAnalysis}
                className="p-1.5 rounded bg-white hover:bg-slate-50 border border-slate-300 text-slate-700"
                title="Re-generate Analysis"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Content View Area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          
          {/* TAB 1: COMPREHENSIVE AI DIAGNOSTIC */}
          {activeTab === 'analysis' && (
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
              
              {/* Score summary banner */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-mono font-bold text-lg text-white ${
                    percentage >= 60 ? 'bg-emerald-700' : 'bg-rose-600'
                  }`}>
                    {percentage}%
                  </div>
                  <div>
                    <span className="text-slate-500 block">Assessment Result:</span>
                    <strong className="text-slate-900 text-sm">
                      {percentage >= 60 ? 'Ready / Pass Benchmark Met' : 'Needs Targeted Study Revision'}
                    </strong>
                    <span className="text-[11px] text-slate-500 block">
                      {session.score} of {session.totalQuestions} Correct · {missedList.length} Missed
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-600 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                    Priority Topic: <strong className="text-emerald-800">{weakestCategory}</strong>
                  </span>
                </div>
              </div>

              {/* Loading State */}
              {isLoadingAnalysis && (
                <div className="py-16 text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto animate-bounce">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-900">
                      Analyzing Your CBT Performance with Gemini AI...
                    </h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Synthesizing your marked answers against Civil Service Regulations, Scheme of Service circulars, and healthcare policies to create your personal coaching breakdown.
                    </p>
                  </div>
                </div>
              )}

              {/* Error State */}
              {analysisError && !isLoadingAnalysis && (
                <div className="p-5 bg-rose-50 border border-rose-300 rounded-xl space-y-3">
                  <div className="flex items-start gap-2.5 text-rose-900 text-xs font-semibold">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    <span>{analysisError}</span>
                  </div>
                  <button
                    onClick={() => fetchAiAnalysis(true)}
                    className="px-4 py-2 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs"
                  >
                    Retry AI Analysis
                  </button>
                </div>
              )}

              {/* Success Result Body */}
              {!isLoadingAnalysis && analysisText && (
                <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-7 shadow-xs">
                  <div className="prose prose-slate prose-sm max-w-none space-y-4 text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
                    {analysisText}
                  </div>

                  {/* Switch to Chat Callout */}
                  <div className="mt-8 pt-5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-emerald-50/70 p-4 rounded-xl border border-emerald-200">
                    <div className="flex items-center gap-2.5">
                      <Bot className="w-5 h-5 text-emerald-800 shrink-0" />
                      <div className="text-xs text-emerald-950">
                        <strong>Have questions about these explanations?</strong>
                        <p className="text-[11px] text-emerald-800">
                          Ask your AI Tutor to clarify any Public Service Rule, explain specific questions, or give you mnemonics.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab('chat')}
                      className="px-4 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs shrink-0 flex items-center gap-1.5 shadow-sm"
                    >
                      <span>Ask AI Tutor</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 2: INTERACTIVE AI TUTOR CHAT */}
          {activeTab === 'chat' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              
              {/* Chat Messages Feed */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                
                {chatMessages.map((msg) => {
                  const isBot = msg.role === 'model';
                  return (
                    <div
                      key={msg.id}
                      className={`flex items-start gap-3 max-w-2xl ${
                        isBot ? 'mr-auto' : 'ml-auto flex-row-reverse'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          isBot
                            ? 'bg-emerald-800 text-amber-300 shadow-sm'
                            : 'bg-slate-800 text-white'
                        }`}
                      >
                        {isBot ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                      </div>

                      <div
                        className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                          isBot
                            ? 'bg-slate-100 text-slate-900 rounded-tl-xs whitespace-pre-wrap'
                            : 'bg-emerald-800 text-white rounded-tr-xs'
                        }`}
                      >
                        {msg.content}
                        <span
                          className={`block text-[10px] mt-1.5 ${
                            isBot ? 'text-slate-400' : 'text-emerald-200'
                          }`}
                        >
                          {msg.timestamp}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Thinking indicator */}
                {isSendingChat && (
                  <div className="flex items-start gap-3 max-w-md mr-auto">
                    <div className="w-8 h-8 rounded-xl bg-emerald-800 text-amber-300 flex items-center justify-center shrink-0 animate-pulse">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="p-3 bg-slate-100 text-slate-600 rounded-2xl rounded-tl-xs text-xs flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-700 animate-spin" />
                      <span>AI Tutor is preparing your explanation...</span>
                    </div>
                  </div>
                )}

                {chatError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{chatError}</span>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Quick Prompt Chips */}
              <div className="px-4 sm:px-6 py-2 bg-slate-50 border-t border-slate-200 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1">
                  <HelpCircle className="w-3 h-3 text-emerald-700" />
                  <span>Suggestions:</span>
                </span>
                {quickPrompts.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendChat(p)}
                    disabled={isSendingChat}
                    className="text-[11px] font-semibold text-emerald-900 bg-white hover:bg-emerald-100/70 border border-slate-300 hover:border-emerald-500 px-2.5 py-1 rounded-full whitespace-nowrap transition-colors shrink-0 shadow-xs"
                  >
                    {p}
                  </button>
                ))}
              </div>

              {/* Chat Input Bar */}
              <div className="p-3 sm:p-4 bg-white border-t border-slate-200 shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendChat();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask about questions, regulations, PSR clauses, or study tips..."
                    disabled={isSendingChat}
                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-transparent transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || isSendingChat}
                    className="px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span className="hidden sm:inline">Ask</span>
                  </button>
                </form>
              </div>

              {/* Attribution Footer */}
              <div className="px-4 py-2 bg-slate-100 border-t border-slate-200 text-center text-[10px] text-slate-500">
                &copy; Transverse Inc for Kryztalcorp Ind. (contact 07079094334, kryzalcorp@gmail.com), adress: Makera main plaza, kakuri, kaduna, powered by STELLA AI with ZVEZDA logic
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
