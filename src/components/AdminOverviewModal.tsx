import React, { useState, useEffect } from 'react';
import {
  Users,
  KeyRound,
  PlusCircle,
  RefreshCw,
  LogOut,
  Trash2,
  Search,
  Copy,
  Check,
  AlertTriangle,
  Lock,
  Cpu,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  FileText,
  AlertCircle
} from 'lucide-react';
import { User, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider, ADMIN_EMAIL } from '../firebase';
import {
  adminFetchAllCodes,
  adminFetchAllUsers,
  adminCreateAccessCode,
  adminBatchGenerateCodes,
  adminToggleCodeStatus,
  adminUnlinkDevice,
  adminDeleteCode,
  adminDeleteUser,
  adminFetchAuditLog,
  adminClearAllMockData
} from '../services/dbService';
import { AccessCodeRecord, RegisteredUserRecord, AuditDeletedProfileRecord } from '../types/exam';

interface AdminOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
}

export const AdminOverviewModal: React.FC<AdminOverviewModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<'codes' | 'users' | 'generate' | 'audit'>('codes');
  const [codes, setCodes] = useState<AccessCodeRecord[]>([]);
  const [users, setUsers] = useState<RegisteredUserRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditDeletedProfileRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // User Deletion Modal State
  const [userToDelete, setUserToDelete] = useState<RegisteredUserRecord | null>(null);
  const [deleteAssociatedKey, setDeleteAssociatedKey] = useState(false);
  const [adminDeleteReason, setAdminDeleteReason] = useState('Administrator removed candidate user from portal');
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [userDeleteSuccess, setUserDeleteSuccess] = useState<string | null>(null);

  // New Code Form (Universal for all levels)
  const [newCodeName, setNewCodeName] = useState('');
  const [newCodeNotes, setNewCodeNotes] = useState('');
  const [createMsg, setCreateMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Batch Generation State (Universal)
  const [batchCount, setBatchCount] = useState(5);
  const [batchResults, setBatchResults] = useState<string[]>([]);

  // Search Filter & Status Filter
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNCLAIMED' | 'CLAIMED' | 'DISABLED'>('ALL');

  // Purge State
  const [purgeMsg, setPurgeMsg] = useState<string | null>(null);

  const isAdmin = currentUser?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const handleGoogleLogin = async () => {
    setAuthError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      setAuthError(err.message || 'Google Sign-In failed.');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err: any) {
      console.error('Logout error:', err);
    }
  };

  const loadData = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const fetchedCodes = await adminFetchAllCodes();
      const fetchedUsers = await adminFetchAllUsers();
      const fetchedAudit = await adminFetchAuditLog();
      setCodes(fetchedCodes);
      setUsers(fetchedUsers);
      setAuditLogs(fetchedAudit);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && isAdmin) {
      loadData();
    }
  }, [isOpen, isAdmin]);

  if (!isOpen) return null;

  const handleCreateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCodeName.trim()) return;
    setLoading(true);
    setCreateMsg(null);
    const res = await adminCreateAccessCode(newCodeName, {
      notes: newCodeNotes,
    });
    setLoading(false);
    if (res.success) {
      setCreateMsg({ type: 'success', text: res.message });
      setNewCodeName('');
      setNewCodeNotes('');
      loadData();
    } else {
      setCreateMsg({ type: 'error', text: res.message });
    }
  };

  const handleBatchGenerate = async () => {
    setLoading(true);
    setBatchResults([]);
    const generated = await adminBatchGenerateCodes(batchCount);
    setBatchResults(generated);
    setLoading(false);
    loadData();
  };

  const handleToggleStatus = async (code: AccessCodeRecord) => {
    const nextStatus = code.status === 'active' ? 'disabled' : 'active';
    await adminToggleCodeStatus(code.id, nextStatus);
    loadData();
  };

  const handleResetDevice = async (code: string) => {
    if (confirm(`Unlink hardware binding for passkey ${code}? This allows the candidate to register on a new machine.`)) {
      await adminUnlinkDevice(code);
      loadData();
    }
  };

  const handleDeleteCode = async (code: string) => {
    if (confirm(`Permanently delete passkey ${code}?`)) {
      await adminDeleteCode(code);
      loadData();
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeletingUser(true);
    setUserDeleteSuccess(null);
    try {
      const res = await adminDeleteUser(userToDelete.email, {
        deleteAssociatedPasskey: deleteAssociatedKey,
        reason: adminDeleteReason.trim() || 'Administrator removed user account from portal',
      });
      if (res.success) {
        setUserDeleteSuccess(res.message);
        setUserToDelete(null);
        await loadData();
        setTimeout(() => setUserDeleteSuccess(null), 6000);
      } else {
        alert(res.message);
      }
    } catch (err: any) {
      alert('Failed to delete candidate user: ' + err.message);
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handlePurgeMockData = async () => {
    if (confirm('Are you sure you want to CLEAR ALL database records? This will delete all access codes, candidate user records, and practice sessions in Firestore, providing a 100% clean database to start afresh.')) {
      setLoading(true);
      const res = await adminClearAllMockData();
      setLoading(false);
      setPurgeMsg(res.message);
      await loadData();
      setTimeout(() => setPurgeMsg(null), 6000);
    }
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Filtered Codes
  const filteredCodes = codes.filter((c) => {
    const term = searchFilter.toLowerCase();
    const matchesSearch = (
      c.code.toLowerCase().includes(term) ||
      (c.boundEmail && c.boundEmail.toLowerCase().includes(term)) ||
      (c.boundUserName && c.boundUserName.toLowerCase().includes(term)) ||
      (c.boundHardwareId && c.boundHardwareId.toLowerCase().includes(term))
    );

    if (!matchesSearch) return false;

    if (statusFilter === 'DISABLED') return c.status === 'disabled';
    if (statusFilter === 'CLAIMED') return c.status === 'active' && (c.boundHardwareId || c.boundDeviceId);
    if (statusFilter === 'UNCLAIMED') return c.status === 'active' && !(c.boundHardwareId || c.boundDeviceId);

    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-hidden">
      <div className="bg-white rounded-2xl max-w-5xl w-full h-[90vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header Bar */}
        <div className="bg-emerald-950 text-white px-6 py-4 flex items-center justify-between border-b border-emerald-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-900 border border-emerald-700 flex items-center justify-center text-amber-400 font-bold text-base shadow-inner">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                <span>Platform Admin Portal</span>
                <span className="text-[10px] bg-amber-400/20 text-amber-300 font-mono px-2 py-0.5 rounded border border-amber-400/30">
                  Universal Passkeys
                </span>
              </h2>
              <p className="text-xs text-emerald-300/80">
                Manage hardware passkeys, delete candidate profiles with audit copies, and start afresh.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {currentUser && (
              <div className="flex items-center gap-2">
                <span className="hidden md:inline font-mono text-xs text-emerald-200 truncate max-w-[180px]">
                  {currentUser.email}
                </span>
                <button
                  onClick={handleLogout}
                  title="Sign out administrator"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-bold transition-colors shadow-xs"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out</span>
                </button>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-emerald-900 hover:bg-emerald-800 text-emerald-300 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content Zone */}
        {!currentUser ? (
          // Unauthenticated State: Sign in with Google
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-4 border border-emerald-200">
              <KeyRound className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Administrator Authentication Required
            </h3>
            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
              Sign in with your designated administrator Google Account (<strong>{ADMIN_EMAIL}</strong>) to manage passkeys, device bindings, and candidate records.
            </p>

            {authError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-2 text-left w-full">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            <button
              onClick={handleGoogleLogin}
              className="w-full py-3 px-6 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              <span>Sign in with Google ({ADMIN_EMAIL})</span>
            </button>
          </div>
        ) : !isAdmin ? (
          // Authenticated but Not Authorized Email
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-800 flex items-center justify-center mb-4 border border-rose-200">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Access Restricted
            </h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Signed in as <strong>{currentUser.email}</strong>, which is not the designated platform administrator account (<strong>{ADMIN_EMAIL}</strong>).
            </p>
            <button
              onClick={handleLogout}
              className="py-2.5 px-5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm flex items-center gap-1.5"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out & Use Admin Account</span>
            </button>
          </div>
        ) : (
          // Designated Admin Panel
          <div className="flex-1 flex flex-col overflow-hidden">
            
            {/* Purge Notification */}
            {purgeMsg && (
              <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 text-xs text-emerald-900 font-semibold flex items-center justify-between">
                <span>{purgeMsg}</span>
                <button onClick={() => setPurgeMsg(null)} className="text-emerald-700 font-bold">✕</button>
              </div>
            )}

            {/* Candidate Deletion Toast */}
            {userDeleteSuccess && (
              <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 text-xs text-amber-900 font-semibold flex items-center justify-between">
                <span>{userDeleteSuccess}</span>
                <button onClick={() => setUserDeleteSuccess(null)} className="text-amber-700 font-bold">✕</button>
              </div>
            )}

            {/* Navigation Tabs Bar */}
            <div className="bg-slate-100 px-6 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('codes')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'codes'
                      ? 'bg-white text-emerald-950 shadow-sm border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <KeyRound className="w-4 h-4 text-emerald-700" />
                  <span>Universal Passkeys ({codes.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('users')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'users'
                      ? 'bg-white text-emerald-950 shadow-sm border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Users className="w-4 h-4 text-emerald-700" />
                  <span>Enrolled Candidates ({users.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('generate')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'generate'
                      ? 'bg-white text-emerald-950 shadow-sm border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <PlusCircle className="w-4 h-4 text-emerald-700" />
                  <span>Issue Passkeys</span>
                </button>

                <button
                  onClick={() => setActiveTab('audit')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'audit'
                      ? 'bg-white text-emerald-950 shadow-sm border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>Audit Trail ({auditLogs.length})</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {/* Clear / Start Afresh Purge Button */}
                <button
                  onClick={handlePurgeMockData}
                  disabled={loading}
                  title="Purge all database records (codes, users, sessions) so you can start afresh"
                  className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Clear All Data (Start Afresh)</span>
                </button>

                <button
                  onClick={loadData}
                  disabled={loading}
                  className="p-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
                  title="Refresh Database"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* TAB 1: ACCESS PASSKEYS MANAGEMENT */}
            {activeTab === 'codes' && (
              <div className="flex-1 flex flex-col p-6 overflow-hidden space-y-4">
                
                {/* Search & Filter Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                  <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      placeholder="Search passkey, email, hardware ID..."
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 w-full sm:w-auto">
                    {(['ALL', 'UNCLAIMED', 'CLAIMED', 'DISABLED'] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => setStatusFilter(st)}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider transition-colors ${
                          statusFilter === st
                            ? 'bg-emerald-900 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Codes Table */}
                <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl bg-white shadow-xs">
                  {filteredCodes.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 text-xs">
                      {codes.length === 0 ? (
                        <div className="space-y-3">
                          <KeyRound className="w-10 h-10 text-slate-300 mx-auto" />
                          <p className="font-semibold text-slate-700">No passkeys found in database.</p>
                          <p className="text-slate-500 max-w-sm mx-auto">
                            The database is completely clean. Click the <strong>&quot;Issue Passkeys&quot;</strong> tab to generate universal passkeys for your candidates.
                          </p>
                          <button
                            onClick={() => setActiveTab('generate')}
                            className="px-4 py-2 rounded-lg bg-emerald-800 text-white font-bold text-xs"
                          >
                            + Generate Universal Passkeys
                          </button>
                        </div>
                      ) : (
                        'No passkeys match the current search filter.'
                      )}
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="py-3 px-4">Passkey Code</th>
                          <th className="py-3 px-3">Curriculum Scope</th>
                          <th className="py-3 px-3">Usage Status</th>
                          <th className="py-3 px-3">Bound Candidate & Email</th>
                          <th className="py-3 px-3">Hardware Fingerprint ID</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredCodes.map((item) => {
                          const isClaimed = !!(item.boundHardwareId || item.boundDeviceId);
                          const isDisabled = item.status === 'disabled';

                          return (
                            <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                              {/* Passkey */}
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-sm text-emerald-950">
                                    {item.code}
                                  </span>
                                  <button
                                    onClick={() => handleCopy(item.code)}
                                    title="Copy passkey to clipboard"
                                    className="p-1 hover:bg-slate-200 rounded text-slate-500"
                                  >
                                    {copiedCode === item.code ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                                {item.notes && (
                                  <div className="text-[11px] text-slate-500 italic mt-0.5">
                                    {item.notes}
                                  </div>
                                )}
                              </td>

                              {/* Curriculum Scope: Universal */}
                              <td className="py-3 px-3">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-900 border border-emerald-300">
                                  Universal (All Levels)
                                </span>
                              </td>

                              {/* Usage Status */}
                              <td className="py-3 px-3">
                                {isDisabled ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                    Deactivated
                                  </span>
                                ) : isClaimed ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                    Bound & In Use
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    Ready / Unclaimed
                                  </span>
                                )}
                              </td>

                              {/* Bound User */}
                              <td className="py-3 px-3">
                                {item.boundEmail ? (
                                  <div>
                                    <span className="font-bold text-slate-900 block">
                                      {item.boundUserName || 'Enrolled Candidate'}
                                    </span>
                                    <span className="font-mono text-[11px] text-slate-500 block">
                                      {item.boundEmail}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic">None (Awaiting candidate)</span>
                                )}
                              </td>

                              {/* Bound Hardware */}
                              <td className="py-3 px-3">
                                {item.boundHardwareId ? (
                                  <div className="flex items-center gap-1.5 font-mono text-[11px] text-emerald-900 bg-slate-100 px-2 py-1 rounded border border-slate-200 w-fit">
                                    <Cpu className="w-3 h-3 text-emerald-700 shrink-0" />
                                    <span className="font-bold">{item.boundHardwareId}</span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 text-[11px]">Unbound</span>
                                )}
                              </td>

                              {/* Actions */}
                              <td className="py-3 px-4 text-right">
                                <div className="inline-flex items-center gap-1.5">
                                  {isClaimed && (
                                    <button
                                      onClick={() => handleResetDevice(item.code)}
                                      title="Unlink device binding (allow re-binding on another machine)"
                                      className="p-1 rounded bg-slate-100 hover:bg-amber-100 text-amber-800 border border-slate-300 text-[10px] font-bold flex items-center gap-1"
                                    >
                                      <RotateCcw className="w-3 h-3" />
                                      <span>Unlink</span>
                                    </button>
                                  )}

                                  <button
                                    onClick={() => handleToggleStatus(item)}
                                    title={isDisabled ? 'Enable Passkey' : 'Disable Passkey'}
                                    className={`p-1 rounded text-[10px] font-bold border ${
                                      isDisabled
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                        : 'bg-slate-100 text-slate-700 border-slate-300'
                                    }`}
                                  >
                                    {isDisabled ? 'Activate' : 'Disable'}
                                  </button>

                                  <button
                                    onClick={() => handleDeleteCode(item.code)}
                                    title="Delete Passkey"
                                    className="p-1 rounded text-rose-600 hover:bg-rose-50"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: REGISTERED CANDIDATES WITH DELETE OPTION */}
            {activeTab === 'users' && (
              <div className="flex-1 flex flex-col p-6 overflow-hidden space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-600 shrink-0">
                  <span>
                    Candidates who have registered a profile. Admins can delete users while maintaining an immutable compliance audit record.
                  </span>
                  <span className="font-bold text-slate-800">
                    Total: {users.length} candidate(s)
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl bg-white shadow-xs">
                  {users.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 text-xs">
                      No candidate profiles are currently active. Portal is ready for new registrations.
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="py-3 px-4">Candidate Name</th>
                          <th className="py-3 px-3">Email Address (ID)</th>
                          <th className="py-3 px-3">Passkey Used</th>
                          <th className="py-3 px-3">Hardware ID Lock</th>
                          <th className="py-3 px-3">Practice Attempts</th>
                          <th className="py-3 px-3">Best Score</th>
                          <th className="py-3 px-3">Last Active</th>
                          <th className="py-3 px-4 text-right">Admin Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {users.map((u) => (
                          <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4 font-bold text-slate-900">
                              {u.fullName}
                              {u.department && (
                                <span className="block text-[11px] text-slate-500 font-normal">
                                  {u.department} · {u.cadre}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 font-mono text-slate-700">
                              {u.email}
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-emerald-900">
                              {u.accessCode}
                            </td>
                            <td className="py-3 px-3">
                              <span className="font-mono text-[11px] bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                                {u.hardwareId}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-bold text-slate-800">
                              {u.totalPracticeSessions || 0} session(s)
                            </td>
                            <td className="py-3 px-3">
                              <span className={`font-mono font-bold px-2 py-0.5 rounded ${
                                (u.highestScore || 0) >= 60 ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'
                              }`}>
                                {u.highestScore || 0}%
                              </span>
                            </td>
                            <td className="py-3 px-3 text-slate-500 text-[11px]">
                              {u.lastActiveAt ? new Date(u.lastActiveAt).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => {
                                  setUserToDelete(u);
                                  setDeleteAssociatedKey(false);
                                  setAdminDeleteReason('Administrator removed candidate user from portal');
                                }}
                                title="Delete Candidate User from Portal (Preserve Audit Copy)"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-[11px] font-bold transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                <span>Delete User</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: ISSUE / GENERATE PASSKEYS */}
            {activeTab === 'generate' && (
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Batch Generator */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-emerald-700" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        Batch Generate Universal Passkeys
                      </h4>
                      <p className="text-xs text-slate-600">
                        Create multiple universal access passkeys at once. Each passkey is valid for all Grade Levels (GL 07-10 and GL 12-13).
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 pt-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Quantity to Generate
                      </label>
                      <select
                        value={batchCount}
                        onChange={(e) => setBatchCount(Number(e.target.value))}
                        className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                      >
                        <option value={5}>5 Passkeys</option>
                        <option value={10}>10 Passkeys</option>
                        <option value={20}>20 Passkeys</option>
                        <option value={50}>50 Passkeys</option>
                      </select>
                    </div>

                    <div className="self-end">
                      <button
                        onClick={handleBatchGenerate}
                        disabled={loading}
                        className="px-5 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5"
                      >
                        <PlusCircle className="w-4 h-4" />
                        <span>Generate {batchCount} Universal Keys</span>
                      </button>
                    </div>
                  </div>

                  {/* Batch Results Output */}
                  {batchResults.length > 0 && (
                    <div className="p-3 bg-white border border-emerald-300 rounded-lg space-y-2">
                      <div className="text-xs font-bold text-emerald-900 flex items-center justify-between">
                        <span>Successfully Generated {batchResults.length} Passkeys:</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(batchResults.join('\n'));
                            alert('All generated passkeys copied to clipboard!');
                          }}
                          className="text-[11px] text-emerald-700 underline font-bold"
                        >
                          Copy All
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {batchResults.map((bCode) => (
                          <span key={bCode} className="px-2.5 py-1 bg-emerald-50 text-emerald-950 font-mono font-bold text-xs rounded border border-emerald-200">
                            {bCode}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Create Custom Passkey */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <PlusCircle className="w-5 h-5 text-emerald-700" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        Create Custom Named Passkey
                      </h4>
                      <p className="text-xs text-slate-600">
                        Define a custom passkey string (e.g. PASS-ALPHA or VIP-HEALTH). Automatically valid for all grade levels.
                      </p>
                    </div>
                  </div>

                  {createMsg && (
                    <div className={`p-3 rounded-lg text-xs font-medium ${
                      createMsg.type === 'success' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-rose-50 text-rose-900 border border-rose-200'
                    }`}>
                      {createMsg.text}
                    </div>
                  )}

                  <form onSubmit={handleCreateCode} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Passkey Code *
                      </label>
                      <input
                        type="text"
                        required
                        value={newCodeName}
                        onChange={(e) => setNewCodeName(e.target.value.toUpperCase())}
                        placeholder="e.g. PASS-ALPHA or VIP-2025"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold uppercase"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Administrative Notes / Tag (Optional)
                      </label>
                      <input
                        type="text"
                        value={newCodeNotes}
                        onChange={(e) => setNewCodeNotes(e.target.value)}
                        placeholder="e.g. Assigned to Dr. Bello"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                    </div>

                    <div className="sm:col-span-2 pt-1">
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-5 py-2.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
                      >
                        Create Custom Universal Passkey
                      </button>
                    </div>
                  </form>
                </div>

              </div>
            )}

            {/* TAB 4: COMPLIANCE AUDIT LOG OF DELETED PROFILES */}
            {activeTab === 'audit' && (
              <div className="flex-1 flex flex-col p-6 overflow-hidden space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-600 shrink-0">
                  <span>
                    Immutable compliance audit logs of deleted candidate user profiles. When candidates or admins delete a profile, this permanent audit copy is preserved.
                  </span>
                  <span className="font-bold text-slate-800">
                    Total Archived: {auditLogs.length} record(s)
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl bg-white shadow-xs">
                  {auditLogs.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 text-xs">
                      <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="font-semibold text-slate-700">No deleted user records in the audit log.</p>
                      <p className="text-slate-500 mt-1">
                        When candidate users delete their profile or an administrator removes them, an immutable compliance audit record will appear here.
                      </p>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="py-3 px-4">Deletion Time</th>
                          <th className="py-3 px-3">Candidate Particulars</th>
                          <th className="py-3 px-3">Deleted By</th>
                          <th className="py-3 px-3">Deletion Reason</th>
                          <th className="py-3 px-3">Passkey Used</th>
                          <th className="py-3 px-3">Archived Metrics</th>
                          <th className="py-3 px-4">Hardware ID</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {auditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                              {new Date(log.deletedAt).toLocaleString()}
                            </td>
                            <td className="py-3 px-3 font-bold text-slate-900">
                              {log.candidateName}
                              <span className="block font-mono text-[11px] text-slate-500 font-normal">
                                {log.candidateEmail}
                              </span>
                              {log.department && (
                                <span className="block text-[10px] text-slate-400 font-normal">
                                  {log.department} · {log.cadre}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              {log.deletedBy === 'candidate_self' ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
                                  Candidate Self-Deletion
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-200">
                                  Administrator
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-slate-700 italic max-w-xs truncate" title={log.deletionReason}>
                              {log.deletionReason || 'N/A'}
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-emerald-900">
                              {log.accessCode}
                            </td>
                            <td className="py-3 px-3">
                              <span className="text-slate-800 font-semibold block">
                                {log.totalPracticeSessions} session(s)
                              </span>
                              <span className="text-[11px] text-slate-500">
                                Best: {log.highestScore}%
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                              {log.hardwareId}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

          </div>
        )}

      </div>

      {/* ADMIN DELETE USER CONFIRMATION MODAL */}
      {userToDelete && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-xl bg-rose-100 border border-rose-300 text-rose-700 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 text-center">
              Delete Candidate User & Preserve Audit Copy
            </h3>

            <p className="text-xs text-slate-600 mt-2 text-center leading-relaxed">
              You are about to remove active candidate <strong>{userToDelete.fullName}</strong> (<span className="font-mono">{userToDelete.email}</span>) from the portal.
            </p>

            <div className="my-4 p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-950 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>Regulatory Audit Compliance Notice:</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                An immutable audit copy with candidate details, bound hardware ID [<code>{userToDelete.hardwareId}</code>], and session statistics ({userToDelete.totalPracticeSessions} attempts, best: {userToDelete.highestScore}%) will be permanently preserved in the compliance audit database.
              </p>
            </div>

            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Reason for Deletion
                </label>
                <input
                  type="text"
                  value={adminDeleteReason}
                  onChange={(e) => setAdminDeleteReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                  placeholder="e.g. Administrator removed user account"
                />
              </div>

              <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={deleteAssociatedKey}
                  onChange={(e) => setDeleteAssociatedKey(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                />
                <span>
                  Also permanently delete passkey (<strong>{userToDelete.accessCode}</strong>). If unchecked, passkey will be unlinked and ready for reassignment.
                </span>
              </label>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                disabled={isDeletingUser}
                className="flex-1 py-2.5 px-4 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUser}
                disabled={isDeletingUser}
                className="flex-1 py-2.5 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeletingUser ? 'Deleting...' : 'Confirm & Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
