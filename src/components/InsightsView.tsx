import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Calendar as CalendarIcon, 
  Flame, 
  Trophy, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  BookOpen, 
  CheckCircle2, 
  HelpCircle, 
  ArrowRight,
  RefreshCw,
  Eye
} from 'lucide-react';
import { 
  JournalEntry, 
  JournalMood, 
  WeeklyReflection, 
  MemoryReceipt,
  JournalStreak
} from '../types';
import { authenticatedFetch } from '../api/authClient';
import { MOOD_THEMES, getMoodTheme } from '../theme/moodThemes';

interface InsightsViewProps {
  entries: JournalEntry[];
  onOpenReceipt: (receipt: MemoryReceipt) => void;
  onSelectEntry: (entry: JournalEntry) => void;
  onNavigateToWins: () => void;
}

export const InsightsView: React.FC<InsightsViewProps> = ({
  entries,
  onOpenReceipt,
  onSelectEntry,
  onNavigateToWins,
}) => {
  const [streakData, setStreakData] = useState<JournalStreak>({
    currentStreak: 0,
    longestStreak: 0,
    daysJournaledThisWeek: 0,
    encouragingMessage: 'A gentle pause in journaling. Ready whenever you are.',
  });
  const [moodCounts, setMoodCounts] = useState<Record<string, number>>({
    peaceful: 0,
    energized: 0,
    thoughtful: 0,
    grateful: 0,
    stressed: 0,
    neutral: 0,
  });
  const [calendarDays, setCalendarDays] = useState<Record<string, any[]>>({});
  const [totalWins, setTotalWins] = useState(0);
  const [isLoadingInsights, setIsLoadingInsights] = useState(true);

  // Calendar Navigation
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const [selectedMoodFilter, setSelectedMoodFilter] = useState<JournalMood | 'ALL'>('ALL');

  // Weekly Reflection State
  const [activeReflection, setActiveReflection] = useState<WeeklyReflection | null>(null);
  const [isGeneratingReflection, setIsGeneratingReflection] = useState(false);
  const [reflectionError, setReflectionError] = useState<string | null>(null);
  const [sparseNotice, setSparseNotice] = useState<string | null>(null);
  const [savedReflections, setSavedReflections] = useState<WeeklyReflection[]>([]);

  // Load Insights Summary
  const fetchInsights = async () => {
    setIsLoadingInsights(true);
    try {
      const res = await authenticatedFetch('/api/journal/insights/summary');
      if (res.ok) {
        const data = await res.json();
        if (data.streak) setStreakData(data.streak);
        if (data.moodCounts) setMoodCounts(data.moodCounts);
        if (data.calendarDays) setCalendarDays(data.calendarDays);
        if (data.totalWins !== undefined) setTotalWins(data.totalWins);
      }
    } catch (err) {
      console.warn('Failed to load insights summary:', err);
    } finally {
      setIsLoadingInsights(false);
    }
  };

  // Load Past Weekly Reflections
  const fetchWeeklyReflections = async () => {
    try {
      const res = await authenticatedFetch('/api/journal/weekly-reflections');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.reflections)) {
          setSavedReflections(data.reflections);
          if (data.reflections.length > 0 && !activeReflection) {
            setActiveReflection(data.reflections[0]);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to fetch weekly reflections:', err);
    }
  };

  useEffect(() => {
    fetchInsights();
    fetchWeeklyReflections();
  }, [entries]);

  // Trigger Weekly Reflection Synthesis
  const handleWrapUpWeek = async () => {
    setIsGeneratingReflection(true);
    setReflectionError(null);
    setSparseNotice(null);

    try {
      const res = await authenticatedFetch('/api/journal/weekly-reflection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        throw new Error('Failed to generate weekly reflection');
      }

      const data = await res.json();
      if (data.sparse) {
        setSparseNotice(data.message || 'You have only a few moments recorded this week so far.');
      } else if (data.reflection) {
        setActiveReflection(data.reflection);
        setSavedReflections((prev) => [data.reflection, ...prev.filter((r) => r.id !== data.reflection.id)]);
      }
    } catch (err: any) {
      setReflectionError(err?.message || 'Could not synthesize weekly reflection');
    } finally {
      setIsGeneratingReflection(false);
    }
  };

  // Calendar Grid Calculations
  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = lastDayOfMonth.getDate();

  const prevMonth = () => setCurrentMonthDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonthDate(new Date(year, month + 1, 1));

  // Compute total entries for mood percentages
  const totalMoodEntries = entries.filter((e) => Boolean(e.mood)).length;

  // Filter entries for selected calendar day
  const selectedDayEntries = selectedCalendarDate && calendarDays[selectedCalendarDate] 
    ? calendarDays[selectedCalendarDate].map((d) => entries.find((e) => e.id === d.id)).filter(Boolean) as JournalEntry[]
    : [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* 1. POSITIVE STREAK & SUPPORT BANNER */}
      <div className="bg-stone-900 dark:bg-stone-900 border border-stone-800 rounded-2xl p-6 text-stone-100 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-medium text-sm tracking-wide">
              <Flame className="w-5 h-5 text-amber-400" />
              <span>Positive Journaling Rhythm</span>
            </div>
            <h2 className="text-2xl font-serif tracking-tight text-white">
              {streakData.encouragingMessage}
            </h2>
            <p className="text-stone-400 text-sm max-w-xl">
              Reflection without guilt or pressure. Every entry preserves your inner clarity and grows your personal memory archive.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 border-t md:border-t-0 md:border-l border-stone-800 pt-4 md:pt-0 md:pl-6">
            <div className="text-center md:text-left">
              <div className="text-2xl font-semibold text-stone-100">{streakData.currentStreak}</div>
              <div className="text-xs text-stone-400">Current Days</div>
            </div>
            <div className="text-center md:text-left">
              <div className="text-2xl font-semibold text-stone-100">{streakData.daysJournaledThisWeek} / 7</div>
              <div className="text-xs text-stone-400">This Week</div>
            </div>
            <div className="text-center md:text-left">
              <div className="text-2xl font-semibold text-stone-100">{streakData.longestStreak}</div>
              <div className="text-xs text-stone-400">Longest Run</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MAIN TWO-COLUMN DASHBOARD (MOOD CALENDAR & WEEKLY REFLECTION) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN: MOOD CALENDAR & MOOD DISTRIBUTION (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Mood Calendar Card */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <CalendarIcon className="w-5 h-5 text-stone-600 dark:text-stone-400" />
                <h3 className="font-serif text-lg text-stone-900 dark:text-stone-100">
                  Mood Calendar
                </h3>
              </div>

              {/* Month Navigation */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-stone-700 dark:text-stone-300">
                  {currentMonthDate.toLocaleDateString('default', { month: 'long', year: 'numeric' })}
                </span>
                <div className="flex items-center border border-stone-200 dark:border-stone-700 rounded-lg overflow-hidden">
                  <button
                    onClick={prevMonth}
                    className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-400 transition"
                    title="Previous Month"
                    id="btn-calendar-prev"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={nextMonth}
                    className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-400 transition"
                    title="Next Month"
                    id="btn-calendar-next"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Mood Filter Chips */}
            <div className="flex flex-wrap items-center gap-2 mb-4 pb-3 border-b border-stone-100 dark:border-stone-800">
              <span className="text-xs text-stone-400 font-medium mr-1">Filter:</span>
              <button
                onClick={() => setSelectedMoodFilter('ALL')}
                className={`px-2.5 py-1 text-xs rounded-full transition ${
                  selectedMoodFilter === 'ALL'
                    ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 font-medium'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200'
                }`}
                id="filter-mood-all"
              >
                All
              </button>
              {(['peaceful', 'thoughtful', 'energized', 'grateful', 'stressed', 'neutral'] as JournalMood[]).map((m) => {
                const theme = getMoodTheme(m);
                const isSelected = selectedMoodFilter === m;
                return (
                  <button
                    key={m}
                    onClick={() => setSelectedMoodFilter(isSelected ? 'ALL' : m)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full transition capitalize ${
                      isSelected
                        ? `${theme.accentBg} ${theme.accentText} font-semibold ring-1 ${theme.accentBorder}`
                        : 'bg-stone-100 dark:bg-stone-800/60 text-stone-600 dark:text-stone-400 hover:bg-stone-200'
                    }`}
                    id={`filter-mood-${m}`}
                  >
                    <span className={`w-2 h-2 rounded-full ${theme.dotColor}`} />
                    {m}
                  </button>
                );
              })}
            </div>

            {/* Day of Week Headers */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-stone-400 mb-2">
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
              <div>Sun</div>
            </div>

            {/* Calendar Cells Grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Blank cells for offset */}
              {Array.from({ length: startDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="h-14 rounded-lg bg-stone-50/50 dark:bg-stone-900/20" />
              ))}

              {/* Month Days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const dayEntries = calendarDays[dateKey] || [];
                const hasEntries = dayEntries.length > 0;
                
                // Filter matching entries
                const filteredDayEntries = selectedMoodFilter === 'ALL'
                  ? dayEntries
                  : dayEntries.filter((e) => (e.mood || 'peaceful').toLowerCase() === selectedMoodFilter.toLowerCase());

                const isSelectedDate = selectedCalendarDate === dateKey;
                const isToday = new Date().toISOString().slice(0, 10) === dateKey;

                return (
                  <div
                    key={dateKey}
                    onClick={() => {
                      if (hasEntries) {
                        setSelectedCalendarDate(isSelectedDate ? null : dateKey);
                      }
                    }}
                    className={`h-14 p-1.5 rounded-lg border transition flex flex-col justify-between ${
                      isSelectedDate
                        ? 'border-stone-900 dark:border-stone-100 bg-stone-50 dark:bg-stone-800'
                        : isToday
                        ? 'border-amber-300 dark:border-amber-700 bg-amber-50/30 dark:bg-amber-950/20'
                        : hasEntries
                        ? 'border-stone-200 dark:border-stone-800 hover:border-stone-400 dark:hover:border-stone-600 bg-white dark:bg-stone-900 cursor-pointer'
                        : 'border-transparent bg-stone-50/40 dark:bg-stone-900/40 text-stone-400'
                    }`}
                    id={`cal-cell-${dateKey}`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className={`font-mono text-[11px] ${isToday ? 'font-bold text-amber-600 dark:text-amber-400' : 'text-stone-700 dark:text-stone-300'}`}>
                        {dayNum}
                      </span>
                      {hasEntries && (
                        <span className="text-[10px] text-stone-400 font-mono">
                          {dayEntries.length}
                        </span>
                      )}
                    </div>

                    {/* Mood indicator dots */}
                    <div className="flex flex-wrap gap-1 items-center">
                      {filteredDayEntries.slice(0, 3).map((item, idx) => {
                        const theme = getMoodTheme(item.mood as JournalMood);
                        return (
                          <span
                            key={idx}
                            className={`w-2 h-2 rounded-full ${theme.dotColor}`}
                            title={`${item.title} (${item.mood})`}
                          />
                        );
                      })}
                      {filteredDayEntries.length > 3 && (
                        <span className="text-[9px] text-stone-400 leading-none">
                          +{filteredDayEntries.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Date Entries List */}
            {selectedCalendarDate && (
              <div className="mt-4 p-4 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-stone-700 dark:text-stone-200 tracking-wide uppercase">
                    Memories from {selectedCalendarDate} ({selectedDayEntries.length})
                  </span>
                  <button
                    onClick={() => setSelectedCalendarDate(null)}
                    className="text-xs text-stone-400 hover:text-stone-600 transition"
                  >
                    Close
                  </button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedDayEntries.map((entry) => {
                    const theme = getMoodTheme(entry.mood);
                    return (
                      <div
                        key={entry.id}
                        onClick={() => onSelectEntry(entry)}
                        className="p-2.5 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-stone-400 transition cursor-pointer flex items-center justify-between"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${theme.dotColor}`} />
                            <span className="text-sm font-medium text-stone-900 dark:text-stone-100">
                              {entry.title}
                            </span>
                          </div>
                          <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-1">
                            {entry.content}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-stone-400 flex-shrink-0" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Mood Distribution Card */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm space-y-4">
            <h4 className="font-serif text-base text-stone-900 dark:text-stone-100">
              Mood Trends & Balance
            </h4>

            {totalMoodEntries === 0 ? (
              <p className="text-sm text-stone-500 italic">No mood records yet. Moods will populate as you journal.</p>
            ) : (
              <div className="space-y-3">
                {/* Horizontal Bar Breakdown */}
                <div className="h-3 w-full rounded-full overflow-hidden flex bg-stone-100 dark:bg-stone-800">
                  {(['peaceful', 'thoughtful', 'energized', 'grateful', 'stressed', 'neutral'] as JournalMood[]).map((m) => {
                    const count = moodCounts[m] || 0;
                    if (count === 0) return null;
                    const pct = (count / totalMoodEntries) * 100;
                    const theme = getMoodTheme(m);
                    return (
                      <div
                        key={m}
                        style={{ width: `${pct}%` }}
                        className={`${theme.dotColor} h-full transition-all duration-500`}
                        title={`${m}: ${count} (${Math.round(pct)}%)`}
                      />
                    );
                  })}
                </div>

                {/* Mood Counts Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                  {(['peaceful', 'thoughtful', 'energized', 'grateful', 'stressed', 'neutral'] as JournalMood[]).map((m) => {
                    const count = moodCounts[m] || 0;
                    const pct = totalMoodEntries > 0 ? Math.round((count / totalMoodEntries) * 100) : 0;
                    const theme = getMoodTheme(m);
                    return (
                      <div
                        key={m}
                        className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-100 dark:border-stone-800 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${theme.dotColor}`} />
                          <span className="text-xs font-medium text-stone-700 dark:text-stone-300 capitalize">
                            {m}
                          </span>
                        </div>
                        <span className="text-xs font-mono text-stone-500">
                          {count} ({pct}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: WEEKLY REFLECTION & CAREER WINS SNAPSHOT (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Weekly Reflection ("Wrap Up My Week") Card */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h3 className="font-serif text-lg text-stone-900 dark:text-stone-100">
                  Weekly Reflection
                </h3>
              </div>
              <button
                onClick={handleWrapUpWeek}
                disabled={isGeneratingReflection}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-stone-800 dark:hover:bg-stone-200 text-xs font-medium rounded-lg shadow-sm transition disabled:opacity-50"
                id="btn-wrap-up-week"
              >
                {isGeneratingReflection ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Synthesizing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Wrap Up My Week</span>
                  </>
                )}
              </button>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Synthesizes thoughts, themes, and confirmed wins from the past 7 days across your reflections.
              </p>
              <p className="text-[11px] text-stone-400 dark:text-stone-500">
                <span className="font-medium text-stone-500 dark:text-stone-400">Note:</span> Only uses memories you've allowed to connect.
              </p>
            </div>

            {sparseNotice && (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-200 space-y-1">
                <div className="font-medium">Gentle Observation:</div>
                <p>{sparseNotice}</p>
              </div>
            )}

            {reflectionError && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 text-xs text-rose-700 dark:text-rose-300">
                {reflectionError}
              </div>
            )}

            {/* Active Reflection Presentation */}
            {activeReflection ? (
              <div className="space-y-4 pt-2 border-t border-stone-100 dark:border-stone-800">
                <div className="flex items-center justify-between text-xs text-stone-400">
                  <span className="font-mono">
                    {activeReflection.startDate} → {activeReflection.endDate}
                  </span>
                  <span>{activeReflection.entryCount} moments synthesized</span>
                </div>

                {/* Meaningful Moments */}
                {activeReflection.meaningfulMoments.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
                      Meaningful Moments
                    </span>
                    <ul className="space-y-1.5 text-xs text-stone-600 dark:text-stone-300 list-disc list-inside">
                      {activeReflection.meaningfulMoments.map((m, i) => (
                        <li key={i} className="leading-relaxed">{m}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Common Themes */}
                {activeReflection.commonThemes.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
                      Themes & Threads
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {activeReflection.commonThemes.map((t, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 text-xs rounded-md bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Gentle Observations */}
                {activeReflection.gentleObservations.length > 0 && (
                  <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 text-xs text-stone-700 dark:text-stone-300 space-y-1">
                    <span className="font-medium text-stone-900 dark:text-stone-100">Weekly Flow:</span>
                    {activeReflection.gentleObservations.map((obs, i) => (
                      <p key={i} className="italic">{obs}</p>
                    ))}
                  </div>
                )}

                {/* Reflection Prompt */}
                {activeReflection.reflectionPrompt && (
                  <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-800/40 text-xs text-indigo-900 dark:text-indigo-200 space-y-1">
                    <span className="font-semibold flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      Prompt for Next Week:
                    </span>
                    <p className="font-serif text-sm italic">{activeReflection.reflectionPrompt}</p>
                  </div>
                )}

                {/* Memory Receipts */}
                {activeReflection.receipts && activeReflection.receipts.length > 0 && (
                  <div className="pt-2">
                    <button
                      onClick={() => onOpenReceipt(activeReflection.receipts[0])}
                      className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 font-medium transition"
                      id="btn-view-weekly-receipts"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Memory Receipts for this Synthesis</span>
                    </button>
                  </div>
                )}
              </div>
            ) : !sparseNotice ? (
              <div className="py-8 text-center space-y-3">
                <Clock className="w-8 h-8 text-stone-300 dark:text-stone-600 mx-auto" />
                <p className="text-xs text-stone-500 max-w-xs mx-auto">
                  Click "Wrap Up My Week" above to generate your observant synthesis of the past 7 days.
                </p>
              </div>
            ) : null}

            {/* Past Saved Reflections List */}
            {savedReflections.length > 1 && (
              <div className="pt-4 border-t border-stone-100 dark:border-stone-800 space-y-2">
                <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                  Earlier Reflections
                </span>
                <div className="space-y-1.5">
                  {savedReflections.slice(1, 4).map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setActiveReflection(r)}
                      className="w-full text-left p-2 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800 text-xs text-stone-600 dark:text-stone-300 flex items-center justify-between transition"
                    >
                      <span>{r.startDate} to {r.endDate}</span>
                      <span className="text-[10px] text-stone-400">{r.entryCount} moments</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Career Wins Vault Quick Banner */}
          <div className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-stone-800 dark:text-stone-200">
                <Trophy className="w-5 h-5 text-amber-500" />
                <h4 className="font-serif text-base font-medium">Career Wins Vault</h4>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-mono font-medium">
                {totalWins} Verified
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              A private ledger for professional milestones, shipped projects, and verified career highlights.
            </p>
            <button
              onClick={onNavigateToWins}
              className="inline-flex items-center gap-1 text-xs text-stone-800 dark:text-stone-200 font-medium hover:underline pt-1"
              id="btn-goto-wins-vault"
            >
              <span>Explore Wins Vault</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
