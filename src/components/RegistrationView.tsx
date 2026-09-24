import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Lock,
  Cpu,
  Info,
  AlertCircle,
  ArrowRight,
  BookOpen,
  Award,
  Sparkles,
  LogOut,
  ShieldAlert,
  Trash2,
  ShieldCheck,
  CheckCircle2,
  UserCheck,
  Eye,
  EyeOff,
  History,
  Download,
  Wifi,
  WifiOff,
  UserPlus,
  LogIn
} from 'lucide-react';
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { CandidateInfo, GradeLevel, ExamMode, RegisteredUserRecord } from '../types/exam';
import {
  validateAndClaimAccessCode,
  verifyCurrentDeviceAutoLogin,
  candidateDeleteProfile
} from '../services/dbService';
import {
  generateHardwareFingerprint,
  HardwareFingerprint,
  getStoredUserSession,
  saveStoredUserSession,
  clearStoredUserSession
} from '../utils/device';
import { cacheQuestionsOffline, isQuestionBankCached } from '../utils/offlineStorage';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { CandidateAssessmentHistoryModal } from './CandidateAssessmentHistoryModal';

interface RegistrationViewProps {
  currentUser?: User | null;
  onStartExam: (candidate: CandidateInfo) => void;
  onOpenSyllabus: () => void;
  onOpenAdminAuth: () => void;
}

const DEPARTMENTS = [
  "Central Health Services Secretariat",
  "Specialist Teaching & Referral Hospital Center",
  "State Primary Health Care Directorate",
  "Contributory Social Health Insurance Division",
  "Medical Supplies & Logistics Agency",
  "General Hospital Division A",
  "General Hospital Division B",
  "College of Health Sciences & Technology",
  "College of Nursing & Midwifery Sciences"
];

const CADRES = [
  "Medical & Dental Officers Cadre",
  "Nursing & Midwifery Cadre",
  "Pharmacist & Pharmacy Technician Cadre",
  "Medical Laboratory Science Cadre",
  "Community Health Extension (CHO/CHEW) Cadre",
  "Health Information Management / Records Cadre",
  "Health Planning & Administrative Cadre",
  "Biomedical Engineering & Tech Cadre",
  "Public Health Inspection Cadre"
];

export const RegistrationView: React.FC<RegistrationViewProps> = ({
  currentUser,
  onStartExam,
  onOpenSyllabus,
  onOpenAdminAuth,
}) => {
  const { isOnline } = useNetworkStatus();

  // Authentication mode: 'login' | 'register' (when not logged in)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [cadre, setCadre] = useState(CADRES[1]);
  const [gradeLevel, setGradeLevel] = useState<GradeLevel>('07-10');
  const [examMode, setExamMode] = useState<ExamMode>('exam');
  const [accessCode, setAccessCode] = useState('');
  const [agreedToRules, setAgreedToRules] = useState(false);

  // States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [accessDeniedState, setAccessDeniedState] = useState<{ isDenied: boolean; reason: string } | null>(null);

  // Candidate Self-Deletion Modal State
  const [showDeleteProfileModal, setShowDeleteProfileModal] = useState(false);
  const [candidateDeleteReason, setCandidateDeleteReason] = useState('Candidate self-requested profile removal');
  const [isDeletingProfile, setIsDeletingProfile] = useState(false);
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState<string | null>(null);

  // Assessment History Modal State
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Hardware Fingerprint State
  const [hwFingerprint, setHwFingerprint] = useState<HardwareFingerprint | null>(null);

  // Returning Candidate Quick-Launch State
  const [returningUser, setReturningUser] = useState<{
    email: string;
    accessCode: string;
    fullName: string;
    gradeLevel: string;
  } | null>(null);

  // Compute immutable hardware fingerprint on mount & pre-cache question bank
  useEffect(() => {
    const fp = generateHardwareFingerprint();
    setHwFingerprint(fp);

    // Pre-cache all 120 questions for offline usage
    cacheQuestionsOffline();

    // Check if user is already logged in on this machine
    const stored = getStoredUserSession();
    if (stored) {
      setReturningUser(stored);
      setEmail(stored.email);
      setFullName(stored.fullName);
      setAccessCode(stored.accessCode);
      if (stored.gradeLevel === '07-10' || stored.gradeLevel === '12-13') {
        setGradeLevel(stored.gradeLevel as GradeLevel);
      }
    } else if (currentUser?.email) {
      // Auto-load registered user if Firebase Auth user is logged in
      const userDocId = currentUser.email.toLowerCase().trim().replace(/[^a-zA-Z0-9_-]/g, '_');
      getDoc(doc(db, 'registered_users', userDocId))
        .then((snap) => {
          if (snap.exists()) {
            const u = snap.data() as RegisteredUserRecord;
            const sessionData = {
              email: u.email,
              fullName: u.fullName || currentUser.displayName || 'Candidate',
              accessCode: u.accessCode || '',
              gradeLevel: '07-10',
            };
            saveStoredUserSession(sessionData);
            setReturningUser(sessionData);
            setEmail(u.email);
            setFullName(sessionData.fullName);
            setAccessCode(u.accessCode || '');
            if (u.department) setDepartment(u.department);
            if (u.cadre) setCadre(u.cadre);
          }
        })
        .catch((err) => {
          console.warn('Could not auto-fetch user from Firestore:', err);
        });
    }
  }, [currentUser]);

  // Quick Launch for logged-in candidates (Instant Launch Assessment)
  const handleQuickResume = async () => {
    if (!returningUser || !hwFingerprint) return;

    setIsLoading(true);
    setErrorMsg('');
    setAccessDeniedState(null);

    try {
      // If online, perform verification against Firestore
      if (isOnline) {
        const verifyRes = await verifyCurrentDeviceAutoLogin(
          returningUser.email,
          returningUser.accessCode,
          hwFingerprint.hardwareId
        );

        if (!verifyRes.valid) {
          setIsLoading(false);
          setAccessDeniedState({
            isDenied: true,
            reason: verifyRes.reason || 'Hardware binding mismatch or key disabled.',
          });
          return;
        }

        if (verifyRes.user?.department) setDepartment(verifyRes.user.department);
        if (verifyRes.user?.cadre) setCadre(verifyRes.user.cadre);
      }

      // Pre-cache questions offline
      cacheQuestionsOffline();

      // Launch assessment immediately
      onStartExam({
        fullName: returningUser.fullName,
        email: returningUser.email,
        department,
        cadre,
        gradeLevel,
        examMode,
        accessCode: returningUser.accessCode,
        hardwareId: hwFingerprint.hardwareId,
      });
    } catch (err: any) {
      console.warn('Network issue during auto-launch, proceeding offline:', err);
      // Proceed offline with cached session
      onStartExam({
        fullName: returningUser.fullName,
        email: returningUser.email,
        department,
        cadre,
        gradeLevel,
        examMode,
        accessCode: returningUser.accessCode,
        hardwareId: hwFingerprint.hardwareId,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Sign in with Email and Password
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setAccessDeniedState(null);

    if (!email || !password) {
      setErrorMsg('Please enter both email address and password.');
      return;
    }

    if (!hwFingerprint) {
      setErrorMsg('Computing hardware fingerprint... please retry in a moment.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Authenticate with Firebase Auth if online
      if (isOnline) {
        try {
          await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
        } catch (authErr: any) {
          if (authErr.code === 'auth/wrong-password' || authErr.code === 'auth/invalid-credential') {
            setErrorMsg('Invalid email or password. Please verify your credentials.');
            setIsLoading(false);
            return;
          } else if (authErr.code === 'auth/user-not-found') {
            setErrorMsg('Candidate account not found. Please click "Register with Passkey" below.');
            setIsLoading(false);
            return;
          } else {
            console.warn('Firebase Auth sign in notice:', authErr.message);
          }
        }
      }

      // 2. Verify hardware binding in Firestore
      const userDocId = email.toLowerCase().trim().replace(/[^a-zA-Z0-9_-]/g, '_');
      if (isOnline) {
        const userRef = doc(db, 'registered_users', userDocId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          setErrorMsg('No candidate record registered for this email. Please register your account with your passkey.');
          setIsLoading(false);
          return;
        }

        const userData = userSnap.data() as RegisteredUserRecord;

        // Check if bound to a different machine
        if (userData.hardwareId && userData.hardwareId !== hwFingerprint.hardwareId) {
          setAccessDeniedState({
            isDenied: true,
            reason: `ACCESS DENIED: This account is registered to physical device [${userData.hardwareId}]. Accessing from a different hardware machine [${hwFingerprint.hardwareId}] is blocked.`,
          });
          setIsLoading(false);
          return;
        }

        const sessionData = {
          email: userData.email,
          fullName: userData.fullName,
          accessCode: userData.accessCode,
          gradeLevel,
        };

        saveStoredUserSession(sessionData);
        setReturningUser(sessionData);
        if (userData.department) setDepartment(userData.department);
        if (userData.cadre) setCadre(userData.cadre);
      } else {
        // Offline login verification from local storage
        const stored = getStoredUserSession();
        if (stored && stored.email.toLowerCase() === email.toLowerCase().trim()) {
          setReturningUser(stored);
        } else {
          setErrorMsg('Offline mode: You must first sign in while connected to internet on this device to cache your account.');
          setIsLoading(false);
          return;
        }
      }

      // Cache questions
      cacheQuestionsOffline();
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Please check network connection.');
    } finally {
      setIsLoading(false);
    }
  };

  // Register New Candidate Account with Email, Password & Passkey
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setAccessDeniedState(null);

    if (!fullName.trim() || !email.trim() || !accessCode.trim() || !password) {
      setErrorMsg('Please complete all required fields.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Password and Confirm Password do not match.');
      return;
    }

    if (!agreedToRules) {
      setErrorMsg('You must boldly accept the Statutory Terms of Agreement and Single-Device Binding to register.');
      return;
    }

    if (!hwFingerprint) {
      setErrorMsg('Computing hardware signature... please retry in a second.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Create Firebase Auth user if online
      if (isOnline) {
        try {
          await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
        } catch (authErr: any) {
          if (authErr.code === 'auth/email-already-in-use') {
            // Already created in auth, sign in with provided password
            try {
              await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
            } catch {
              // Ignore if already signed in
            }
          } else {
            console.warn('Auth creation notice:', authErr.message);
          }
        }
      }

      // 2. Validate and Claim Passkey in Firestore
      const result = await validateAndClaimAccessCode(
        accessCode,
        email,
        fullName,
        hwFingerprint.hardwareId,
        { gpuRenderer: hwFingerprint.gpuRenderer }
      );

      if (!result.success) {
        setIsLoading(false);
        if (result.code === 'HARDWARE_MISMATCH_DENIED' || result.code === 'ALREADY_CLAIMED_BY_ANOTHER') {
          setAccessDeniedState({
            isDenied: true,
            reason: result.message,
          });
        } else {
          setErrorMsg(result.message);
        }
        return;
      }

      // 3. Save stored session so candidate is permanently signed in next time
      const sessionData = {
        email: email.trim().toLowerCase(),
        accessCode: accessCode.trim().toUpperCase(),
        fullName: fullName.trim(),
        gradeLevel,
      };

      saveStoredUserSession(sessionData);
      setReturningUser(sessionData);

      // Pre-cache all questions locally
      cacheQuestionsOffline();

      // Launch assessment immediately
      onStartExam({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        department,
        cadre,
        gradeLevel,
        examMode,
        accessCode: accessCode.trim().toUpperCase(),
        hardwareId: hwFingerprint.hardwareId,
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. Please check network connection.');
    } finally {
      setIsLoading(false);
    }
  };

  // Sign out candidate: Clears session and returns to login screen
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch {}
    clearStoredUserSession();
    setReturningUser(null);
    setPassword('');
    setConfirmPassword('');
    setAuthMode('login');
  };

  // Handle Candidate Self-Deletion
  const handleCandidateSelfDeletion = async () => {
    if (!returningUser || !hwFingerprint) return;

    setIsDeletingProfile(true);
    try {
      const res = await candidateDeleteProfile(
        returningUser.email,
        hwFingerprint.hardwareId,
        candidateDeleteReason
      );

      clearStoredUserSession();
      try {
        await signOut(auth);
      } catch {}

      setReturningUser(null);
      setShowDeleteProfileModal(false);
      setDeleteSuccessMsg(res.message);
      setAuthMode('login');
      setEmail('');
      setPassword('');
      setAccessCode('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Profile deletion encountered an error.');
    } finally {
      setIsDeletingProfile(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">

      {/* Official Practice Disclaimer Banner */}
      <div className="mb-6 p-4 bg-amber-500/10 border-2 border-amber-500/40 rounded-xl flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-950 leading-relaxed">
          <strong className="font-bold text-amber-900 uppercase tracking-wide block mb-0.5">
            Independent Practice Simulator Disclaimer
          </strong>
          This portal is an independent <strong>Civil Service &amp; Health Promotion CBT Practice Simulator</strong> created for exam preparation and study testing. It is <strong>NOT</strong> an official state evaluation portal, and no government personnel file numbers or official credentials are required or processed.
        </div>
      </div>

      {/* Main Practice Platform Header (Minimalist Book Icon & Titles as in user's image) */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-900 border-2 border-emerald-500/30 text-emerald-300 font-extrabold text-2xl shadow-lg mb-3">
          <BookOpen className="w-8 h-8 text-amber-400" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Health &amp; Civil Service CBT Practice Portal
        </h2>
        <p className="text-sm font-semibold text-emerald-800 uppercase tracking-widest mt-1">
          Curriculum Evaluation Simulator &amp; Self-Assessment
        </p>
        <p className="text-xs text-slate-500 max-w-xl mx-auto mt-2 leading-relaxed">
          Practice environment for promotional examinations across Grade Levels 07–10 and 12–13 health and administrative cadres. Features single-device hardware fingerprint binding and anti-cheat tracking (5 focus warnings limit).
        </p>
      </div>

      {/* PROFILE DELETION SUCCESS BANNER */}
      {deleteSuccessMsg && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border-2 border-emerald-500 text-emerald-950 shadow-sm flex items-start gap-3 animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
              Profile Removed &amp; Hardware Released
            </h4>
            <p className="text-xs text-emerald-800 leading-relaxed">
              {deleteSuccessMsg}
            </p>
          </div>
        </div>
      )}

      {/* ACCESS DENIED ERROR STATE OVERLAY */}
      {accessDeniedState?.isDenied && (
        <div className="mb-6 p-5 rounded-2xl bg-rose-50 border-2 border-rose-500 text-rose-950 shadow-md animate-in fade-in duration-200">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-extrabold text-rose-900 uppercase tracking-wide">
                Access Denied: Hardware Security Lockout
              </h3>
              <p className="text-xs text-rose-800 leading-relaxed">
                {accessDeniedState.reason}
              </p>
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setAccessDeniedState(null)}
                  className="text-xs font-bold text-rose-800 underline hover:text-rose-950 cursor-pointer"
                >
                  Dismiss &amp; Try Different Credentials
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. LOGGED IN STATE: SHOW MINIMALIST RECOGNIZED CARD EXACTLY AS IN IMAGE */}
      {/* ========================================================================= */}
      {returningUser && !accessDeniedState?.isDenied ? (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Minimalist Card matching user's uploaded image.png */}
          <div className="p-5 sm:p-6 rounded-2xl bg-emerald-50/80 border-2 border-emerald-500/40 text-emerald-950 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div className="flex items-center gap-4 text-left">
              <div className="w-12 h-12 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Sparkles className="w-6 h-6 text-amber-300" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-800">
                    Authorized Hardware Recognized
                  </span>
                  <span className="text-[10px] bg-emerald-200 text-emerald-900 font-extrabold px-2 py-0.5 rounded">
                    One-Time Signup Active
                  </span>
                  <span className="text-[10px] bg-slate-200 text-slate-800 font-bold px-2 py-0.5 rounded flex items-center gap-1">
                    {isOnline ? <Wifi className="w-3 h-3 text-emerald-700" /> : <WifiOff className="w-3 h-3 text-amber-700" />}
                    <span>{isOnline ? 'Online Sync' : 'Offline Ready'}</span>
                  </span>
                </div>
                <div className="text-base sm:text-lg font-extrabold text-slate-900 mt-0.5">
                  Welcome back, {returningUser.fullName}!
                </div>
                <div className="text-xs text-slate-600 font-mono mt-0.5">
                  {returningUser.email} &middot; Passkey: {returningUser.accessCode}
                  {hwFingerprint && (
                    <span className="text-slate-500 ml-2">&middot; HW: {hwFingerprint.hardwareId}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto shrink-0">
              {/* Instant Launch Assessment Button */}
              <button
                type="button"
                onClick={handleQuickResume}
                disabled={isLoading}
                className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <span>{isLoading ? 'Verifying Hardware...' : 'Instant Launch Assessment'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Candidate Delete Profile Button */}
              <button
                type="button"
                onClick={() => setShowDeleteProfileModal(true)}
                title="Delete candidate profile from this portal while preserving an audit copy"
                className="px-3 py-2.5 rounded-xl border border-rose-300 bg-white hover:bg-rose-50 text-rose-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span className="hidden sm:inline">Delete Profile</span>
              </button>

              {/* Log Out Button */}
              <button
                type="button"
                onClick={handleLogout}
                title="Log out from this device"
                className="p-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-600 text-xs transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Stream & Assessment History Tray */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3">
              <Award className="w-5 h-5 text-emerald-700" />
              <div>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Active Examination Stream
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setGradeLevel('07-10')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      gradeLevel === '07-10'
                        ? 'bg-emerald-800 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Grade Level 07–10
                  </button>
                  <button
                    type="button"
                    onClick={() => setGradeLevel('12-13')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      gradeLevel === '12-13'
                        ? 'bg-emerald-800 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Grade Level 12–13
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setShowHistoryModal(true)}
                className="w-full sm:w-auto px-4 py-2 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-800 hover:text-emerald-900 border border-slate-300 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <History className="w-4 h-4 text-emerald-700" />
                <span>My Past Assessments &amp; STELLA AI Analysis</span>
              </button>
            </div>
          </div>
        </div>
      ) : authMode === 'login' ? (
        /* ========================================================================= */
        /* 2. NOT LOGGED IN - CANDIDATE LOGIN SCREEN (MINIMALIST) */
        /* ========================================================================= */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-200 max-w-xl mx-auto">
          {/* Card Header */}
          <div className="bg-emerald-950 px-6 py-4 border-b border-emerald-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LogIn className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Candidate Portal Sign In
              </h3>
            </div>
            {hwFingerprint && (
              <span className="text-[11px] font-mono font-semibold text-emerald-200 bg-emerald-900/80 px-2 py-0.5 rounded border border-emerald-700/60">
                HW: {hwFingerprint.hardwareId}
              </span>
            )}
          </div>

          <form onSubmit={handleLogin} className="p-6 sm:p-8 space-y-5">
            {errorMsg && (
              <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label htmlFor="login-email" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Candidate Email Address *
              </label>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. candidate@example.com"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="login-password" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Account Password *
                </label>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your candidate password"
                  className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer p-1"
                  title={showPassword ? 'Hide password' : 'View password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                <span>Single-Device Hardware Security Active</span>
              </div>
              <p>
                Signing in verifies this machine&apos;s physical hardware signature against your claimed passkey. Once signed in, you will remain logged in by default.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-6 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{isLoading ? 'Verifying Hardware & Credentials...' : 'Sign In to Candidate Portal'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Switch to Registration Mode Button */}
            <div className="pt-3 border-t border-slate-200 text-center">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setErrorMsg('');
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-emerald-600 text-emerald-800 hover:bg-emerald-50 font-bold text-xs transition-colors cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5 text-emerald-700" />
                <span>New Candidate? Register with Passkey</span>
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* ========================================================================= */
        /* 3. REGISTRATION FORM (WHEN USER CLICKS "REGISTER WITH PASSKEY") */
        /* ========================================================================= */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-200">
          <div className="bg-emerald-950 px-6 py-4 border-b border-emerald-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Candidate Enrolment &amp; Single-Device Passkey Registration
              </h3>
            </div>
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setErrorMsg('');
              }}
              className="text-xs text-amber-300 hover:text-amber-200 font-bold underline cursor-pointer"
            >
              Return to Sign In
            </button>
          </div>

          <form onSubmit={handleRegister} className="p-6 sm:p-8 space-y-6">
            {errorMsg && (
              <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Universal Passkey Access Code Input */}
            <div className="p-4 rounded-xl bg-slate-50 border-2 border-emerald-800/20 space-y-3">
              <div className="flex items-center justify-between">
                <label htmlFor="reg-access-code" className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-emerald-700" />
                  <span>Universal Passkey Access Code *</span>
                </label>
                {hwFingerprint && (
                  <span className="text-[11px] font-mono font-semibold text-emerald-800 flex items-center gap-1 bg-emerald-100/70 px-2 py-0.5 rounded">
                    <Cpu className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Hardware ID: {hwFingerprint.hardwareId}</span>
                  </span>
                )}
              </div>

              <div className="relative">
                <input
                  id="reg-access-code"
                  type="text"
                  required
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                  placeholder="Enter passkey (e.g. PASS-XXXX)"
                  className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-lg text-base font-mono font-bold tracking-widest text-emerald-950 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all uppercase"
                />
              </div>

              <p className="text-[11px] text-slate-600 leading-relaxed">
                <strong>Single-Device Hardware Lock:</strong> When you register, this passkey is permanently bound to this physical machine&apos;s unique hardware signature and your email. It cannot be used on other computers or phones.
              </p>
            </div>

            {/* Personal Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="reg-full-name" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Name *
                </label>
                <input
                  id="reg-full-name"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Amina Mohammed"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label htmlFor="reg-email" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Address (Account Identifier) *
                </label>
                <input
                  id="reg-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. candidate@example.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Password and Confirm Password with View Password Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="reg-password" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Create Password *
                </label>
                <div className="relative">
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer p-1"
                    title={showPassword ? 'Hide password' : 'View password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="reg-confirm-password" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Confirm Password *
                </label>
                <div className="relative">
                  <input
                    id="reg-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className={`w-full px-3.5 py-2.5 pr-10 bg-slate-50 border rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                      confirmPassword && password !== confirmPassword
                        ? 'border-rose-400 focus:ring-rose-500'
                        : 'border-slate-300 focus:ring-emerald-600'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer p-1"
                    title={showConfirmPassword ? 'Hide password' : 'View password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <span className="text-[10px] text-rose-600 mt-1 block">Passwords do not match</span>
                )}
              </div>
            </div>

            {/* Department & Cadre */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="reg-department" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Department / Health Center *
                </label>
                <select
                  id="reg-department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all"
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="reg-cadre" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Professional Cadre *
                </label>
                <select
                  id="reg-cadre"
                  value={cadre}
                  onChange={(e) => setCadre(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all"
                >
                  {CADRES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Curriculum Stream Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Target Promotional Grade Level Stream *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    gradeLevel === '07-10'
                      ? 'border-emerald-700 bg-emerald-50/50 text-emerald-950 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="regGradeLevel"
                    value="07-10"
                    checked={gradeLevel === '07-10'}
                    onChange={() => setGradeLevel('07-10')}
                    className="mt-1 text-emerald-700 focus:ring-emerald-600"
                  />
                  <div>
                    <div className="text-sm font-bold flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-emerald-700" />
                      <span>Grade Level 07 – 10 Stream</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Public Service Rules, General Orders, Health Hygiene &amp; Practice, Administrative Procedures, and Public Health Law.
                    </p>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    gradeLevel === '12-13'
                      ? 'border-emerald-700 bg-emerald-50/50 text-emerald-950 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="regGradeLevel"
                    value="12-13"
                    checked={gradeLevel === '12-13'}
                    onChange={() => setGradeLevel('12-13')}
                    className="mt-1 text-emerald-700 focus:ring-emerald-600"
                  />
                  <div>
                    <div className="text-sm font-bold flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-emerald-700" />
                      <span>Grade Level 12 – 13 Stream</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Advanced Administrative Governance, Health Policy Analysis, Financial Regulations, Procurement Acts, and Leadership.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* BOLDLY SHOWN TERMS OF AGREEMENT */}
            <div className="p-4 sm:p-5 rounded-xl bg-slate-900 text-white border-2 border-emerald-600 shadow-md space-y-3">
              <div className="flex items-center gap-2 text-amber-400">
                <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
                <h4 className="text-xs font-black uppercase tracking-wider">
                  Statutory Terms of Agreement &amp; Single-Device Hardware Binding Protocol
                </h4>
              </div>

              <div className="text-xs space-y-2 text-slate-200 leading-relaxed">
                <p>
                  <strong>1. SINGLE-DEVICE HARDWARE LOCK:</strong> Your universal passkey is strictly and permanently bound to this physical computer/device hardware signature and your registered candidate email. It <strong>CANNOT</strong> be transferred or used across multiple machines, phones, or virtual browsers.
                </p>
                <p>
                  <strong>2. ANTI-CHEAT &amp; FOCUS INFRACTIONS LIMIT:</strong> During active assessment, switching browser tabs, minimizing windows, or navigating away is strictly logged. Reaching <strong>5 focus infractions</strong> triggers automated lockout and final submission.
                </p>
                <p>
                  <strong>3. INDEPENDENT STUDY REPOSITORY:</strong> This simulator is an independent preparatory platform created for civil service and healthcare promotional assessments. All assessment attempts and score dossiers are preserved for candidate study and self-evaluation.
                </p>
                <p>
                  <strong>4. CANDIDATE PROFILE DELETION:</strong> You retain the statutory right to delete your candidate profile at any time, which frees your hardware passkey binding while preserving a compliance audit log.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-700">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={agreedToRules}
                    onChange={(e) => setAgreedToRules(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-500 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-bold text-amber-300">
                    I HAVE READ, UNDERSTOOD, AND BOLDLY ACCEPT ALL TERMS AND CONDITIONS OF AGREEMENT ABOVE.
                  </span>
                </label>
              </div>
            </div>

            {/* Register Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 px-6 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-emerald-950/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>{isLoading ? 'Claiming Passkey & Binding Device...' : 'Complete Registration & Claim Passkey'}</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setErrorMsg('');
                }}
                className="text-xs text-slate-600 hover:text-emerald-800 font-semibold cursor-pointer underline"
              >
                Already have a registered account? Sign In here
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CANDIDATE SELF-DELETION CONFIRMATION MODAL */}
      {showDeleteProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-slate-800 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-rose-900">
                  Delete Candidate Profile &amp; Free Hardware?
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Deleting your profile unlinks your passkey and frees this device hardware signature. A permanent compliance audit log will be preserved for administrator verification.
                </p>
              </div>
            </div>

            <div>
              <label htmlFor="del-reason" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Reason for Removal:
              </label>
              <textarea
                id="del-reason"
                rows={2}
                value={candidateDeleteReason}
                onChange={(e) => setCandidateDeleteReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeletingProfile}
                onClick={() => setShowDeleteProfileModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingProfile}
                onClick={handleCandidateSelfDeletion}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingProfile ? 'Removing...' : 'Confirm Profile Deletion'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ASSESSMENT HISTORY & AI ANALYSIS MODAL */}
      {showHistoryModal && returningUser && (
        <CandidateAssessmentHistoryModal
          candidateEmail={returningUser.email}
          candidateName={returningUser.fullName}
          onClose={() => setShowHistoryModal(false)}
        />
      )}

    </div>
  );
};
