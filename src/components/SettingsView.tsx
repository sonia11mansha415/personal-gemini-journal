import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Settings as SettingsIcon, 
  Save, 
  Check, 
  Download, 
  Trash2, 
  Heart, 
  Briefcase, 
  Flower2, 
  Compass, 
  FileText,
  Mail,
  Bell,
  Palette,
  AlertTriangle,
  X,
  Send,
  Loader2
} from 'lucide-react';
import { ReflectionLens, MemoryContract, UserPreferences, JournalEntry, MoodThemeId } from '../types';
import { authenticatedFetch } from '../api/authClient';

interface SettingsViewProps {
  preferences: UserPreferences;
  onSavePreferences: (newPrefs: UserPreferences) => Promise<void>;
  entries?: JournalEntry[];
  onDeleteAllData?: () => Promise<void>;
  onPreviewTheme?: (theme: { mode: 'automatic' | 'manual' | 'off'; selectedTheme: MoodThemeId } | null) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  preferences,
  onSavePreferences,
  entries = [],
  onDeleteAllData,
  onPreviewTheme,
}) => {
  // Lenses state
  const [enabledLenses, setEnabledLenses] = useState<ReflectionLens[]>(
    preferences.enabledLenses || ['PERSONAL', 'PROFESSIONAL', 'IDENTITY_AND_GROWTH']
  );
  const [defaultLens, setDefaultLens] = useState<ReflectionLens>(
    preferences.defaultLens || 'PERSONAL'
  );

  // Contract state
  const [defaultMemoryContract, setDefaultMemoryContract] = useState<MemoryContract>(
    preferences.defaultMemoryContract || 'MAY_CONNECT'
  );

  // Theme state
  const [themeMode, setThemeMode] = useState<'automatic' | 'manual' | 'off'>(
    preferences.theme?.mode || 'automatic'
  );
  const [selectedTheme, setSelectedTheme] = useState<MoodThemeId>(
    preferences.theme?.selectedTheme || 'neutral'
  );

  // Live theme preview
  useEffect(() => {
    onPreviewTheme?.({
      mode: themeMode,
      selectedTheme,
    });
  }, [themeMode, selectedTheme, onPreviewTheme]);

  // Revert preview on unmount if not saved
  useEffect(() => {
    return () => {
      onPreviewTheme?.(null);
    };
  }, [onPreviewTheme]);

  // Weekly Email state (Opt-in only)
  const [weeklyEmailEnabled, setWeeklyEmailEnabled] = useState<boolean>(
    Boolean(preferences.weeklyEmailEnabled)
  );
  const [weeklyEmailDay, setWeeklyEmailDay] = useState<'SUNDAY' | 'MONDAY' | 'FRIDAY'>(
    preferences.weeklyEmailDay || 'SUNDAY'
  );
  const [isSendingEmailPreview, setIsSendingEmailPreview] = useState(false);
  const [emailPreviewMessage, setEmailPreviewMessage] = useState<string | null>(null);

  // Gentle Reminders state (Opt-in only)
  const [gentleRemindersEnabled, setGentleRemindersEnabled] = useState<boolean>(
    Boolean(preferences.gentleRemindersEnabled)
  );
  const [reminderTime, setReminderTime] = useState<string>(
    preferences.reminderTime || '20:00'
  );
  const [reminderFrequency, setReminderFrequency] = useState<'DAILY' | 'WEEKDAYS' | 'WEEKENDS'>(
    preferences.reminderFrequency || 'DAILY'
  );

  // General state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  // Deletion Modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  const toggleLens = (lens: ReflectionLens) => {
    if (enabledLenses.includes(lens)) {
      if (enabledLenses.length <= 1) return; // Keep at least one
      const updated = enabledLenses.filter((l) => l !== lens);
      setEnabledLenses(updated);
      if (defaultLens === lens) {
        setDefaultLens(updated[0]);
      }
    } else {
      setEnabledLenses([...enabledLenses, lens]);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await onSavePreferences({
        ...preferences,
        enabledLenses,
        defaultLens,
        defaultMemoryContract,
        theme: {
          mode: themeMode,
          selectedTheme,
        },
        weeklyEmailEnabled,
        weeklyEmailDay,
        gentleRemindersEnabled,
        reminderTime,
        reminderFrequency,
      });
      onPreviewTheme?.(null);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save preferences:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportJSON = async () => {
    try {
      const res = await authenticatedFetch('/api/journal/export?format=json');
      if (res.ok) {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `personal-journal-export-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        URL.revokeObjectURL(url);
        setExportSuccess('JSON archive downloaded successfully.');
        setTimeout(() => setExportSuccess(null), 4000);
        return;
      }
    } catch {
      // Fallback to client-side data
    }

    const payload = {
      exportedAt: new Date().toISOString(),
      entriesCount: entries.length,
      entries: entries.map((e) => ({
        id: e.id,
        title: e.title,
        content: e.content,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
        lens: e.lens,
        memoryContract: e.memoryContract,
        mood: e.mood,
        tags: e.tags,
        location: e.location,
        reflections: (e.messages || []).map((m) => ({
          speaker: m.role === 'user' ? 'Author Note' : 'Reflective Companion',
          text: m.text,
          lens: m.lens,
          createdAt: m.createdAt,
        })),
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `personal-journal-export-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setExportSuccess('JSON archive downloaded successfully.');
    setTimeout(() => setExportSuccess(null), 4000);
  };

  const handleExportMarkdown = async () => {
    try {
      const res = await authenticatedFetch('/api/journal/export?format=markdown');
      if (res.ok) {
        const mdText = await res.text();
        const blob = new Blob([mdText], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `personal-journal-${new Date().toISOString().slice(0, 10)}.md`;
        link.click();
        URL.revokeObjectURL(url);
        setExportSuccess('Markdown journal downloaded successfully.');
        setTimeout(() => setExportSuccess(null), 4000);
        return;
      }
    } catch {
      // Fallback to client-side data
    }

    let md = `# Personal Journal Export\nExported: ${new Date().toLocaleDateString()}\nTotal Entries: ${entries.length}\n\n---\n\n`;
    entries.forEach((e) => {
      md += `## ${e.title || 'Untitled Entry'}\n`;
      md += `*Date: ${e.createdAt.slice(0, 10)} | Mood: ${e.mood || 'peaceful'} | Lens: ${e.lens} | Contract: ${e.memoryContract}*\n`;
      if (e.location?.placeName) {
        md += `*Location: ${e.location.placeName}*\n`;
      }
      md += `\n### [User Author]\n${e.content}\n\n`;
      if (e.messages && e.messages.length > 0) {
        md += `### Reflections & Dialogue\n`;
        e.messages.forEach((m) => {
          const speaker = m.role === 'user' ? 'Author Note' : 'Reflective Companion';
          md += `> **[${speaker}]** (${m.lens}):\n> ${m.text.replace(/\n/g, '\n> ')}\n\n`;
        });
      }
      md += `---\n\n`;
    });
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `personal-journal-${new Date().toISOString().slice(0, 10)}.md`;
    link.click();
    URL.revokeObjectURL(url);
    setExportSuccess('Markdown journal downloaded successfully.');
    setTimeout(() => setExportSuccess(null), 4000);
  };

  // Test Email Preview
  const handleTestEmailPreview = async () => {
    setIsSendingEmailPreview(true);
    setEmailPreviewMessage(null);
    try {
      const res = await authenticatedFetch('/api/journal/weekly-email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preview: true }),
      });
      const data = await res.json();
      if (res.ok) {
        if (entries && entries.length >= 2) {
          setEmailPreviewMessage('Weekly preview created from your recent reflections.');
        } else {
          setEmailPreviewMessage("There isn't enough journal history yet to create a personalized weekly reflection.");
        }
      } else {
        setEmailPreviewMessage(data.error || 'Could not generate email preview.');
      }
    } catch {
      setEmailPreviewMessage('Email preview service temporarily offline.');
    } finally {
      setIsSendingEmailPreview(false);
      setTimeout(() => setEmailPreviewMessage(null), 6000);
    }
  };

  // Delete All Data Handler
  const handleDeleteAll = async () => {
    if (deleteConfirmText.trim() !== 'DELETE MY JOURNAL') return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await authenticatedFetch('/api/journal/data', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: 'DELETE MY JOURNAL' }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to wipe journal data');
      }

      setDeleteSuccess(true);
      if (onDeleteAllData) {
        await onDeleteAllData();
      }
      setTimeout(() => {
        setShowDeleteModal(false);
        setDeleteSuccess(false);
        setDeleteConfirmText('');
      }, 2000);
    } catch (err: any) {
      setDeleteError(err?.message || 'Deletion failed. Please retry.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 border border-stone-200 text-stone-700 text-xs font-semibold uppercase tracking-wider mb-2">
          <SettingsIcon className="w-3.5 h-3.5" />
          Settings & Sovereignty
        </div>
        <h1 className="font-serif text-3xl font-semibold text-stone-900 tracking-tight">
          Journal Preferences & Privacy Controls
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-1">
          Customize your reflection lenses, memory contracts, notifications, and exercise full sovereignty over your personal data.
        </p>
      </div>

      <div className="space-y-8">
        {/* Section 1: Active Reflection Lenses */}
        <div className="bg-white border border-[#e5dfd6] rounded-2xl p-6 sm:p-7 shadow-xs">
          <div className="mb-4">
            <h3 className="font-serif text-lg font-semibold text-stone-900">
              Enabled Reflection Lenses
            </h3>
            <p className="text-xs text-stone-500">
              Select which lenses appear in your journal editor. Lenses are strictly opt-in.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-6">
            {[
              {
                id: 'PERSONAL' as ReflectionLens,
                title: 'Personal Lens',
                icon: Heart,
                color: 'text-amber-800 bg-amber-50',
                desc: 'Everyday life, memories, relationships, and meaningful moments.',
              },
              {
                id: 'PROFESSIONAL' as ReflectionLens,
                title: 'Professional Lens',
                icon: Briefcase,
                color: 'text-indigo-800 bg-indigo-50',
                desc: 'Work lessons, project reflections, decisions, and confirmed career wins.',
              },
              {
                id: 'WOMEN_AND_LIFE' as ReflectionLens,
                title: 'Women & Life Lens (Opt-in)',
                icon: Flower2,
                color: 'text-rose-800 bg-rose-50',
                desc: 'Quiet strength, agency, boundaries, and multifaceted identity.',
              },
              {
                id: 'IDENTITY_AND_GROWTH' as ReflectionLens,
                title: 'Identity & Growth Lens',
                icon: Compass,
                color: 'text-emerald-800 bg-emerald-50',
                desc: 'Mindset shifts, values, patterns, and who you are becoming.',
              },
            ].map((lens) => {
              const Icon = lens.icon;
              const isEnabled = enabledLenses.includes(lens.id);
              const isDefault = defaultLens === lens.id;

              return (
                <div
                  key={lens.id}
                  id={`setting-lens-${lens.id.toLowerCase()}`}
                  onClick={() => toggleLens(lens.id)}
                  className={`p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                    isEnabled
                      ? 'border-amber-700/30 bg-[#faf8f5]'
                      : 'border-stone-200 bg-stone-50/50 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-lg ${lens.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-stone-900">{lens.title}</h4>
                        {isDefault && (
                          <span className="text-[10px] font-medium text-amber-800 bg-amber-100/70 px-1.5 py-0.5 rounded">
                            Default Lens
                          </span>
                        )}
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={() => {}}
                      className="w-4 h-4 rounded text-amber-800 focus:ring-amber-800/30 mt-1 cursor-pointer"
                    />
                  </div>
                  <p className="text-xs text-stone-600 font-sans leading-relaxed">{lens.desc}</p>
                </div>
              );
            })}
          </div>

          {/* Default Lens Selector */}
          <div className="pt-4 border-t border-[#f0eae1] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-stone-800 block">Default Writing Lens</span>
              <span className="text-[11px] text-stone-500">The lens automatically selected when starting a new journal entry.</span>
            </div>
            <select
              value={defaultLens}
              onChange={(e) => setDefaultLens(e.target.value as ReflectionLens)}
              className="text-xs bg-[#faf8f5] border border-stone-300 rounded-lg px-3 py-2 text-stone-800 font-medium focus:ring-1 focus:ring-amber-800/50 focus:border-amber-800 cursor-pointer"
            >
              {enabledLenses.map((l) => (
                <option key={l} value={l}>
                  {l.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Section 2: Default Memory Contract */}
        <div className="bg-white border border-[#e5dfd6] rounded-2xl p-6 sm:p-7 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-serif text-lg font-semibold text-stone-900">
                Default Memory Contract
              </h3>
              <p className="text-xs text-stone-500">
                Determines how new entries interact with Gemini reflection and long-term memory by default.
              </p>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200">
              Privacy Contract
            </span>
          </div>

          <div className="space-y-3">
            {[
              {
                id: 'MAY_CONNECT' as MemoryContract,
                title: 'Connect With Memories (Recommended)',
                desc: 'Reflect on this entry and connect it to recurring themes, unfinished loops, and personal growth in future sessions.',
              },
              {
                id: 'STORE_ONLY' as MemoryContract,
                title: 'Private Only (No AI)',
                desc: 'Saved privately and never sent for AI reflection. This entry is kept completely private to you.',
              },
              {
                id: 'PAGE_ONLY' as MemoryContract,
                title: 'One-Time Reflection Only',
                desc: 'Provides immediate reflection on this page. This moment won\'t be connected to future memories.',
              },
              {
                id: 'IMPORTANT_MEMORY' as MemoryContract,
                title: 'Core Memory',
                desc: 'Marked as a milestone moment and prioritized in long-term reflections and your life story.',
              },
            ].map((contract) => (
              <label
                key={contract.id}
                className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                  defaultMemoryContract === contract.id
                    ? 'border-amber-700/40 bg-[#faf8f5]'
                    : 'border-stone-200 bg-white hover:border-stone-300'
                }`}
              >
                <input
                  type="radio"
                  name="defaultMemoryContract"
                  value={contract.id}
                  checked={defaultMemoryContract === contract.id}
                  onChange={() => setDefaultMemoryContract(contract.id)}
                  className="mt-1 text-amber-800 focus:ring-amber-800/30 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-semibold text-stone-900 block">{contract.title}</span>
                  <span className="text-[11px] text-stone-600 leading-snug">{contract.desc}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Section 3: Visual Theme Palette */}
        <div className="bg-white border border-[#e5dfd6] rounded-2xl p-6 sm:p-7 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-stone-100 text-stone-700">
                <Palette className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-semibold text-stone-900">
                  Mood & Visual Theme
                </h3>
                <p className="text-xs text-stone-500">
                  Select how the reflective space adjusts its colors and atmospheric tone.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 border border-stone-200">
              Aesthetics
            </span>
          </div>

          {/* Theme Mode Selector */}
          <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { id: 'automatic' as const, title: 'Automatic', desc: 'Colors gently adapt to your journal mood.' },
              { id: 'manual' as const, title: 'Manual', desc: 'Always uses chosen palette.' },
              { id: 'off' as const, title: 'Off (Neutral)', desc: 'Uses the calm neutral appearance.' },
            ].map((m) => {
              const isSelected = themeMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  id={`btn-theme-mode-${m.id}`}
                  onClick={() => setThemeMode(m.id)}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-stone-900 bg-stone-100 font-semibold shadow-2xs ring-1 ring-stone-900'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-stone-900 block font-medium">{m.title}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-stone-900 shrink-0" />}
                  </div>
                  <span className="text-[11px] text-stone-500 font-normal leading-snug mt-1">{m.desc}</span>
                </button>
              );
            })}
          </div>

          {themeMode === 'automatic' && (
            <div className="p-4 rounded-xl bg-stone-50/80 border border-stone-200 text-stone-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-900 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-amber-700" />
                  Automatic Mood Tone Active
                </span>
                <span className="text-[11px] font-mono text-stone-600 bg-white px-2 py-0.5 rounded border border-stone-200">
                  {`Current look: ${
                    {
                      neutral: 'Neutral Minimal',
                      calm: 'Calm Sky',
                      warm: 'Warm Sunlight',
                      bright: 'Bright Meadow',
                      focus: 'Deep Focus',
                      soft: 'Soft Rose',
                    }[selectedTheme] || 'Neutral Minimal'
                  }`}
                </span>
              </div>
              <p className="text-xs text-stone-500 leading-relaxed">
                Colors gently adapt to your journal mood as you reflect. Individual palettes do not need to be manually picked in this mode.
              </p>
            </div>
          )}

          {themeMode === 'manual' && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-stone-700 block">
                Choose a fixed palette:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { id: 'neutral' as MoodThemeId, label: 'Neutral Minimal', border: 'border-stone-400 bg-stone-50' },
                  { id: 'calm' as MoodThemeId, label: 'Calm Sky', border: 'border-sky-400 bg-sky-50' },
                  { id: 'warm' as MoodThemeId, label: 'Warm Sunlight', border: 'border-amber-400 bg-amber-50' },
                  { id: 'bright' as MoodThemeId, label: 'Bright Meadow', border: 'border-emerald-400 bg-emerald-50' },
                  { id: 'focus' as MoodThemeId, label: 'Deep Focus', border: 'border-indigo-400 bg-indigo-50' },
                  { id: 'soft' as MoodThemeId, label: 'Soft Rose', border: 'border-rose-400 bg-rose-50' },
                ].map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setSelectedTheme(theme.id)}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                      selectedTheme === theme.id
                        ? 'ring-2 ring-stone-900 border-transparent shadow-xs'
                        : 'border-stone-200 hover:border-stone-300'
                    } ${theme.border}`}
                  >
                    <span className="text-xs font-medium text-stone-900">{theme.label}</span>
                    {selectedTheme === theme.id && <Check className="w-3.5 h-3.5 text-stone-900 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {themeMode === 'off' && (
            <p className="text-xs text-stone-500 italic p-3 bg-stone-50 rounded-xl border border-stone-200">
              Uses the calm neutral appearance. Dynamic theming is turned off and the application will consistently display the standard neutral palette.
            </p>
          )}
        </div>

        {/* Section 4: Weekly Reflection Email (Opt-In Only) */}
        <div className="bg-white border border-[#e5dfd6] rounded-2xl p-6 sm:p-7 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-stone-100 text-stone-700">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-semibold text-stone-900">
                  Weekly Reflection Email (Preview Only)
                </h3>
                <p className="text-xs text-stone-500">
                  Simulated preview only. Delivery is not configured for this prototype. Strictly opt-in.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
              Preview Only
            </span>
          </div>

          <div className="space-y-4">
            <label className="flex items-center justify-between p-4 rounded-xl bg-[#faf8f5] border border-stone-200 cursor-pointer">
              <div>
                <span className="text-xs font-semibold text-stone-900 block">
                  Stage weekly reflection preview
                </span>
                <span className="text-[11px] text-stone-500">
                  Synthesizes only eligible memories (excludes Store Only and Page Only entries). Easy opt-out anytime.
                </span>
              </div>
              <input
                type="checkbox"
                checked={weeklyEmailEnabled}
                onChange={(e) => setWeeklyEmailEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-amber-800 focus:ring-amber-800/30 cursor-pointer"
              />
            </label>

            {weeklyEmailEnabled && (
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-stone-100">
                <div>
                  <span className="text-xs font-medium text-stone-800 block">Preferred Delivery Day</span>
                  <span className="text-[11px] text-stone-500">Choose preferred synthesis timing.</span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={weeklyEmailDay}
                    onChange={(e) => setWeeklyEmailDay(e.target.value as any)}
                    className="text-xs bg-[#faf8f5] border border-stone-300 rounded-lg px-3 py-1.5 text-stone-800 font-medium focus:ring-1 focus:ring-amber-800/50 cursor-pointer"
                  >
                    <option value="SUNDAY">Sunday Evening</option>
                    <option value="MONDAY">Monday Morning</option>
                    <option value="FRIDAY">Friday Afternoon</option>
                  </select>

                  <button
                    type="button"
                    onClick={handleTestEmailPreview}
                    disabled={isSendingEmailPreview}
                    className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-medium transition cursor-pointer flex items-center gap-1"
                  >
                    {isSendingEmailPreview ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>Generate Email Preview</span>
                  </button>
                </div>
              </div>
            )}

            <div aria-live="polite" className="min-h-[20px] transition-all">
              {emailPreviewMessage && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2 animate-fadeIn">
                  <Check className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>{emailPreviewMessage}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 5: Gentle Journaling Reminders (Opt-In Only) */}
        <div className="bg-white border border-[#e5dfd6] rounded-2xl p-6 sm:p-7 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-stone-100 text-stone-700">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-semibold text-stone-900">
                  Gentle Journaling Reminders (Preference Only)
                </h3>
                <p className="text-xs text-stone-500">
                  Saves schedule preferences. Notification delivery is not active in this prototype.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 border border-stone-200">
              Preference Only
            </span>
          </div>

          <div className="space-y-4">
            <label className="flex items-center justify-between p-4 rounded-xl bg-[#faf8f5] border border-stone-200 cursor-pointer">
              <div>
                <span className="text-xs font-semibold text-stone-900 block">
                  Enable gentle reflection pauses
                </span>
                <span className="text-[11px] text-stone-500">
                  No streak penalties, guilt words, or manipulative notifications.
                </span>
              </div>
              <input
                type="checkbox"
                checked={gentleRemindersEnabled}
                onChange={(e) => setGentleRemindersEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-amber-800 focus:ring-amber-800/30 cursor-pointer"
              />
            </label>

            {gentleRemindersEnabled && (
              <div className="space-y-3 pt-2 border-t border-stone-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-medium text-stone-800 block">Reminder Schedule</span>
                    <span className="text-[11px] text-stone-500">Select preferred days and time.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={reminderFrequency}
                      onChange={(e) => setReminderFrequency(e.target.value as any)}
                      className="text-xs bg-[#faf8f5] border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-800 font-medium cursor-pointer"
                    >
                      <option value="DAILY">Every Day</option>
                      <option value="WEEKDAYS">Weekdays</option>
                      <option value="WEEKENDS">Weekends</option>
                    </select>
                    <input
                      type="time"
                      value={reminderTime}
                      onChange={(e) => setReminderTime(e.target.value)}
                      className="text-xs bg-[#faf8f5] border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-800 font-medium cursor-pointer"
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200/80">
                  <span className="text-[11px] font-semibold text-emerald-900 block mb-1">
                    Notification Preview:
                  </span>
                  <div className="bg-white border border-emerald-100 p-2.5 rounded-lg text-xs text-stone-800 shadow-2xs flex items-center gap-2">
                    <span className="text-base">🌿</span>
                    <div>
                      <span className="font-semibold block text-[11px]">A Gentle Moment</span>
                      <span className="text-stone-600 text-[11px]">A quiet moment for yourself is waiting.</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 6: Data Sovereignty & Export */}
        <div className="bg-white border border-[#e5dfd6] rounded-2xl p-6 sm:p-7 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-serif text-lg font-semibold text-stone-900">
                Data Sovereignty & Export
              </h3>
              <p className="text-xs text-stone-500">
                Your memories belong entirely to you. Download your complete journal archive in open formats.
              </p>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
              Full Portability
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-4 rounded-xl bg-[#faf8f5] border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-900 shrink-0">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold text-stone-800 block">Download Complete Archive</span>
                  <span className="text-[11px] text-stone-500">
                    Exports {entries.length} entries with clear separation between your notes and reflections. Your journal export contains your journal content and reflections—not internal processing data.
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleExportJSON}
                  className="px-3 py-1.5 rounded-lg bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 font-medium text-xs transition cursor-pointer"
                >
                  Export JSON
                </button>
                <button
                  type="button"
                  onClick={handleExportMarkdown}
                  className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-medium text-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Export Markdown
                </button>
              </div>
            </div>

            {exportSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{exportSuccess}</span>
              </div>
            )}
          </div>
        </div>

        {/* Section 7: Danger Zone — Delete My Journal Data */}
        <div className="bg-white border border-rose-200 rounded-2xl p-6 sm:p-7 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-rose-50 text-rose-700">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-semibold text-rose-900">
                  Delete My Journal Data
                </h3>
                <p className="text-xs text-rose-700/80">
                  Permanently erase your journal entries, reflections, memory connections, saved places, insights, and wins.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-100 text-rose-900 border border-rose-200">
              Irreversible
            </span>
          </div>

          <div className="p-4 rounded-xl bg-rose-50/50 border border-rose-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-semibold text-rose-950 block">Permanent Data Wipe</span>
              <span className="text-[11px] text-rose-800/80">
                Related memory connections are removed with your journal data. Removes entries, reflections, threads, loops, receipts, and insights completely.
              </span>
            </div>
            <button
              type="button"
              id="btn-delete-all-data"
              onClick={() => setShowDeleteModal(true)}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs transition cursor-pointer shrink-0 shadow-2xs"
            >
              Delete My Journal Data
            </button>
          </div>
        </div>

        {/* Section 8: Your Privacy & Control */}
        <div className="p-5 rounded-2xl bg-stone-100/70 border border-stone-200/80 text-xs text-stone-600 space-y-2">
          <div className="flex items-center gap-1.5 font-semibold text-stone-800">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Your Privacy & Control</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            • <strong>Your journal stays yours:</strong> Your journal stays separate from everyone else's.<br />
            • <strong>You decide what AI can use:</strong> Each moment can stay private, be reflected on once, or be allowed to connect with future memories. Private-only moments stay private and are not used for AI reflection. One-time reflections are not used in future memory connections.<br />
            • <strong>Complete data control:</strong> When you delete your journal data, related memory connections are removed too.<br />
            • <strong>Private and secure:</strong> Your preferences and entries are stored securely in your private journal.
          </p>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-stone-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Preferences are stored securely in your private user profile.</span>
          </div>

          <div className="flex items-center gap-3">
            {saveSuccess && (
              <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                <Check className="w-4 h-4" /> Saved!
              </span>
            )}
            <button
              id="btn-save-settings"
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{isSaving ? 'Saving...' : 'Save Preferences'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5 text-rose-700">
                <div className="p-2 rounded-xl bg-rose-100">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-stone-900">
                    Delete All Journal Data?
                  </h3>
                  <span className="text-[11px] text-rose-700 font-medium">This action cannot be undone</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText('');
                  setDeleteError(null);
                }}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              This will permanently erase your journal entries, reflections, memory connections, saved places, insights, and wins. Related memory connections are removed with your journal data.
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-stone-700 block">
                Type <span className="font-mono text-rose-800 select-all font-bold">DELETE MY JOURNAL</span> to confirm:
              </label>
              <input
                type="text"
                id="input-confirm-delete"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE MY JOURNAL"
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 font-mono"
              />
            </div>

            {deleteError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {deleteError}
              </div>
            )}

            {deleteSuccess && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>All journal data wiped successfully. Redirecting...</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText('');
                  setDeleteError(null);
                }}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-delete-proceed"
                onClick={handleDeleteAll}
                disabled={deleteConfirmText.trim() !== 'DELETE MY JOURNAL' || isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{isDeleting ? 'Deleting...' : 'Permanently Delete Everything'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
