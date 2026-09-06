export type ReflectionLens = 
  | 'PERSONAL' 
  | 'PROFESSIONAL' 
  | 'WOMEN_AND_LIFE' 
  | 'IDENTITY_AND_GROWTH';

export type MemoryContract = 
  | 'STORE_ONLY' 
  | 'PAGE_ONLY' 
  | 'MAY_CONNECT' 
  | 'IMPORTANT_MEMORY';

export type JournalMood = 
  | 'peaceful' 
  | 'energized' 
  | 'thoughtful' 
  | 'stressed' 
  | 'grateful' 
  | 'neutral';

export interface CareerWinProposal {
  title: string;
  summary: string;
  confirmed: boolean;
}

export interface CareerWin {
  id: string;
  userId: string;
  title: string;
  description: string;
  sourceEntryIds: string[];
  date: string;
  userNotes?: string;
  confirmed: boolean;
  receipt?: MemoryReceipt;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyReflection {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  meaningfulMoments: string[];
  commonThemes: string[];
  shiftsAndChanges: string[];
  confirmedWins: string[];
  unresolvedTopics: string[];
  gentleObservations: string[];
  reflectionPrompt?: string | null;
  receipts: MemoryReceipt[];
  entryCount: number;
  createdAt: string;
}

export interface EntryLocation {
  placeName: string;
  placeId?: string;
  latitude?: number;
  longitude?: number;
}

export interface JournalStreak {
  currentStreak: number;
  longestStreak: number;
  daysJournaledThisWeek: number;
  lastJournaledDate?: string;
  encouragingMessage: string;
}

export type MoodThemeId = 'neutral' | 'calm' | 'warm' | 'bright' | 'focus' | 'soft';

export interface ThemePreferences {
  mode: 'automatic' | 'manual' | 'off';
  selectedTheme: MoodThemeId;
}

export interface MemoryReceiptSource {
  id: string;
  title: string;
  date: string;
  excerpt: string;
  lens?: ReflectionLens;
}

export interface MemoryReceipt {
  id?: string;
  sources: MemoryReceiptSource[];
  reason?: string;
  crossEntryClaim?: string;
  userVerdict?: 'ACCURATE' | 'NOT_QUITE' | 'DISCONNECTED' | 'REMOVED';
  createdAt?: string;
}

export interface ReflectionMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  lens: ReflectionLens;
  suggestedLens?: ReflectionLens | null;
  suggestedLensReason?: string | null;
  suggestedCareerWin?: CareerWinProposal | null;
  memoryReceipt?: MemoryReceipt | null;
  createdAt: string;
}

export interface LifeThread {
  id: string;
  userId: string;
  title: string;
  description: string;
  sourceEntryIds: string[];
  status: 'SUGGESTED' | 'APPROVED' | 'DISMISSED';
  createdAt: string;
  updatedAt: string;
}

export interface UnfinishedLoop {
  id: string;
  userId: string;
  sourceEntryId: string;
  sourceTitle: string;
  sourceDate: string;
  question: string;
  followUpDate?: string;
  status: 'OPEN' | 'RESOLVED' | 'DISMISSED';
  outcomeEntryId?: string | null;
  outcomeNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AIMemoryItem {
  id: string;
  userId: string;
  concept: string;
  sourceEntryIds: string[];
  userConfirmed: boolean;
  status: 'HYPOTHESIS' | 'CONFIRMED' | 'CORRECTED';
  createdAt: string;
  updatedAt: string;
}

export interface ThenNowComparison {
  id: string;
  thenEntry: {
    id: string;
    title: string;
    date: string;
    excerpt: string;
  };
  nowEntry: {
    id: string;
    title: string;
    date: string;
    excerpt: string;
  };
  reflection: string;
  tentative: boolean;
  receipt: MemoryReceipt;
  createdAt: string;
}

export interface OpeningQuestion {
  id: string;
  question: string;
  sourceEntryIds: string[];
  receipt?: MemoryReceipt | null;
  isPersonalized: boolean;
}

export interface LivingMemoryOverview {
  lifeThreads: LifeThread[];
  unfinishedLoops: UnfinishedLoop[];
  aiMemories: AIMemoryItem[];
  thenNowComparisons: ThenNowComparison[];
  totalConnectedMoments: number;
}

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  content: string;
  lens: ReflectionLens;
  memoryContract: MemoryContract;
  tags: string[];
  favorite: boolean;
  mood?: JournalMood;
  inferredTone?: string;
  location?: EntryLocation;
  isVoice?: boolean;
  oneLineSummary?: string;
  messages: ReflectionMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  enabledLenses: ReflectionLens[];
  defaultLens: ReflectionLens;
  defaultMemoryContract: MemoryContract;
  onboardingCompleted: boolean;
  theme?: ThemePreferences;
  weeklyEmailEnabled?: boolean;
  weeklyEmailDay?: 'SUNDAY' | 'MONDAY' | 'FRIDAY';
  gentleRemindersEnabled?: boolean;
  reminderTime?: string;
  reminderFrequency?: 'DAILY' | 'WEEKDAYS' | 'WEEKENDS';
  personalizedReminderPreview?: boolean;
}

export interface JournalExportData {
  exportedAt: string;
  userId: string;
  preferences: UserPreferences;
  entriesCount: number;
  entries: {
    id: string;
    title: string;
    content: string;
    createdAt: string;
    updatedAt: string;
    lens: ReflectionLens;
    memoryContract: MemoryContract;
    mood?: JournalMood;
    tags: string[];
    location?: EntryLocation;
    reflections?: {
      role: 'user' | 'assistant';
      speakerLabel: string;
      text: string;
      lens: ReflectionLens;
      createdAt: string;
    }[];
  }[];
  winsCount: number;
  wins?: {
    id: string;
    title: string;
    description: string;
    date: string;
    confirmed: boolean;
  }[];
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  preferences: UserPreferences;
  createdAt?: string;
  updatedAt?: string;
}

