import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signOut as fbSignOut, 
  onAuthStateChanged,
  type User 
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import config from '../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId,
};

// Initialize Firebase App
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = config.firestoreDatabaseId
  ? getFirestore(app, config.firestoreDatabaseId)
  : getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Conservative mobile / tablet browser capability detection
export function isMobileOrTablet(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i;
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isIPadOS = /macintosh/i.test(ua) && isTouchDevice && navigator.maxTouchPoints > 1;

  return mobileRegex.test(ua) || isIPadOS;
}

// Google Sign-In helper: Desktop uses popup, Mobile/Tablet uses redirect
export async function signInWithGoogle(): Promise<User | null> {
  if (isMobileOrTablet()) {
    // Mobile browsers frequently block popup windows or drop popup openers; use redirect
    await signInWithRedirect(auth, googleProvider);
    return null;
  } else {
    // Desktop / Laptop continues with frictionless popup authentication
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  }
}

// Handle Google Auth redirect result (called once on startup)
let redirectPromise: Promise<User | null> | null = null;
export function handleRedirectResult(): Promise<User | null> {
  if (!redirectPromise) {
    redirectPromise = getRedirectResult(auth)
      .then((result) => (result ? result.user : null))
      .catch((err) => {
        console.warn('Google sign-in redirect error:', err?.code || err);
        throw err;
      });
  }
  return redirectPromise;
}

// Sign-Out helper
export async function signOutUser(): Promise<void> {
  await fbSignOut(auth);
}

// Helper to get current user ID token
export async function getCurrentIdToken(forceRefresh = false): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    const token = await user.getIdToken(forceRefresh);
    if (!token || typeof token !== 'string') return null;
    const trimmed = token.trim();
    if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') return null;
    const parts = trimmed.split('.');
    if (parts.length !== 3 || parts.some((p) => p.length === 0)) return null;
    return trimmed;
  } catch {
    return null;
  }
}

export { onAuthStateChanged, type User };
export { sanitizeFirestoreData, sanitizeEntryLocation } from './utils/firestoreSanitizer';
