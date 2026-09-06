import { JournalMood, MoodThemeId, ThemePreferences } from '../types';

export interface MoodThemeDefinition {
  id: JournalMood;
  name: string;
  description: string;
  accentBg: string;
  accentBorder: string;
  accentText: string;
  subtleBg: string;
  dotColor: string;
  ringColor: string;
}

export const MOOD_THEMES: Record<JournalMood, MoodThemeDefinition> = {
  peaceful: {
    id: 'peaceful',
    name: 'Peaceful Sage',
    description: 'Calm, grounding greens and gentle eucalyptus',
    accentBg: 'bg-emerald-50 dark:bg-emerald-950/30',
    accentBorder: 'border-emerald-200 dark:border-emerald-800/50',
    accentText: 'text-emerald-700 dark:text-emerald-300',
    subtleBg: 'bg-emerald-500/10',
    dotColor: 'bg-emerald-500',
    ringColor: 'focus:ring-emerald-500',
  },
  thoughtful: {
    id: 'thoughtful',
    name: 'Thoughtful Slate',
    description: 'Deep contemplation in quiet indigo and slate',
    accentBg: 'bg-indigo-50 dark:bg-indigo-950/30',
    accentBorder: 'border-indigo-200 dark:border-indigo-800/50',
    accentText: 'text-indigo-700 dark:text-indigo-300',
    subtleBg: 'bg-indigo-500/10',
    dotColor: 'bg-indigo-500',
    ringColor: 'focus:ring-indigo-500',
  },
  energized: {
    id: 'energized',
    name: 'Energized Amber',
    description: 'Warm, radiant momentum and creative vitality',
    accentBg: 'bg-amber-50 dark:bg-amber-950/30',
    accentBorder: 'border-amber-200 dark:border-amber-800/50',
    accentText: 'text-amber-700 dark:text-amber-300',
    subtleBg: 'bg-amber-500/10',
    dotColor: 'bg-amber-500',
    ringColor: 'focus:ring-amber-500',
  },
  grateful: {
    id: 'grateful',
    name: 'Grateful Rose',
    description: 'Warm appreciation and grounded connection',
    accentBg: 'bg-rose-50 dark:bg-rose-950/30',
    accentBorder: 'border-rose-200 dark:border-rose-800/50',
    accentText: 'text-rose-700 dark:text-rose-300',
    subtleBg: 'bg-rose-500/10',
    dotColor: 'bg-rose-500',
    ringColor: 'focus:ring-rose-500',
  },
  stressed: {
    id: 'stressed',
    name: 'Soothing Sky',
    description: 'Gentle, cooling tones to soften tension',
    accentBg: 'bg-sky-50 dark:bg-sky-950/30',
    accentBorder: 'border-sky-200 dark:border-sky-800/50',
    accentText: 'text-sky-700 dark:text-sky-300',
    subtleBg: 'bg-sky-500/10',
    dotColor: 'bg-sky-500',
    ringColor: 'focus:ring-sky-500',
  },
  neutral: {
    id: 'neutral',
    name: 'Balanced Warmth',
    description: 'Minimal, understated balance for daily writing',
    accentBg: 'bg-stone-50 dark:bg-stone-900/40',
    accentBorder: 'border-stone-200 dark:border-stone-800',
    accentText: 'text-stone-700 dark:text-stone-300',
    subtleBg: 'bg-stone-500/10',
    dotColor: 'bg-stone-500',
    ringColor: 'focus:ring-stone-500',
  },
};

export type SafeThemeKey = JournalMood | MoodThemeId;

const THEME_ALIAS_MAP: Record<MoodThemeId, JournalMood> = {
  neutral: 'neutral',
  calm: 'stressed', // soothing cooling tones
  warm: 'energized', // warm amber vitality
  bright: 'peaceful', // emerald meadow
  focus: 'thoughtful', // indigo focus
  soft: 'grateful', // rose softness
};

export function getMoodTheme(themeOrMood?: string): MoodThemeDefinition {
  if (!themeOrMood) return MOOD_THEMES.neutral;
  
  if (themeOrMood in MOOD_THEMES) {
    return MOOD_THEMES[themeOrMood as JournalMood];
  }

  if (themeOrMood in THEME_ALIAS_MAP) {
    const alias = THEME_ALIAS_MAP[themeOrMood as MoodThemeId];
    return MOOD_THEMES[alias] || MOOD_THEMES.neutral;
  }

  return MOOD_THEMES.neutral;
}

export function resolveEffectiveTheme(
  preferences?: ThemePreferences,
  entryMood?: string
): MoodThemeDefinition {
  const mode = preferences?.mode || 'automatic';
  if (mode === 'off') {
    return MOOD_THEMES.neutral;
  }
  if (mode === 'manual') {
    return getMoodTheme(preferences?.selectedTheme || 'neutral');
  }
  // automatic mode: prioritize entry mood, then default selectedTheme, then neutral
  return getMoodTheme(entryMood || preferences?.selectedTheme || 'neutral');
}


