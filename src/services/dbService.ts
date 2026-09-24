import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  AccessCodeRecord,
  RegisteredUserRecord,
  ExamSession,
  AuditDeletedProfileRecord,
} from '../types/exam';

const CODES_COLLECTION = 'access_codes';
const USERS_COLLECTION = 'registered_users';
const SESSIONS_COLLECTION = 'practice_sessions';
const AUDIT_COLLECTION = 'audit_deleted_profiles';

export interface ValidationResult {
  success: boolean;
  code: 'VALID' | 'INVALID_CODE' | 'DISABLED_KEY' | 'ALREADY_CLAIMED_BY_ANOTHER' | 'HARDWARE_MISMATCH_DENIED' | 'ERROR';
  message: string;
  codeRecord?: AccessCodeRecord;
  userRecord?: RegisteredUserRecord;
  isExistingUserSession?: boolean;
}

/**
 * Validates passkey access code with strict Canvas/Hardware Fingerprint binding.
 */
export async function validateAndClaimAccessCode(
  rawCode: string,
  userEmail: string,
  userName: string,
  hardwareId: string,
  hardwareMeta: { gpuRenderer?: string } = {}
): Promise<ValidationResult> {
  const code = rawCode.trim().toUpperCase();
  const normalizedEmail = userEmail.toLowerCase().trim();
  const userDocId = normalizedEmail.replace(/[^a-zA-Z0-9_-]/g, '_');

  if (!code) {
    return {
      success: false,
      code: 'INVALID_CODE',
      message: 'Please enter a valid passkey access code.',
    };
  }

  try {
    const codeRef = doc(db, CODES_COLLECTION, code);
    const codeSnap = await getDoc(codeRef);

    if (!codeSnap.exists()) {
      return {
        success: false,
        code: 'INVALID_CODE',
        message: `Passkey "${code}" is invalid or does not exist in the database. Please request a valid passkey from the administrator.`,
      };
    }

    const codeData = codeSnap.data() as AccessCodeRecord;

    // 1. Check if disabled by admin
    if (codeData.status === 'disabled') {
      return {
        success: false,
        code: 'DISABLED_KEY',
        message: 'This access passkey has been deactivated or disabled by the platform administrator.',
      };
    }

    const boundHid = codeData.boundHardwareId || codeData.boundDeviceId;
    const boundEmail = codeData.boundEmail ? codeData.boundEmail.toLowerCase().trim() : null;

    // 2. Check if already claimed
    if (boundHid) {
      const isSameHardware = boundHid === hardwareId;
      const isSameEmail = boundEmail === normalizedEmail;

      if (isSameHardware && isSameEmail) {
        return {
          success: true,
          code: 'VALID',
          message: 'Hardware fingerprint verified. Welcome back to the practice portal.',
          codeRecord: codeData,
          isExistingUserSession: true,
        };
      }

      if (!isSameHardware) {
        return {
          success: false,
          code: 'HARDWARE_MISMATCH_DENIED',
          message: `ACCESS DENIED (Hardware Mismatch): Passkey "${code}" is permanently bound to hardware [${boundHid}]. Access attempts from other machines, phones, or virtual browsers are strictly blocked.`,
        };
      }

      if (!isSameEmail) {
        return {
          success: false,
          code: 'ALREADY_CLAIMED_BY_ANOTHER',
          message: `ACCESS DENIED: Passkey "${code}" has already been claimed by candidate account (${boundEmail}). Each passkey can only be claimed once.`,
        };
      }
    }

    // 3. Check if the user's email was already registered to a different hardware
    const userRef = doc(db, USERS_COLLECTION, userDocId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const existingUser = userSnap.data() as RegisteredUserRecord;
      if (existingUser.hardwareId && existingUser.hardwareId !== hardwareId) {
        return {
          success: false,
          code: 'HARDWARE_MISMATCH_DENIED',
          message: `ACCESS DENIED: Account (${normalizedEmail}) is registered to hardware [${existingUser.hardwareId}]. Accessing from a different physical machine [${hardwareId}] is blocked.`,
        };
      }
    }

    // 4. Claim key once and bind hardware ID + email permanently
    const now = Date.now();
    await updateDoc(codeRef, {
      boundHardwareId: hardwareId,
      boundDeviceId: hardwareId,
      boundEmail: normalizedEmail,
      boundUserName: userName.trim(),
      usedCount: (codeData.usedCount || 0) + 1,
      activatedAt: now,
      keyStatus: 'claimed',
      gpuRenderer: hardwareMeta.gpuRenderer || 'Generic GPU',
    });

    codeData.boundHardwareId = hardwareId;
    codeData.boundDeviceId = hardwareId;
    codeData.boundEmail = normalizedEmail;
    codeData.boundUserName = userName.trim();
    codeData.keyStatus = 'claimed';

    // 5. Store / update user profile in Firestore
    const userProfile: RegisteredUserRecord = {
      id: userDocId,
      email: normalizedEmail,
      fullName: userName.trim(),
      hardwareId: hardwareId,
      accessCode: code,
      registeredAt: userSnap.exists() ? (userSnap.data() as RegisteredUserRecord).registeredAt : now,
      lastActiveAt: now,
      totalPracticeSessions: userSnap.exists() ? (userSnap.data() as RegisteredUserRecord).totalPracticeSessions || 0 : 0,
      highestScore: userSnap.exists() ? (userSnap.data() as RegisteredUserRecord).highestScore || 0 : 0,
      gpuRenderer: hardwareMeta.gpuRenderer || '',
    };

    await setDoc(userRef, userProfile);

    return {
      success: true,
      code: 'VALID',
      message: 'One-time registration complete. Passkey successfully claimed and bound to your hardware fingerprint.',
      codeRecord: codeData,
      userRecord: userProfile,
      isExistingUserSession: false,
    };
  } catch (err: any) {
    console.error('Validation error:', err);
    return {
      success: false,
      code: 'ERROR',
      message: 'Database connection issue: ' + (err.message || 'Could not verify code.'),
    };
  }
}

/**
 * Checks if the current machine has an active session in local storage and validates it against Firestore.
 */
export async function verifyCurrentDeviceAutoLogin(
  storedEmail: string,
  storedCode: string,
  currentHardwareId: string
): Promise<{ valid: boolean; user?: RegisteredUserRecord; codeRecord?: AccessCodeRecord; reason?: string }> {
  try {
    const userDocId = storedEmail.toLowerCase().trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    const userRef = doc(db, USERS_COLLECTION, userDocId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return { valid: false, reason: 'User account not found in database.' };
    }

    const userData = userSnap.data() as RegisteredUserRecord;

    // Check hardware ID match
    if (userData.hardwareId !== currentHardwareId) {
      return {
        valid: false,
        reason: `Hardware ID mismatch. Registered machine [${userData.hardwareId}] does not match current physical machine [${currentHardwareId}].`,
      };
    }

    // Check code status
    const codeRef = doc(db, CODES_COLLECTION, storedCode.toUpperCase());
    const codeSnap = await getDoc(codeRef);
    if (!codeSnap.exists()) {
      return { valid: false, reason: 'Associated passkey no longer exists.' };
    }

    const codeData = codeSnap.data() as AccessCodeRecord;
    if (codeData.status === 'disabled') {
      return { valid: false, reason: 'Associated passkey has been deactivated by administrator.' };
    }

    return {
      valid: true,
      user: userData,
      codeRecord: codeData,
    };
  } catch (err: any) {
    return { valid: false, reason: err.message };
  }
}

/**
 * Candidate User Self-Deletion:
 * Deletes the active user record from registered_users,
 * preserves an immutable audit copy in `audit_deleted_profiles`,
 * and unlinks the passkey from this device so the key can be reassigned or archived.
 */
export async function candidateDeleteProfile(
  email: string,
  hardwareId: string,
  reason: string = 'Candidate self-requested profile deletion'
): Promise<{ success: boolean; message: string }> {
  const normalizedEmail = email.toLowerCase().trim();
  const userDocId = normalizedEmail.replace(/[^a-zA-Z0-9_-]/g, '_');

  try {
    const userRef = doc(db, USERS_COLLECTION, userDocId);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.exists() ? (userSnap.data() as RegisteredUserRecord) : null;

    const accessCode = userData?.accessCode;

    // 1. Create permanent immutable compliance audit record
    const auditDocId = `audit_${userDocId}_${Date.now()}`;
    const auditRef = doc(db, AUDIT_COLLECTION, auditDocId);
    const auditRecord: AuditDeletedProfileRecord = {
      id: auditDocId,
      candidateEmail: normalizedEmail,
      candidateName: userData?.fullName || 'Candidate',
      department: userData?.department || '',
      cadre: userData?.cadre || '',
      hardwareId: hardwareId || userData?.hardwareId || 'N/A',
      accessCode: accessCode || 'N/A',
      totalPracticeSessions: userData?.totalPracticeSessions || 0,
      highestScore: userData?.highestScore || 0,
      registeredAt: userData?.registeredAt || 0,
      deletedAt: Date.now(),
      deletedBy: 'candidate_self',
      deletionReason: reason,
      action: 'PROFILE_DELETED_AUDIT_PRESERVED',
    };
    await setDoc(auditRef, auditRecord);

    // 2. Unlink passkey hardware lock so key is not orphaned
    if (accessCode) {
      await adminUnlinkDevice(accessCode);
    }

    // 3. Delete active profile from registered_users
    await deleteDoc(userRef);

    return {
      success: true,
      message: 'Your active profile has been removed from this device. An immutable audit record has been archived.',
    };
  } catch (err: any) {
    console.error('Candidate deletion error:', err);
    return {
      success: false,
      message: err.message || 'Could not delete profile. Please check network connection.',
    };
  }
}

/**
 * Administrator: Delete candidate user from the portal.
 * Preserves compliance audit copy in `audit_deleted_profiles` and frees or unlinks passkey.
 */
export async function adminDeleteUser(
  email: string,
  options: {
    deleteAssociatedPasskey?: boolean;
    reason?: string;
  } = {}
): Promise<{ success: boolean; message: string }> {
  const normalizedEmail = email.toLowerCase().trim();
  const userDocId = normalizedEmail.replace(/[^a-zA-Z0-9_-]/g, '_');

  try {
    const userRef = doc(db, USERS_COLLECTION, userDocId);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.exists() ? (userSnap.data() as RegisteredUserRecord) : null;

    const accessCode = userData?.accessCode;

    // 1. Create permanent immutable compliance audit record
    const auditDocId = `audit_${userDocId}_${Date.now()}`;
    const auditRef = doc(db, AUDIT_COLLECTION, auditDocId);
    const auditRecord: AuditDeletedProfileRecord = {
      id: auditDocId,
      candidateEmail: normalizedEmail,
      candidateName: userData?.fullName || 'Candidate',
      department: userData?.department || '',
      cadre: userData?.cadre || '',
      hardwareId: userData?.hardwareId || 'N/A',
      accessCode: accessCode || 'N/A',
      totalPracticeSessions: userData?.totalPracticeSessions || 0,
      highestScore: userData?.highestScore || 0,
      registeredAt: userData?.registeredAt || 0,
      deletedAt: Date.now(),
      deletedBy: 'admin',
      deletionReason: options.reason || 'Administrator removed user account from portal',
      action: 'ADMIN_DELETED_USER_AUDIT_PRESERVED',
    };
    await setDoc(auditRef, auditRecord);

    // 2. Either delete passkey completely or unlink hardware binding
    if (accessCode) {
      if (options.deleteAssociatedPasskey) {
        await adminDeleteCode(accessCode);
      } else {
        await adminUnlinkDevice(accessCode);
      }
    }

    // 3. Delete active profile from registered_users
    await deleteDoc(userRef);

    return {
      success: true,
      message: `Candidate account (${normalizedEmail}) deleted successfully. Audit trail preserved.`,
    };
  } catch (err: any) {
    console.error('Admin user deletion error:', err);
    return {
      success: false,
      message: err.message || 'Failed to delete user.',
    };
  }
}

/**
 * Admin: Fetch all audit logs for deleted candidate accounts
 */
export async function adminFetchAuditLog(): Promise<AuditDeletedProfileRecord[]> {
  try {
    const snap = await getDocs(collection(db, AUDIT_COLLECTION));
    const list: AuditDeletedProfileRecord[] = [];
    snap.forEach((d) => list.push(d.data() as AuditDeletedProfileRecord));
    return list.sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));
  } catch (err) {
    console.error('Error fetching audit log:', err);
    return [];
  }
}

/**
 * Admin: Create a new access code (Universal for all levels)
 */
export async function adminCreateAccessCode(
  code: string,
  options: {
    notes?: string;
  } = {}
): Promise<{ success: boolean; message: string }> {
  const formattedCode = code.trim().toUpperCase();
  if (!formattedCode) {
    return { success: false, message: 'Passkey code cannot be empty.' };
  }

  try {
    const codeRef = doc(db, CODES_COLLECTION, formattedCode);
    const existing = await getDoc(codeRef);
    if (existing.exists()) {
      return { success: false, message: `Passkey "${formattedCode}" already exists in the database.` };
    }

    const record: AccessCodeRecord = {
      id: formattedCode,
      code: formattedCode,
      createdAt: Date.now(),
      status: 'active',
      keyStatus: 'unclaimed',
      usedCount: 0,
      boundHardwareId: null,
      boundDeviceId: null,
      boundEmail: null,
      boundUserName: null,
      assignedGradeLevel: 'ANY',
      notes: options.notes || '',
    };

    await setDoc(codeRef, record);
    return { success: true, message: `Passkey "${formattedCode}" created successfully (Valid for all grade levels).` };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to create passkey.' };
  }
}

/**
 * Admin: Generate batch random universal access codes
 */
export async function adminBatchGenerateCodes(count: number = 5): Promise<string[]> {
  const generated: string[] = [];
  for (let i = 0; i < count; i++) {
    const rand = Math.floor(1000 + Math.random() * 9000);
    const code = `PASS-${rand}`;

    const res = await adminCreateAccessCode(code, {
      notes: `Batch generated on ${new Date().toLocaleDateString()}`,
    });
    if (res.success) {
      generated.push(code);
    }
  }
  return generated;
}

/**
 * Admin: Update code status (active / disabled)
 */
export async function adminToggleCodeStatus(code: string, newStatus: 'active' | 'disabled') {
  const codeRef = doc(db, CODES_COLLECTION, code);
  await updateDoc(codeRef, { status: newStatus });
}

/**
 * Admin: Unlink / Reset hardware binding for an access code
 */
export async function adminUnlinkDevice(code: string) {
  const codeRef = doc(db, CODES_COLLECTION, code);
  await updateDoc(codeRef, {
    boundHardwareId: null,
    boundDeviceId: null,
    boundEmail: null,
    boundUserName: null,
    keyStatus: 'unclaimed',
    usedCount: 0,
    activatedAt: null,
  });
}

/**
 * Admin: Delete an access code
 */
export async function adminDeleteCode(code: string) {
  const codeRef = doc(db, CODES_COLLECTION, code);
  await deleteDoc(codeRef);
}

/**
 * Admin: Clear all mock/test data from Firestore (Passkeys, Registered Users, Practice Sessions)
 */
export async function adminClearAllMockData(): Promise<{ success: boolean; message: string }> {
  try {
    const codesSnap = await getDocs(collection(db, CODES_COLLECTION));
    const usersSnap = await getDocs(collection(db, USERS_COLLECTION));
    const sessionsSnap = await getDocs(collection(db, SESSIONS_COLLECTION));
    const auditSnap = await getDocs(collection(db, AUDIT_COLLECTION));

    const batch = writeBatch(db);

    codesSnap.forEach((d) => batch.delete(d.ref));
    usersSnap.forEach((d) => batch.delete(d.ref));
    sessionsSnap.forEach((d) => batch.delete(d.ref));
    auditSnap.forEach((d) => batch.delete(d.ref));

    await batch.commit();

    return {
      success: true,
      message: `Database purged. Removed ${codesSnap.size} codes, ${usersSnap.size} users, and ${sessionsSnap.size} test sessions. Platform is clean and ready for production.`,
    };
  } catch (err: any) {
    console.error('Error clearing test data:', err);
    return {
      success: false,
      message: 'Failed to clear database: ' + (err.message || 'Unknown error'),
    };
  }
}

/**
 * Admin: Fetch all access codes with hardware details
 */
export async function adminFetchAllCodes(): Promise<AccessCodeRecord[]> {
  try {
    const snap = await getDocs(collection(db, CODES_COLLECTION));
    const list: AccessCodeRecord[] = [];
    snap.forEach((d) => {
      const data = d.data() as AccessCodeRecord;
      if (!data.keyStatus) {
        if (data.status === 'disabled') data.keyStatus = 'disabled';
        else if (data.boundHardwareId || data.boundDeviceId) data.keyStatus = 'claimed';
        else data.keyStatus = 'unclaimed';
      }
      list.push(data);
    });
    return list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } catch (err) {
    console.error('Error fetching codes:', err);
    return [];
  }
}

/**
 * Admin: Fetch all registered users
 */
export async function adminFetchAllUsers(): Promise<RegisteredUserRecord[]> {
  try {
    const snap = await getDocs(collection(db, USERS_COLLECTION));
    const list: RegisteredUserRecord[] = [];
    snap.forEach((d) => list.push(d.data() as RegisteredUserRecord));
    return list.sort((a, b) => (b.lastActiveAt || 0) - (a.lastActiveAt || 0));
  } catch (err) {
    console.error('Error fetching users:', err);
    return [];
  }
}

/**
 * Record a completed practice session in Firestore
 */
export async function savePracticeSession(session: ExamSession) {
  try {
    const sessionRef = doc(collection(db, SESSIONS_COLLECTION));
    const scorePct = Math.round((session.score / session.totalQuestions) * 100);

    await setDoc(sessionRef, {
      id: sessionRef.id,
      candidateEmail: session.candidate.email,
      candidateName: session.candidate.fullName,
      department: session.candidate.department,
      cadre: session.candidate.cadre,
      gradeLevel: session.candidate.gradeLevel,
      accessCode: session.candidate.accessCode,
      hardwareId: session.candidate.hardwareId || 'N/A',
      score: session.score,
      totalQuestions: session.totalQuestions,
      percentage: scorePct,
      timeSpentSeconds: session.totalTimeSpentSeconds,
      infractionsCount: session.infractions.length,
      infractions: session.infractions,
      categoryBreakdown: session.categoryBreakdown,
      completedAt: Date.now(),
      submissionType: session.submissionType,
    });

    // Update user stats
    const userDocId = session.candidate.email.toLowerCase().trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    const userRef = doc(db, USERS_COLLECTION, userDocId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const uData = userSnap.data() as RegisteredUserRecord;
      await updateDoc(userRef, {
        totalPracticeSessions: (uData.totalPracticeSessions || 0) + 1,
        highestScore: Math.max(uData.highestScore || 0, scorePct),
        lastActiveAt: Date.now(),
      });
    }
  } catch (err) {
    console.error('Failed to log practice session:', err);
  }
}
