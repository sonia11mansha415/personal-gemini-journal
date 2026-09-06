import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { 
  auth, 
  db,
  signInWithGoogle, 
  handleRedirectResult,
  signOutUser, 
  onAuthStateChanged, 
  User,
  sanitizeFirestoreData,
  sanitizeEntryLocation
} from './firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  getDocs, 
  collection, 
  query, 
  orderBy,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  deleteField
} from 'firebase/firestore';
import { Navbar, AppTab } from './components/Navbar';
import { JournalEditor } from './components/JournalEditor';
import { ReflectionPanel } from './components/ReflectionPanel';
import { HistorySidebar } from './components/HistorySidebar';
import { JournalLibraryView } from './components/JournalLibraryView';
import { UnauthenticatedView } from './components/UnauthenticatedView';
import { AuthenticatedHomeView } from './components/AuthenticatedHomeView';
import { DiscoverView } from './components/DiscoverView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PenLine, BookOpen, Plus } from 'lucide-react';
import { authenticatedFetch } from './api/authClient';
import { deduplicateMessages, cleanReflectionProse } from './utils/reflectionSanitizer';
import { 
  JournalEntry, 
  ReflectionLens, 
  MemoryContract, 
  UserPreferences, 
  UserProfile,
  ReflectionMessage,
  MemoryReceipt,
  OpeningQuestion,
  ThemePreferences
} from './types';
import { resolveEffectiveTheme } from './theme/moodThemes';

// Lazy load remaining heavy views for bundle optimization
const LivingMemoryView = lazy(() => import('./components/LivingMemoryView').then((m) => ({ default: m.LivingMemoryView })));
const InsightsView = lazy(() => import('./components/InsightsView').then((m) => ({ default: m.InsightsView })));
const CareerWinsView = lazy(() => import('./components/CareerWinsView').then((m) => ({ default: m.CareerWinsView })));
const MemoryMapView = lazy(() => import('./components/MemoryMapView').then((m) => ({ default: m.MemoryMapView })));
const SettingsView = lazy(() => import('./components/SettingsView').then((m) => ({ default: m.SettingsView })));
const MemoryReceiptModal = lazy(() => import('./components/MemoryReceiptModal').then((m) => ({ default: m.MemoryReceiptModal })));
const OnboardingModal = lazy(() => import('./components/OnboardingModal').then((m) => ({ default: m.OnboardingModal })));

const defaultPreferences: UserPreferences = {
  enabledLenses: ['PERSONAL', 'PROFESSIONAL', 'IDENTITY_AND_GROWTH'],
  defaultLens: 'PERSONAL',
  defaultMemoryContract: 'MAY_CONNECT',
  onboardingCompleted: false,
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [journalMode, setJournalMode] = useState<'write' | 'library'>('write');
  
  // User Profile / Preferences
  const [authError, setAuthError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [previewTheme, setPreviewTheme] = useState<ThemePreferences | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Journal State
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);
  const [openingQuestions, setOpeningQuestions] = useState<OpeningQuestion[]>([]);
  const [activeReceipt, setActiveReceipt] = useState<MemoryReceipt | null>(null);

  const [activeEntry, setActiveEntry] = useState<Partial<JournalEntry>>({
    title: '',
    content: '',
    lens: 'PERSONAL',
    memoryContract: 'MAY_CONNECT',
    tags: [],
    favorite: false,
    mood: 'peaceful',
    messages: [],
  });

  // Saving & Reflection State
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isReflecting, setIsReflecting] = useState(false);
  const [reflectionError, setReflectionError] = useState<string | null>(null);

  // Incremental history loading state
  const [hasMoreEntries, setHasMoreEntries] = useState(false);
  const [lastVisibleDoc, setLastVisibleDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (currentUser) {
        setActiveTab('home');
        await loadUserProfile();
        await loadEntries();
      } else {
        setEntries([]);
        setHasMoreEntries(false);
        setLastVisibleDoc(null);
        setActiveTab('home');
        setActiveEntry({
          title: '',
          content: '',
          lens: 'PERSONAL',
          memoryContract: 'MAY_CONNECT',
          tags: [],
          favorite: false,
          mood: 'peaceful',
          messages: [],
        });
      }
    });
    return () => unsubscribe();
  }, []);

  // Process redirect result if returning from mobile Google authentication
  useEffect(() => {
    handleRedirectResult().catch((err: any) => {
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        return;
      }
      console.warn('Google sign-in redirect issue:', err?.code || 'redirect_issue');
      setAuthError("We couldn't complete Google sign-in. Please try again.");
    });
  }, []);

  // Centralized Google sign-in handler with user-friendly error formatting
  const handleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        return;
      }
      console.warn('Google sign-in issue:', err?.code || 'auth_issue');
      setAuthError("We couldn't complete Google sign-in. Please try again.");
    }
  };

  // Load User Profile from Firestore
  const loadUserProfile = async () => {
    if (!auth.currentUser) return;
    try {
      const userDocRef = doc(db, 'users', auth.currentUser.uid);
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data.preferences) {
          setPreferences(data.preferences);
          if (!data.preferences.onboardingCompleted) {
            setShowOnboarding(true);
          }
        }
      } else {
        const initialProfile: UserProfile = {
          uid: auth.currentUser.uid,
          email: auth.currentUser.email || null,
          displayName: auth.currentUser.displayName || null,
          photoURL: auth.currentUser.photoURL || null,
          preferences: defaultPreferences,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await setDoc(userDocRef, initialProfile);
      }
    } catch (err) {
      console.error('Failed to load user profile from Firestore', err);
    }
  };

  // Load Entries from Firestore (bounded initial load for performance)
  const loadEntries = async () => {
    if (!auth.currentUser) return;
    setIsLoadingEntries(true);
    try {
      const entriesRef = collection(db, 'users', auth.currentUser.uid, 'entries');
      const q = query(entriesRef, orderBy('createdAt', 'desc'), limit(50));
      const snap = await getDocs(q);
      const loaded: JournalEntry[] = snap.docs
        .map((d) => ({
          id: d.id,
          ...d.data(),
        } as JournalEntry))
        .filter((e) => !(e as any).isTemporary);
      setEntries(loaded);
      setLastVisibleDoc(snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null);
      setHasMoreEntries(snap.docs.length === 50);
      loadOpeningQuestions(loaded);

      // If active entry has no id and there are existing entries, select the newest
      if (loaded.length > 0 && !activeEntry.id) {
        setActiveEntry(loaded[0]);
      }
    } catch (err) {
      console.error('Failed to load journal entries from Firestore', err);
    } finally {
      setIsLoadingEntries(false);
    }
  };

  // Load older entries incrementally
  const loadMoreEntries = async () => {
    if (!auth.currentUser || !lastVisibleDoc || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const entriesRef = collection(db, 'users', auth.currentUser.uid, 'entries');
      const q = query(entriesRef, orderBy('createdAt', 'desc'), startAfter(lastVisibleDoc), limit(50));
      const snap = await getDocs(q);
      const older: JournalEntry[] = snap.docs
        .map((d) => ({
          id: d.id,
          ...d.data(),
        } as JournalEntry))
        .filter((e) => !(e as any).isTemporary);
      setEntries((prev) => [...prev, ...older]);
      setLastVisibleDoc(snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null);
      setHasMoreEntries(snap.docs.length === 50);
    } catch (err) {
      console.error('Failed to load older journal entries', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Load Opening Questions from Backend
  const loadOpeningQuestions = async (entriesOverride?: JournalEntry[]) => {
    if (!auth.currentUser) return;
    try {
      const pool = entriesOverride || entries;
      const res = await authenticatedFetch('/api/journal/opening-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ entries: pool.slice(0, 10) }),
      });
      if (res && res.ok) {
        const data = await res.json();
        if (Array.isArray(data.questions)) {
          setOpeningQuestions(data.questions);
        }
      }
    } catch {
      // Graceful fallback
    }
  };

  // Save Preferences to Firestore
  const handleSavePreferences = async (newPrefs: UserPreferences) => {
    if (!auth.currentUser) return;
    try {
      const userDocRef = doc(db, 'users', auth.currentUser.uid);
      await setDoc(
        userDocRef,
        {
          preferences: newPrefs,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      setPreferences(newPrefs);
    } catch (err) {
      console.error('Failed to update preferences', err);
      throw err;
    }
  };

  // Delete All Journal Data handler
  const handleDeleteAllData = async () => {
    setEntries([]);
    setActiveEntry({
      title: '',
      content: '',
      lens: preferences.defaultLens || 'PERSONAL',
      memoryContract: preferences.defaultMemoryContract || 'MAY_CONNECT',
      tags: [],
      favorite: false,
      mood: 'peaceful',
      messages: [],
    });
    setOpeningQuestions([]);
    setActiveTab('home');
  };


  // Create or Update Entry (With Zero Data Loss)
  const handleSaveEntry = async (entryData: Partial<JournalEntry>): Promise<boolean> => {
    if (!auth.currentUser) {
      setSaveError('Session expired. Please sign in again.');
      return false;
    }

    if (!entryData.content || !entryData.content.trim()) {
      return false;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const entryId = entryData.id || doc(collection(db, 'users', auth.currentUser.uid, 'entries')).id;
      const isNewEntry = !entryData.id;
      const now = new Date().toISOString();

      const existingEntry = entries.find((e) => e.id === entryId);

      const title = (entryData.title !== undefined ? entryData.title : existingEntry?.title || '').trim();
      const content = entryData.content.trim();
      const lens = entryData.lens || existingEntry?.lens || preferences.defaultLens || 'PERSONAL';
      const memoryContract = entryData.memoryContract || existingEntry?.memoryContract || preferences.defaultMemoryContract || 'MAY_CONNECT';
      const tags = Array.isArray(entryData.tags)
        ? entryData.tags.map((t) => String(t).trim()).filter(Boolean)
        : existingEntry?.tags || [];
      const favorite = Boolean(entryData.favorite !== undefined ? entryData.favorite : existingEntry?.favorite);
      const mood = entryData.mood || existingEntry?.mood || 'peaceful';
      const messages = Array.isArray(entryData.messages) ? entryData.messages : existingEntry?.messages || [];
      const isVoice = Boolean(entryData.isVoice !== undefined ? entryData.isVoice : existingEntry?.isVoice);
      const createdAt = entryData.createdAt || existingEntry?.createdAt || now;

      // Handle optional location safely: never send undefined to Firestore
      const cleanLocation = sanitizeEntryLocation(entryData.location);

      const firestorePayload: Record<string, any> = {
        id: entryId,
        userId: auth.currentUser.uid,
        title,
        content,
        lens,
        memoryContract,
        tags,
        favorite,
        mood,
        messages,
        isVoice,
        createdAt,
        updatedAt: now,
      };

      if (cleanLocation) {
        firestorePayload.location = cleanLocation;
      } else if (!isNewEntry && existingEntry?.location) {
        // Explicitly remove existing location via Firestore deleteField() sentinel
        firestorePayload.location = deleteField();
      }
      // If no location exists on new or existing entry, the location field is completely OMITTED!

      if (entryData.inferredTone || existingEntry?.inferredTone) {
        firestorePayload.inferredTone = entryData.inferredTone || existingEntry?.inferredTone;
      }

      // Recursively sanitize to strictly ensure ZERO undefined values
      const sanitizedPayload = sanitizeFirestoreData(firestorePayload);

      const entryDocRef = doc(db, 'users', auth.currentUser.uid, 'entries', entryId);
      await setDoc(entryDocRef, sanitizedPayload, { merge: true });

      // In-memory entry state for React
      const fullEntry: JournalEntry = {
        id: entryId,
        userId: auth.currentUser.uid,
        title,
        content,
        lens,
        memoryContract,
        tags,
        favorite,
        mood,
        messages,
        isVoice,
        createdAt,
        updatedAt: now,
        ...(cleanLocation ? { location: cleanLocation } : {}),
      };

      // Update state with confirmed saved entry
      setActiveEntry(fullEntry);
      setEntries((prev) => {
        const filtered = prev.filter((e) => e.id !== fullEntry.id);
        const updated = [fullEntry, ...filtered];
        // Refresh opening questions in background
        loadOpeningQuestions(updated);
        return updated;
      });

      // Background sync to Living Memory server store
      if (auth.currentUser) {
        authenticatedFetch('/api/journal/entries/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ entry: sanitizeFirestoreData(fullEntry) }),
        }).catch(() => {});
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      return true;
    } catch (err: any) {
      console.error('Failed to save journal entry', err);
      setSaveError(
        'Save failed: ' + (err?.message || 'Could not persist to Firestore') +
        '. Your written text has been safely preserved.'
      );
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Entry from Server (enforces cascade deletion of messages & derived memories)
  const handleDeleteEntry = async (id: string) => {
    if (!auth.currentUser) return;
    if (!window.confirm('Are you sure you want to delete this moment? This cannot be undone.')) {
      return;
    }

    try {
      const res = await authenticatedFetch(`/api/journal/entries/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error('Failed to delete moment on server');
      }
      const remaining = entries.filter((e) => e.id !== id);
      setEntries(remaining);
      if (remaining.length > 0) {
        setActiveEntry(remaining[0]);
      } else {
        handleNewEntry();
      }
    } catch (err) {
      console.error('Failed to delete entry', err);
      alert('Could not delete moment. Please try again.');
    }
  };

  // Start fresh entry
  const handleNewEntry = (shouldFocus = true) => {
    setActiveEntry({
      title: '',
      content: '',
      lens: preferences.defaultLens || 'PERSONAL',
      memoryContract: preferences.defaultMemoryContract || 'MAY_CONNECT',
      tags: [],
      favorite: false,
      mood: 'peaceful',
      messages: [],
    });
    setSaveError(null);
    setSaveSuccess(false);
    setReflectionError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (shouldFocus) {
      setTimeout(() => {
        const titleEl = document.getElementById('input-entry-title');
        titleEl?.focus();
      }, 100);
    }
  };

  // Reflection Action with Optimistic Conversational UI
  const handleTriggerReflect = async (draftOrFollowUp?: Partial<JournalEntry> | string) => {
    if (isReflecting) return;

    let targetDraft: Partial<JournalEntry> = activeEntry;
    let followUpPrompt: string | null = null;
    let userMessageId: string | undefined = undefined;

    if (typeof draftOrFollowUp === 'string') {
      const trimmed = draftOrFollowUp.trim();
      if (!trimmed) return;
      followUpPrompt = trimmed;
      userMessageId = 'msg_user_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    } else if (draftOrFollowUp && typeof draftOrFollowUp === 'object') {
      targetDraft = {
        ...activeEntry,
        ...draftOrFollowUp,
      };
      setActiveEntry(targetDraft);
    } else if (!draftOrFollowUp) {
      // Retry scenario: check if last message was from the user
      const msgs = activeEntry.messages || [];
      const lastMsg = msgs[msgs.length - 1];
      if (lastMsg && lastMsg.role === 'user') {
        followUpPrompt = lastMsg.text;
        userMessageId = lastMsg.id;
      }
    }

    const contentToReflect = targetDraft.content || activeEntry.content || '';
    if (!contentToReflect.trim()) {
      setReflectionError('Please write your thoughts before reflecting.');
      return;
    }

    const contract = targetDraft.memoryContract || activeEntry.memoryContract || 'MAY_CONNECT';
    if (contract === 'STORE_ONLY') {
      setReflectionError('This entry is configured as STORE_ONLY. Gemini reflection is disabled per your privacy scope.');
      return;
    }

    // OPTIMISTIC CONVERSATIONAL UI:
    // If user sent a follow-up, immediately render the user's bubble in the chat stream!
    let currentConversation = activeEntry.messages || [];
    if (followUpPrompt && userMessageId && !currentConversation.some((m) => m.id === userMessageId)) {
      const optimisticUserMsg: ReflectionMessage = {
        id: userMessageId,
        role: 'user',
        text: followUpPrompt,
        lens: activeEntry.lens || preferences.defaultLens || 'PERSONAL',
        createdAt: new Date().toISOString(),
      };
      currentConversation = deduplicateMessages([...currentConversation, optimisticUserMsg]);
      const optimisticEntry = {
        ...activeEntry,
        messages: currentConversation,
        updatedAt: new Date().toISOString(),
      };
      setActiveEntry(optimisticEntry);
      if (activeEntry.id) {
        setEntries((prev) => prev.map((e) => (e.id === activeEntry.id ? { ...e, messages: currentConversation, updatedAt: new Date().toISOString() } : e)));
      }

      // Persist user message to Firestore immediately so network errors never lose what user typed
      if (auth.currentUser && activeEntry.id) {
        setDoc(
          doc(db, 'users', auth.currentUser.uid, 'entries', activeEntry.id),
          sanitizeFirestoreData({
            messages: currentConversation,
            updatedAt: new Date().toISOString(),
          }),
          { merge: true }
        ).catch(() => {});
      }
    }

    setIsReflecting(true);
    setReflectionError(null);

    try {
      // Ensure entry is saved first so entryId exists and text is safely preserved in Firestore
      let entryIdToUse = targetDraft.id;
      if (!entryIdToUse) {
        const saved = await handleSaveEntry(targetDraft);
        if (!saved || !auth.currentUser) {
          setReflectionError('Could not save entry before reflecting. Please try saving first.');
          setIsReflecting(false);
          return;
        }
        entryIdToUse = activeEntry.id;
      }

      const activeLens = targetDraft.lens || activeEntry.lens || 'PERSONAL';

      // Call secure backend Gemini reflection route
      const res = await authenticatedFetch('/api/journal/reflect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entryId: entryIdToUse,
          entryTitle: targetDraft.title || activeEntry.title || '',
          entryContent: contentToReflect,
          lens: activeLens,
          memoryContract: contract,
          previousMessages: currentConversation,
          userPrompt: followUpPrompt,
          userMessageId,
        }),
      });

      if (!res) {
        setReflectionError('Authentication expired. Please sign in again.');
        setIsReflecting(false);
        return;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with ${res.status}`);
      }

      const data = await res.json();
      const assistantMsg = data.assistantMessage;

      if (assistantMsg && assistantMsg.text) {
        assistantMsg.text = cleanReflectionProse(assistantMsg.text);
      }

      const updatedMessages = deduplicateMessages([
        ...currentConversation,
        ...(assistantMsg ? [assistantMsg] : []),
      ]);

      // Persist ONLY updated conversation messages to Firestore (never write undefined location or other fields)
      if (auth.currentUser && entryIdToUse) {
        const firestoreUpdatePayload: Record<string, any> = {
          messages: updatedMessages,
          updatedAt: new Date().toISOString(),
        };

        if (data.inferredTone) {
          firestoreUpdatePayload.inferredTone = data.inferredTone;
        }

        await setDoc(
          doc(db, 'users', auth.currentUser.uid, 'entries', entryIdToUse),
          sanitizeFirestoreData(firestoreUpdatePayload),
          { merge: true }
        );

        // Also persist individual message document in the nested messages subcollection
        if (assistantMsg) {
          await setDoc(
            doc(db, 'users', auth.currentUser.uid, 'entries', entryIdToUse, 'messages', assistantMsg.id),
            sanitizeFirestoreData(assistantMsg)
          ).catch(() => {});
        }
      }

      const baseEntry = (activeEntry.id === entryIdToUse ? activeEntry : targetDraft) as JournalEntry;
      const updatedEntry: JournalEntry = {
        ...baseEntry,
        id: entryIdToUse!,
        content: contentToReflect,
        messages: updatedMessages,
        updatedAt: new Date().toISOString(),
      };
      if (!updatedEntry.location) {
        delete (updatedEntry as any).location;
      }

      setActiveEntry(updatedEntry);
      setEntries((prev) =>
        prev.map((e) => (e.id === updatedEntry.id ? updatedEntry : e))
      );
    } catch (err: any) {
      console.error('Reflection failed', err);
      // Keep optimistic user message intact in state and inform user with non-destructive retry
      setReflectionError(err?.message || 'Gemini is temporarily busy. Your thoughts are safely kept.');
    } finally {
      setIsReflecting(false);
    }
  };

  // Switch lens from suggestion (Never auto-switches!)
  const handleSwitchLens = (newLens: ReflectionLens) => {
    setActiveEntry((prev) => ({
      ...prev,
      lens: newLens,
    }));
  };

  // Confirm Career Win (Requires explicit confirmation and persists to Wins Vault via API)
  const handleConfirmCareerWin = async (win: { title: string; summary: string }): Promise<boolean> => {
    try {
      const res = await authenticatedFetch('/api/journal/wins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: win.title,
          description: win.summary,
          sourceEntryIds: activeEntry.id ? [activeEntry.id] : [],
          confirmed: true,
          date: new Date().toISOString().split('T')[0],
        }),
      });

      if (!res.ok) {
        throw new Error('Could not save career win to server');
      }

      // Add confirmed tag to active entry
      const updatedTags = activeEntry.tags ? [...activeEntry.tags] : [];
      if (!updatedTags.includes('career-win')) {
        updatedTags.push('career-win');
      }
      const updated = {
        ...activeEntry,
        tags: updatedTags,
      };
      await handleSaveEntry(updated);
      return true;
    } catch (err) {
      console.error('Failed to confirm career win:', err);
      return false;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 rounded-full border-2 border-amber-800 border-t-transparent animate-spin mx-auto mb-3" />
          <p className="font-serif text-sm text-stone-600">Opening your private journal...</p>
        </div>
      </div>
    );
  }

  const activeMoodTheme = resolveEffectiveTheme(previewTheme || preferences.theme, activeEntry.mood);

  const handleSignOut = async () => {
    setActiveTab('journal');
    await signOutUser();
  };

  return (
    <div className={`min-h-screen ${activeMoodTheme.accentBg} transition-colors duration-700 flex flex-col font-sans text-stone-900 selection:bg-amber-100 overflow-x-clip`}>
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        onOpenNewEntry={() => {
          setActiveTab('journal');
          handleNewEntry();
        }}
      />

      {/* Friendly Sign-In Error Notice (Zero Developer Jargon) */}
      {authError && (
        <div 
          id="banner-auth-error"
          className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-xs text-amber-900 flex items-center justify-center gap-2"
        >
          <span>{authError}</span>
          <button 
            type="button"
            onClick={() => setAuthError(null)}
            className="text-amber-800 hover:text-amber-950 font-semibold underline ml-1.5 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 w-full">
        {!user ? (
          activeTab === 'discover' ? (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <ErrorBoundary fallbackTitle="Discover view encountered an issue">
                <DiscoverView
                  isSignedIn={false}
                  onSignIn={handleSignIn}
                  onNavigateToTab={(tab) => {
                    if (tab === 'journal') {
                      setActiveTab('journal');
                    } else {
                      handleSignIn();
                    }
                  }}
                />
              </ErrorBoundary>
            </div>
          ) : (
            <UnauthenticatedView onSignIn={handleSignIn} />
          )
        ) : (
          <>
            {activeTab === 'home' && (
              <AuthenticatedHomeView
                onOpenJournal={() => {
                  setActiveTab('journal');
                  setJournalMode('library');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onOpenNewEntry={() => {
                  setActiveTab('journal');
                  setJournalMode('write');
                  handleNewEntry(true);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            )}

            {activeTab === 'journal' && (
              <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 min-w-0 space-y-5">
                {/* Journal Mode Switcher: [ Write ] [ My Journal ] */}
                <div className="flex items-center justify-between gap-4 border-b border-[#ece6dc] pb-3">
                  <div className="inline-flex p-1 rounded-xl bg-[#f0ebe1] border border-[#e5dfd6] shadow-2xs">
                    <button
                      id="btn-journal-mode-write"
                      type="button"
                      onClick={() => setJournalMode('write')}
                      className={`inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                        journalMode === 'write'
                          ? 'bg-white text-stone-900 shadow-xs font-semibold'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      <PenLine className="w-3.5 h-3.5 text-amber-800" />
                      <span>Write</span>
                    </button>
                    <button
                      id="btn-journal-mode-library"
                      type="button"
                      onClick={() => setJournalMode('library')}
                      className={`inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                        journalMode === 'library'
                          ? 'bg-white text-stone-900 shadow-xs font-semibold'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      <BookOpen className="w-3.5 h-3.5 text-amber-800" />
                      <span>My Journal</span>
                      {entries.length > 0 && (
                        <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-stone-100 text-stone-600 font-mono font-medium">
                          {entries.length}
                        </span>
                      )}
                    </button>
                  </div>

                  {journalMode === 'write' && (
                    <button
                      type="button"
                      onClick={() => handleNewEntry(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 text-stone-50 text-xs font-semibold hover:bg-stone-800 transition shadow-2xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-amber-300" />
                      <span className="hidden sm:inline">New Entry</span>
                    </button>
                  )}
                </div>

                {journalMode === 'write' ? (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-w-0">
                    {/* Left Column: History Sidebar */}
                    <div className="lg:col-span-4 xl:col-span-3 order-2 lg:order-1 min-w-0">
                      <HistorySidebar
                        entries={entries}
                        activeEntryId={activeEntry.id}
                        onSelectEntry={(entry) => setActiveEntry(entry)}
                        onNewEntry={handleNewEntry}
                        isLoading={isLoadingEntries}
                        hasMoreEntries={hasMoreEntries}
                        isLoadingMore={isLoadingMore}
                        onLoadMoreEntries={loadMoreEntries}
                      />
                    </div>

                    {/* Center/Right: Main Journal Canvas & Thoughtful Reflection Companion */}
                    <div className="lg:col-span-8 xl:col-span-9 order-1 lg:order-2 space-y-6 min-w-0">
                      <JournalEditor
                        entry={activeEntry}
                        preferences={preferences}
                        onSave={handleSaveEntry}
                        onDelete={handleDeleteEntry}
                        onTriggerReflect={(draft) => handleTriggerReflect(draft)}
                        isSaving={isSaving}
                        saveError={saveError}
                        saveSuccess={saveSuccess}
                        onClearSaveError={() => setSaveError(null)}
                        onNewEntry={handleNewEntry}
                        isReflecting={isReflecting}
                        openingQuestions={openingQuestions}
                        onOpenReceipt={(receipt) => setActiveReceipt(receipt)}
                      />

                      {/* Reflection Companion Layer */}
                      <ReflectionPanel
                        entryId={activeEntry.id}
                        messages={activeEntry.messages || []}
                        currentLens={activeEntry.lens || preferences.defaultLens || 'PERSONAL'}
                        enabledLenses={preferences.enabledLenses}
                        memoryContract={activeEntry.memoryContract || preferences.defaultMemoryContract || 'MAY_CONNECT'}
                        isReflecting={isReflecting}
                        reflectionError={reflectionError}
                        onSendFollowUp={(prompt) => handleTriggerReflect(prompt)}
                        onSwitchLens={handleSwitchLens}
                        onConfirmCareerWin={handleConfirmCareerWin}
                        onRetryReflection={() => handleTriggerReflect()}
                        onOpenReceipt={(receipt) => setActiveReceipt(receipt)}
                      />
                    </div>
                  </div>
                ) : (
                  <JournalLibraryView
                    entries={entries}
                    onSelectEntry={(entry) => {
                      setActiveEntry(entry);
                      setJournalMode('write');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    onNewEntry={() => {
                      setJournalMode('write');
                      handleNewEntry(true);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    isLoading={isLoadingEntries}
                    hasMoreEntries={hasMoreEntries}
                    isLoadingMore={isLoadingMore}
                    onLoadMoreEntries={loadMoreEntries}
                  />
                )}
              </div>
            )}

            {activeTab === 'living-memory' && (
              <ErrorBoundary fallbackTitle="Living Memory view encountered an issue">
                <Suspense fallback={<div className="flex items-center justify-center p-12 text-stone-500 font-serif">Loading Living Memory...</div>}>
                  <LivingMemoryView
                    entries={entries}
                    onSelectEntry={(entryId) => {
                      const target = entries.find((e) => e.id === entryId);
                      if (target) {
                        setActiveEntry(target);
                        setActiveTab('journal');
                      }
                    }}
                    onOpenReceipt={(receipt) => setActiveReceipt(receipt)}
                  />
                </Suspense>
              </ErrorBoundary>
            )}

            {activeTab === 'insights' && (
              <ErrorBoundary fallbackTitle="Insights Dashboard encountered an issue">
                <Suspense fallback={<div className="flex items-center justify-center p-12 text-stone-500 font-serif">Loading Insights Dashboard...</div>}>
                  <InsightsView
                    entries={entries}
                    onOpenReceipt={(receipt) => setActiveReceipt(receipt)}
                    onSelectEntry={(entry) => {
                      setActiveEntry(entry);
                      setActiveTab('journal');
                    }}
                    onNavigateToWins={() => setActiveTab('wins')}
                  />
                </Suspense>
              </ErrorBoundary>
            )}

            {activeTab === 'wins' && (
              <ErrorBoundary fallbackTitle="Wins Vault encountered an issue">
                <Suspense fallback={<div className="flex items-center justify-center p-12 text-stone-500 font-serif">Loading Wins Vault...</div>}>
                  <CareerWinsView
                    entries={entries}
                    onOpenReceipt={(receipt) => setActiveReceipt(receipt)}
                    onSelectEntry={(entry) => {
                      setActiveEntry(entry);
                      setActiveTab('journal');
                    }}
                  />
                </Suspense>
              </ErrorBoundary>
            )}

            {activeTab === 'map' && (
              <ErrorBoundary fallbackTitle="Memory Map encountered an issue">
                <Suspense fallback={<div className="flex items-center justify-center p-12 text-stone-500 font-serif">Loading Memory Map...</div>}>
                  <MemoryMapView
                    entries={entries}
                    onSelectEntry={(entry) => {
                      setActiveEntry(entry);
                      setActiveTab('journal');
                    }}
                    onOpenReceipt={(receipt) => setActiveReceipt(receipt)}
                  />
                </Suspense>
              </ErrorBoundary>
            )}

            {activeTab === 'discover' && (
              <ErrorBoundary fallbackTitle="Discover view encountered an issue">
                <DiscoverView
                  isSignedIn={true}
                  onNavigateToTab={(tab) => setActiveTab(tab)}
                />
              </ErrorBoundary>
            )}

            {activeTab === 'settings' && (
              <ErrorBoundary fallbackTitle="Settings view encountered an issue">
                <Suspense fallback={<div className="flex items-center justify-center p-12 text-stone-500 font-serif">Loading Settings...</div>}>
                  <SettingsView
                    preferences={preferences}
                    onSavePreferences={handleSavePreferences}
                    entries={entries}
                    onDeleteAllData={handleDeleteAllData}
                    onPreviewTheme={setPreviewTheme}
                  />
                </Suspense>
              </ErrorBoundary>
            )}
          </>
        )}
      </main>

      {/* Memory Receipt Modal */}
      {activeReceipt && (
        <Suspense fallback={null}>
          <MemoryReceiptModal
            receipt={activeReceipt}
            onClose={() => setActiveReceipt(null)}
            onSelectEntry={(entryId) => {
              const target = entries.find((e) => e.id === entryId);
              if (target) {
                setActiveEntry(target);
                setActiveTab('journal');
              }
            }}
            onReceiptUpdated={() => {
              loadEntries();
            }}
          />
        </Suspense>
      )}

      {/* Onboarding Modal */}
      {showOnboarding && (
        <Suspense fallback={null}>
          <OnboardingModal
            isOpen={showOnboarding}
            onClose={() => setShowOnboarding(false)}
            currentPreferences={preferences}
            onSavePreferences={handleSavePreferences}
          />
        </Suspense>
      )}
    </div>
  );
}
