import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  reauthenticateWithPopup,
  EmailAuthProvider,
  reauthenticateWithCredential,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  collection,
  getDocs,
  query,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../lib/firebase';
import type { UserProfile, UserRole } from '../types';
import { logAudit } from '../services/auditService';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  currentUser: UserProfile | null;
  loading: boolean;
  authLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  isDoctor: boolean;
  isHealthWorker: boolean;
  isAdmin: boolean;
  isPatient: boolean;
  isPending: boolean;
  canOverrideRisk: boolean;
  canEditGuidelines: boolean;
  canAddClinicalVisit: boolean;
  canAddReading: boolean;
  canRegisterPatient: boolean;
  canManageUsers: boolean;
  assignedVillages: string[];
  linkPatientRecord: (linkCode: string) => Promise<{ success: boolean; message: string }>;
  promptReauth: (reason: string, onAuthorized: () => void) => void;
  reauthModalOpen: boolean;
  reauthReason: string;
  cancelReauth: () => void;
  performReauthWithPassword: (password: string) => Promise<boolean>;
  performReauthWithGoogle: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Re-authentication state for sensitive actions
  const [reauthModalOpen, setReauthModalOpen] = useState(false);
  const [reauthReason, setReauthReason] = useState('');
  const pendingActionRef = useRef<(() => void) | null>(null);

  // Inactivity tracking
  const inactivityTimerRef = useRef<any>(null);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    if (auth.currentUser) {
      inactivityTimerRef.current = setTimeout(async () => {
        console.warn('[SwasthaSetu] Inactivity timeout reached (15m). Auto signing out.');
        if (auth.currentUser && userProfile) {
          await logAudit({
            userId: userProfile.id,
            userName: userProfile.name,
            userRole: userProfile.role,
            action: 'signin',
            resource: 'system',
            details: 'User automatically signed out due to 15 minutes of inactivity.',
          });
        }
        await firebaseSignOut(auth);
      }, INACTIVITY_TIMEOUT_MS);
    }
  }, [userProfile]);

  useEffect(() => {
    const events = ['pointerdown', 'keydown', 'scroll', 'touchstart'];
    const handleActivity = () => resetInactivityTimer();

    events.forEach((evt) => window.addEventListener(evt, handleActivity));
    resetInactivityTimer();

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handleActivity));
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [resetInactivityTimer]);

  // Auth State Listener
  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (!user) {
        setUserProfile(null);
        setLoading(false);
        return;
      }

      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          // Bootstrap logic:
          // If this is the developer email (ganavihv2005@gmail.com) OR first user in database -> admin!
          // Else -> pending staff
          let assignedRole: UserRole = 'pending';
          const isDevEmail = user.email === 'ganavihv2005@gmail.com';

          if (isDevEmail) {
            assignedRole = 'admin';
          } else {
            const allUsersSnap = await getDocs(query(collection(db, 'users'), limit(2)));
            if (allUsersSnap.empty) {
              assignedRole = 'admin'; // First account bootstrap
            }
          }

          const newProfile: UserProfile = {
            id: user.uid,
            email: user.email || '',
            name: user.displayName || user.email?.split('@')[0] || 'Health Staff',
            role: assignedRole,
            status: assignedRole === 'admin' ? 'active' : 'pending',
            assignedVillages: assignedRole === 'admin' ? ['all'] : [],
            language: 'en',
            createdAt: new Date().toISOString(),
          };

          await setDoc(userRef, newProfile);
          setUserProfile(newProfile);

          await logAudit({
            userId: user.uid,
            userName: newProfile.name,
            userRole: newProfile.role,
            action: 'signin',
            resource: 'user',
            resourceId: user.uid,
            details: `New account registered. Role: ${assignedRole} (Status: ${newProfile.status})`,
          });
        }

        // Real-time listener for user document changes (instant role assignment by admin)
        unsubscribeProfile = onSnapshot(
          userRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const profile = docSnap.data() as UserProfile;
              setUserProfile(profile);
            }
            setLoading(false);
          },
          (error) => {
            handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
          }
        );
      } catch (err) {
        console.error('Failed to initialize user profile:', err);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  // Sign In with Google
  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      if (cred.user) {
        await logAudit({
          userId: cred.user.uid,
          userName: cred.user.displayName || cred.user.email || 'Google User',
          userRole: 'pending',
          action: 'signin',
          resource: 'system',
          details: `User signed in with Google Authentication (${cred.user.email})`,
        });
      }
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Sign In with Email
  const signInWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      if (cred.user) {
        await logAudit({
          userId: cred.user.uid,
          userName: cred.user.displayName || cred.user.email || 'Email User',
          userRole: 'pending',
          action: 'signin',
          resource: 'system',
          details: `User signed in with Email & Password (${cred.user.email})`,
        });
      }
    } catch (err: any) {
      console.error('Email Sign-In failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Register with Email
  const registerWithEmail = async (email: string, pass: string, name: string) => {
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      const user = cred.user;

      // Determine initial role
      let initialRole: UserRole = 'pending';
      if (email === 'ganavihv2005@gmail.com') {
        initialRole = 'admin';
      } else {
        const usersSnap = await getDocs(query(collection(db, 'users'), limit(1)));
        if (usersSnap.empty) {
          initialRole = 'admin';
        }
      }

      const profile: UserProfile = {
        id: user.uid,
        email: user.email || email,
        name: name.trim() || email.split('@')[0],
        role: initialRole,
        status: initialRole === 'admin' ? 'active' : 'pending',
        assignedVillages: initialRole === 'admin' ? ['all'] : [],
        language: 'en',
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'users', user.uid), profile);
      setUserProfile(profile);

      await logAudit({
        userId: user.uid,
        userName: profile.name,
        userRole: profile.role,
        action: 'signin',
        resource: 'user',
        resourceId: user.uid,
        details: `Registered new account ${email} as ${initialRole}.`,
      });
    } catch (err: any) {
      console.error('Email registration failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Sign Out
  const signOut = async () => {
    if (userProfile) {
      await logAudit({
        userId: userProfile.id,
        userName: userProfile.name,
        userRole: userProfile.role,
        action: 'signin',
        resource: 'system',
        details: `${userProfile.name} signed out.`,
      });
    }
    await firebaseSignOut(auth);
    setUserProfile(null);
  };

  // Patient Record Linking using 7-day link code
  const linkPatientRecord = async (linkCode: string): Promise<{ success: boolean; message: string }> => {
    if (!firebaseUser || !userProfile) {
      return { success: false, message: 'You must be signed in to link a patient record.' };
    }

    try {
      const codeTrimmed = linkCode.trim().toUpperCase();
      const patientsRef = collection(db, 'patients');
      const snap = await getDocs(patientsRef);

      const now = new Date().toISOString();
      let matchedPatientId: string | null = null;
      let matchedPatientName = '';

      snap.forEach((d) => {
        const p = d.data();
        if (p.linkCode && p.linkCode.toUpperCase() === codeTrimmed) {
          if (p.linkCodeExpiresAt && p.linkCodeExpiresAt >= now) {
            matchedPatientId = d.id;
            matchedPatientName = p.name;
          }
        }
      });

      if (!matchedPatientId) {
        return {
          success: false,
          message: 'Invalid or expired link code. Please check the 6-digit code or ask your ASHA for a new code.',
        };
      }

      // Link patient to user
      await updateDoc(doc(db, 'users', firebaseUser.uid), {
        role: 'patient',
        status: 'active',
        linkedPatientId: matchedPatientId,
        updatedAt: now,
      });

      // Update patient doc
      await updateDoc(doc(db, 'patients', matchedPatientId), {
        linkedUserId: firebaseUser.uid,
        updatedAt: now,
      });

      await logAudit({
        userId: firebaseUser.uid,
        userName: userProfile.name,
        userRole: 'patient',
        action: 'link_patient',
        resource: 'patient',
        resourceId: matchedPatientId,
        details: `Linked patient record (${matchedPatientName}) to user account (${userProfile.email}) using link code.`,
      });

      return {
        success: true,
        message: `Successfully linked record for ${matchedPatientName}! Welcome to your personal health portal.`,
      };
    } catch (err: any) {
      console.error('Failed to link patient:', err);
      return { success: false, message: err.message || 'Error linking patient record.' };
    }
  };

  // Re-authentication handling
  const promptReauth = (reason: string, onAuthorized: () => void) => {
    setReauthReason(reason);
    pendingActionRef.current = onAuthorized;
    setReauthModalOpen(true);
  };

  const cancelReauth = () => {
    setReauthModalOpen(false);
    pendingActionRef.current = null;
    setReauthReason('');
  };

  const performReauthWithPassword = async (password: string): Promise<boolean> => {
    if (!firebaseUser || !firebaseUser.email) return false;
    try {
      const cred = EmailAuthProvider.credential(firebaseUser.email, password);
      await reauthenticateWithCredential(firebaseUser, cred);
      setReauthModalOpen(false);
      if (pendingActionRef.current) {
        pendingActionRef.current();
        pendingActionRef.current = null;
      }
      return true;
    } catch (err) {
      console.error('Password re-authentication failed:', err);
      return false;
    }
  };

  const performReauthWithGoogle = async (): Promise<boolean> => {
    if (!firebaseUser) return false;
    try {
      await reauthenticateWithPopup(firebaseUser, googleProvider);
      setReauthModalOpen(false);
      if (pendingActionRef.current) {
        pendingActionRef.current();
        pendingActionRef.current = null;
      }
      return true;
    } catch (err) {
      console.error('Google re-authentication failed:', err);
      return false;
    }
  };

  const role = userProfile?.role || 'pending';
  const status = userProfile?.status || 'pending';
  const isActive = status === 'active';

  const isDoctor = role === 'doctor' && isActive;
  const isHealthWorker = role === 'healthWorker' && isActive;
  const isAdmin = role === 'admin' && isActive;
  const isPatient = role === 'patient' && isActive;
  const isPending = role === 'pending' || status === 'pending';

  const value: AuthContextType = {
    firebaseUser,
    userProfile,
    currentUser: userProfile,
    loading,
    authLoading: loading,
    signInWithGoogle,
    signInWithEmail,
    registerWithEmail,
    signOut,
    isDoctor,
    isHealthWorker,
    isAdmin,
    isPatient,
    isPending,
    canOverrideRisk: isDoctor,
    canEditGuidelines: isAdmin,
    canAddClinicalVisit: isDoctor || isHealthWorker,
    canAddReading: isDoctor || isHealthWorker || isPatient,
    canRegisterPatient: isDoctor || isHealthWorker,
    canManageUsers: isAdmin,
    assignedVillages: userProfile?.assignedVillages || [],
    linkPatientRecord,
    promptReauth,
    reauthModalOpen,
    reauthReason,
    cancelReauth,
    performReauthWithPassword,
    performReauthWithGoogle,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
