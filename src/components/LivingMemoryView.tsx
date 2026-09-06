import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Layers, 
  GitBranch, 
  Clock, 
  HelpCircle, 
  Plus, 
  Check, 
  Trash2, 
  Edit3, 
  RefreshCw, 
  ShieldCheck, 
  FileText,
  AlertCircle,
  Calendar,
  MessageSquare,
  CheckCircle2,
  XCircle,
  ExternalLink,
  X
} from 'lucide-react';
import { 
  LifeThread, 
  UnfinishedLoop, 
  AIMemoryItem, 
  ThenNowComparison, 
  MemoryReceipt,
  JournalEntry 
} from '../types';
import { auth } from '../firebase';
import { authenticatedFetch } from '../api/authClient';

interface LivingMemoryViewProps {
  entries: JournalEntry[];
  onSelectEntry: (entryId: string) => void;
  onOpenReceipt: (receipt: MemoryReceipt) => void;
}

export function cleanThreadTitle(title: string): string {
  if (!title) return 'Connected Reflections';
  let cleaned = title.trim();
  // Strip awkward 'Reflections on ' if followed by a quote or truncated fragment
  if (cleaned.toLowerCase().startsWith('reflections on ')) {
    const remainder = cleaned.slice(15).trim();
    if (remainder.length > 0) {
      cleaned = remainder.charAt(0).toUpperCase() + remainder.slice(1);
    }
  }
  // Strip trailing punctuation / ellipsis / broken words
  cleaned = cleaned.replace(/\.{2,}$/, '').replace(/[,;:\-\s]+$/, '').trim();
  if (cleaned.length > 55) {
    cleaned = cleaned.slice(0, 52).replace(/\s+\S*$/, '') + '…';
  }
  return cleaned || 'Personal Growth';
}

export function deduplicateThreads(threads: LifeThread[]): LifeThread[] {
  const seenTitles = new Set<string>();
  const uniqueThreads: LifeThread[] = [];

  for (const t of threads) {
    const cleanedTitle = cleanThreadTitle(t.title).toLowerCase();
    if (seenTitles.has(cleanedTitle)) continue;
    seenTitles.add(cleanedTitle);

    // Check overlap with existing unique threads (>80% source moment match)
    const currentSources = new Set(t.sourceEntryIds || []);
    const isDuplicateSources = uniqueThreads.some((existing) => {
      const existingSources = new Set(existing.sourceEntryIds || []);
      if (currentSources.size === 0 || existingSources.size === 0) return false;
      let matchCount = 0;
      for (const id of currentSources) {
        if (existingSources.has(id)) matchCount++;
      }
      const similarity = matchCount / Math.min(currentSources.size, existingSources.size);
      return similarity >= 0.8;
    });

    if (!isDuplicateSources) {
      uniqueThreads.push({
        ...t,
        title: cleanThreadTitle(t.title),
      });
    }
  }
  return uniqueThreads;
}

export const LivingMemoryView: React.FC<LivingMemoryViewProps> = ({
  entries,
  onSelectEntry,
  onOpenReceipt,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'threads' | 'thenNow' | 'loops' | 'aiMemory'>('threads');
  
  // Data state
  const [lifeThreads, setLifeThreads] = useState<LifeThread[]>([]);
  const [unfinishedLoops, setUnfinishedLoops] = useState<UnfinishedLoop[]>([]);
  const [aiMemories, setAiMemories] = useState<AIMemoryItem[]>([]);
  const [thenNowComparisons, setThenNowComparisons] = useState<ThenNowComparison[]>([]);
  const [totalConnectedMoments, setTotalConnectedMoments] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Operation states
  const [isSuggestingThreads, setIsSuggestingThreads] = useState(false);
  const [isDetectingLoops, setIsDetectingLoops] = useState(false);
  const [isGeneratingThenNow, setIsGeneratingThenNow] = useState(false);
  
  // Edit states
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editThreadTitle, setEditThreadTitle] = useState('');
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
  const [editMemoryConcept, setEditMemoryConcept] = useState('');
  const [resolvingLoopId, setResolvingLoopId] = useState<string | null>(null);
  const [loopResolutionText, setLoopResolutionText] = useState('');

  // Count eligible connectable moments
  const eligibleEntries = entries.filter(
    (e) => e.memoryContract === 'MAY_CONNECT' || e.memoryContract === 'IMPORTANT_MEMORY'
  );

  const fetchLivingMemory = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    setError(null);
    try {
      const res = await authenticatedFetch('/api/journal/living-memory');
      if (!res || !res.ok) throw new Error('Failed to load Living Memory overview');

      const data = await res.json();
      if (data.overview) {
        setLifeThreads(deduplicateThreads(data.overview.lifeThreads || []));
        setUnfinishedLoops(data.overview.unfinishedLoops || []);
        setAiMemories(data.overview.aiMemories || []);
        setThenNowComparisons(data.overview.thenNowComparisons || []);
        setTotalConnectedMoments(data.overview.totalConnectedMoments || eligibleEntries.length);
        setError(null);
      }
    } catch (err: any) {
      console.error('Error fetching living memory:', err);
      setError('We couldn’t refresh your story connections just now. You can keep journaling and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auth.currentUser) {
      fetchLivingMemory();
    }
  }, []);

  // Life Threads actions
  const handleSuggestThreads = async () => {
    if (!auth.currentUser) return;
    setIsSuggestingThreads(true);
    setError(null);
    try {
      const res = await authenticatedFetch('/api/journal/life-threads/suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ entries: eligibleEntries }),
      });
      if (!res) return;
      const data = await res.json();
      if (data.threads) {
        await fetchLivingMemory();
      } else if (data.message) {
        setError(data.message);
      }
    } catch (err: any) {
      console.error('Failed to discover threads:', err);
      setError('We couldn’t discover new life threads right now. You can keep journaling and try again.');
    } finally {
      setIsSuggestingThreads(false);
    }
  };

  const handleUpdateThreadStatus = async (threadId: string, status: 'APPROVED' | 'DISMISSED') => {
    try {
      await authenticatedFetch(`/api/journal/life-threads/${threadId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      await fetchLivingMemory();
    } catch (err) {
      console.error('Error updating thread status:', err);
    }
  };

  const handleSaveRenameThread = async (threadId: string) => {
    if (!editThreadTitle.trim()) return;
    try {
      await authenticatedFetch(`/api/journal/life-threads/${threadId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: editThreadTitle.trim() }),
      });
      setEditingThreadId(null);
      await fetchLivingMemory();
    } catch (err) {
      console.error('Error renaming thread:', err);
    }
  };

  const handleDeleteThread = async (threadId: string) => {
    try {
      await authenticatedFetch(`/api/journal/life-threads/${threadId}`, {
        method: 'DELETE',
      });
      await fetchLivingMemory();
    } catch (err) {
      console.error('Error deleting thread:', err);
    }
  };

  const handleRemoveEntryFromThread = async (thread: LifeThread, entryIdToRemove: string) => {
    const updated = thread.sourceEntryIds.filter((id) => id !== entryIdToRemove);
    try {
      if (updated.length < 2) {
        await handleDeleteThread(thread.id);
      } else {
        await authenticatedFetch(`/api/journal/life-threads/${thread.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sourceEntryIds: updated }),
        });
        await fetchLivingMemory();
      }
    } catch (err) {
      console.error('Error removing entry from thread:', err);
    }
  };

  // Then & Now actions
  const handleGenerateThenNow = async () => {
    if (!auth.currentUser) return;
    setIsGeneratingThenNow(true);
    setError(null);
    try {
      const res = await authenticatedFetch('/api/journal/then-now/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ entries: eligibleEntries }),
      });
      if (!res) return;
      const data = await res.json();
      if (res.ok && data.comparison) {
        setThenNowComparisons([data.comparison, ...thenNowComparisons]);
        setError(null);
      } else {
        setError(data.message || data.error || 'Need at least 2 connectable entries to generate a Then & Now comparison.');
      }
    } catch (err: any) {
      console.error('Error generating Then Now:', err);
      setError('We couldn’t create a Then & Now comparison right now. Please try again in a moment.');
    } finally {
      setIsGeneratingThenNow(false);
    }
  };

  // Unfinished Loops actions
  const handleDetectLoops = async () => {
    if (!auth.currentUser) return;
    setIsDetectingLoops(true);
    setError(null);
    try {
      const res = await authenticatedFetch('/api/journal/unfinished-loops/detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ entries: eligibleEntries }),
      });
      if (!res) return;
      const data = await res.json();
      if (data.loops) {
        await fetchLivingMemory();
      }
    } catch (err) {
      console.error('Error detecting loops:', err);
      setError('We couldn’t check for open loops right now. You can keep journaling and try again.');
    } finally {
      setIsDetectingLoops(false);
    }
  };

  const handleUpdateLoopStatus = async (loopId: string, status: 'OPEN' | 'RESOLVED' | 'DISMISSED', notes?: string) => {
    try {
      await authenticatedFetch(`/api/journal/unfinished-loops/${loopId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, outcomeNotes: notes }),
      });
      setResolvingLoopId(null);
      setLoopResolutionText('');
      await fetchLivingMemory();
    } catch (err) {
      console.error('Error updating loop status:', err);
    }
  };

  const handleDeleteLoop = async (loopId: string) => {
    try {
      await authenticatedFetch(`/api/journal/unfinished-loops/${loopId}`, {
        method: 'DELETE',
      });
      await fetchLivingMemory();
    } catch (err) {
      console.error('Error deleting loop:', err);
    }
  };

  // AI Memory actions
  const handleConfirmMemory = async (memoryId: string) => {
    try {
      await authenticatedFetch(`/api/journal/ai-memory/${memoryId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'CONFIRMED', userConfirmed: true }),
      });
      await fetchLivingMemory();
    } catch (err) {
      console.error('Error confirming memory:', err);
    }
  };

  const handleSaveEditMemory = async (memoryId: string) => {
    if (!editMemoryConcept.trim()) return;
    try {
      await authenticatedFetch(`/api/journal/ai-memory/${memoryId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ concept: editMemoryConcept.trim(), status: 'CORRECTED', userConfirmed: true }),
      });
      setEditingMemoryId(null);
      await fetchLivingMemory();
    } catch (err) {
      console.error('Error editing memory:', err);
    }
  };

  const handleDeleteMemory = async (memoryId: string) => {
    try {
      await authenticatedFetch(`/api/journal/ai-memory/${memoryId}`, {
        method: 'DELETE',
      });
      await fetchLivingMemory();
    } catch (err) {
      console.error('Error deleting memory:', err);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Banner Header */}
      <div className="bg-[#fcfaf7] border border-[#e8e2d8] rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 border border-amber-300/60 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <h2 className="font-serif text-2xl font-medium text-stone-900">
                Living Memory
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-stone-600 font-sans max-w-xl">
              See how memories connect across time. You maintain full control over what becomes part of your story with explicit memory receipts.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div 
              className="px-3.5 py-1.5 bg-white border border-[#e5dfd6] rounded-xl text-center cursor-help"
              title="Moments you've allowed Living Memory to connect. Each story may use only the moments related to it."
            >
              <div className="flex items-center justify-center gap-1">
                <span className="text-[10px] uppercase font-semibold text-stone-500 block">
                  Connectable Moments
                </span>
                <HelpCircle className="w-3 h-3 text-stone-400" />
              </div>
              <span className="font-serif text-base font-semibold text-amber-950">
                {eligibleEntries.length}
              </span>
            </div>
            <button
              onClick={fetchLivingMemory}
              disabled={loading}
              className="p-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 transition-all cursor-pointer"
              title="Refresh Living Memory"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-800' : ''}`} />
            </button>
          </div>
        </div>

        {/* Sub-Tab Navigation Controls: Balanced 2x2 Desktop Grid with Full Readable Labels */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 mt-5 pt-4 border-t border-[#eee7dd]">
          <button
            id="subtab-living-memory-threads"
            type="button"
            onClick={() => setActiveSubTab('threads')}
            className={`w-full justify-between sm:justify-center px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-2 cursor-pointer text-center ${
              activeSubTab === 'threads'
                ? 'bg-amber-950 text-white font-semibold shadow-xs'
                : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-500" />
              <span className="whitespace-nowrap">Your Story (Life Threads)</span>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
              activeSubTab === 'threads' ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-600'
            }`}>
              {lifeThreads.filter((t) => t.status !== 'DISMISSED').length}
            </span>
          </button>

          <button
            id="subtab-living-memory-then-now"
            type="button"
            onClick={() => setActiveSubTab('thenNow')}
            className={`w-full justify-between sm:justify-center px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-2 cursor-pointer text-center ${
              activeSubTab === 'thenNow'
                ? 'bg-amber-950 text-white font-semibold shadow-xs'
                : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Clock className="w-3.5 h-3.5 shrink-0 text-amber-600" />
              <span className="whitespace-nowrap">Then & Now</span>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
              activeSubTab === 'thenNow' ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-600'
            }`}>
              {thenNowComparisons.length}
            </span>
          </button>

          <button
            id="subtab-living-memory-loops"
            type="button"
            onClick={() => setActiveSubTab('loops')}
            className={`w-full justify-between sm:justify-center px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-2 cursor-pointer text-center ${
              activeSubTab === 'loops'
                ? 'bg-amber-950 text-white font-semibold shadow-xs'
                : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <HelpCircle className="w-3.5 h-3.5 shrink-0 text-amber-700" />
              <span className="whitespace-nowrap">Still Wondering (Open Loops)</span>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
              activeSubTab === 'loops' ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-600'
            }`}>
              {unfinishedLoops.filter((l) => l.status === 'OPEN').length}
            </span>
          </button>

          <button
            id="subtab-living-memory-ai-memory"
            type="button"
            onClick={() => setActiveSubTab('aiMemory')}
            className={`w-full justify-between sm:justify-center px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-2 cursor-pointer text-center ${
              activeSubTab === 'aiMemory'
                ? 'bg-amber-950 text-white font-semibold shadow-xs'
                : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-500" />
              <span className="whitespace-nowrap">What Gemini Remembers</span>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
              activeSubTab === 'aiMemory' ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-600'
            }`}>
              {aiMemories.length}
            </span>
          </button>
        </div>
      </div>

      {error && (
        <div 
          id="living-memory-error-banner"
          className="p-3.5 sm:p-4 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs sm:text-sm flex items-center justify-between gap-3 shadow-2xs transition-all"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="leading-relaxed">{error}</span>
          </div>
          <button
            type="button"
            id="btn-dismiss-living-memory-error"
            onClick={() => setError(null)}
            className="p-1 rounded-lg text-rose-500 hover:text-rose-800 hover:bg-rose-100 transition-colors cursor-pointer shrink-0"
            title="Dismiss notice"
            aria-label="Dismiss notice"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* SECTION 1: YOUR STORY / LIFE THREADS */}
      {activeSubTab === 'threads' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-stone-200">
            <div>
              <h3 className="font-serif text-base font-medium text-stone-900">
                Connected Life Threads
              </h3>
              <p className="text-xs text-stone-500">
                Emerging themes connecting multiple moments across your journey.
              </p>
            </div>
            <button
              onClick={handleSuggestThreads}
              disabled={isSuggestingThreads || eligibleEntries.length < 2}
              className="px-4 py-2 rounded-xl text-xs font-medium bg-amber-900 text-white hover:bg-amber-950 disabled:opacity-50 transition-all inline-flex items-center gap-1.5"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isSuggestingThreads ? 'animate-spin' : ''}`} />
              <span>{isSuggestingThreads ? 'Discovering...' : 'Discover Life Threads'}</span>
            </button>
          </div>

          {lifeThreads.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-stone-300 p-8">
              <GitBranch className="w-8 h-8 text-stone-300 mx-auto mb-2" />
              <h4 className="font-serif text-base font-medium text-stone-800 mb-1">
                No Life Threads Discovered Yet
              </h4>
              <p className="text-xs text-stone-500 max-w-md mx-auto mb-4">
                As you write entries with "May Connect" or "Important Memory", Gemini can help connect the dots across your journey.
              </p>
              <button
                onClick={handleSuggestThreads}
                disabled={isSuggestingThreads || eligibleEntries.length < 2}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-amber-900 text-white hover:bg-amber-950 transition-all inline-flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Scan My Entries for Threads</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lifeThreads.map((thread) => {
                const isSuggested = thread.status === 'SUGGESTED';
                const threadEntries = entries.filter((e) => thread.sourceEntryIds.includes(e.id));

                return (
                  <div
                    key={thread.id}
                    className={`bg-white border rounded-2xl p-5 shadow-xs transition-all ${
                      isSuggested
                        ? 'border-amber-300/80 bg-gradient-to-b from-amber-50/40 to-white'
                        : 'border-[#e5dfd6]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1">
                        {isSuggested && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-amber-100 text-amber-900 mb-1.5 inline-block">
                            Suggested Connection
                          </span>
                        )}
                        {editingThreadId === thread.id ? (
                          <div className="flex items-center gap-2 mt-1">
                            <input
                              type="text"
                              value={editThreadTitle}
                              onChange={(e) => setEditThreadTitle(e.target.value)}
                              className="px-2 py-1 text-sm border border-stone-300 rounded-lg w-full font-serif font-medium"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveRenameThread(thread.id)}
                              className="p-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <h4 className="font-serif text-base font-semibold text-stone-900 flex items-center gap-2">
                            <span>{thread.title}</span>
                            <button
                              onClick={() => {
                                setEditingThreadId(thread.id);
                                setEditThreadTitle(thread.title);
                              }}
                              className="text-stone-400 hover:text-stone-700 p-0.5"
                              title="Rename Thread"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                          </h4>
                        )}
                        <p className="text-xs text-stone-600 mt-1 font-sans">
                          {thread.description}
                        </p>
                      </div>

                      <button
                        onClick={() => handleDeleteThread(thread.id)}
                        className="text-stone-400 hover:text-rose-600 p-1 rounded-md"
                        title="Delete Thread"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Connected Moments */}
                    <div className="mt-3 pt-3 border-t border-stone-100 space-y-2">
                      <span className="text-[10px] uppercase font-semibold text-stone-400 block tracking-wider">
                        Connected Moments ({threadEntries.length})
                      </span>
                      {threadEntries.map((e) => (
                        <div
                          key={e.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-[#fcfaf7] border border-[#f0e9df] text-xs hover:border-amber-300 transition-all"
                        >
                          <div
                            onClick={() => onSelectEntry(e.id)}
                            className="cursor-pointer flex-1 mr-2"
                          >
                            <span className="font-serif font-medium text-stone-800 block line-clamp-1">
                              {e.title || 'Untitled Moment'}
                            </span>
                            <span className="text-[10px] text-stone-400">
                              {e.createdAt ? new Date(e.createdAt).toLocaleDateString() : ''}
                            </span>
                          </div>
                          <button
                            onClick={() => handleRemoveEntryFromThread(thread, e.id)}
                            className="text-[10px] text-stone-400 hover:text-rose-600 px-1.5 py-0.5 rounded-md hover:bg-stone-100"
                            title="Remove from thread"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                      {isSuggested ? (
                        <div className="flex items-center gap-2 w-full">
                          <button
                            onClick={() => handleUpdateThreadStatus(thread.id, 'APPROVED')}
                            className="flex-1 py-1.5 px-3 rounded-lg text-xs font-medium bg-amber-900 text-white hover:bg-amber-950 flex items-center justify-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve Thread</span>
                          </button>
                          <button
                            onClick={() => handleUpdateThreadStatus(thread.id, 'DISMISSED')}
                            className="py-1.5 px-3 rounded-lg text-xs font-medium bg-stone-100 text-stone-600 hover:bg-stone-200"
                          >
                            Dismiss
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between w-full text-xs text-stone-500">
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-medium text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approved Life Thread</span>
                          </span>
                          <button
                            onClick={() =>
                              onOpenReceipt({
                                id: `rcpt_thread_${thread.id}`,
                                sources: threadEntries.map((e) => ({
                                  id: e.id,
                                  title: e.title,
                                  date: e.createdAt,
                                  excerpt: e.content.slice(0, 150),
                                  lens: e.lens,
                                })),
                                reason: `Life Thread: ${thread.title}`,
                              })
                            }
                            className="text-[11px] text-amber-900 hover:underline flex items-center gap-1"
                          >
                            <ShieldCheck className="w-3 h-3" />
                            <span>Memory Receipt</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: THEN & NOW */}
      {activeSubTab === 'thenNow' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-stone-200">
            <div>
              <h3 className="font-serif text-base font-medium text-stone-900">
                Then & Now Comparisons
              </h3>
              <p className="text-xs text-stone-500">
                Reflect on how your mindset, confidence, and perspective have shifted over time.
              </p>
            </div>
            <button
              onClick={handleGenerateThenNow}
              disabled={isGeneratingThenNow || eligibleEntries.length < 2}
              className="px-4 py-2 rounded-xl text-xs font-medium bg-amber-900 text-white hover:bg-amber-950 disabled:opacity-50 transition-all inline-flex items-center gap-1.5"
            >
              <Clock className={`w-3.5 h-3.5 ${isGeneratingThenNow ? 'animate-spin' : ''}`} />
              <span>{isGeneratingThenNow ? 'Comparing...' : 'Compare Past & Present'}</span>
            </button>
          </div>

          {thenNowComparisons.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-stone-300 p-8">
              <Clock className="w-8 h-8 text-stone-300 mx-auto mb-2" />
              <h4 className="font-serif text-base font-medium text-stone-800 mb-1">
                No Then & Now Comparisons Yet
              </h4>
              <p className="text-xs text-stone-500 max-w-md mx-auto mb-4">
                Click "Compare Past & Present" to pair an earlier moment with a recent reflection and see how you have evolved.
              </p>
              <button
                onClick={handleGenerateThenNow}
                disabled={isGeneratingThenNow || eligibleEntries.length < 2}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-amber-900 text-white hover:bg-amber-950 transition-all inline-flex items-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Generate Then & Now</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {thenNowComparisons.map((tn) => (
                <div
                  key={tn.id}
                  className="bg-white border border-[#e5dfd6] rounded-2xl p-5 shadow-xs"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* THEN */}
                    <div className="p-4 bg-[#faf8f5] rounded-xl border border-stone-200">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-900/80">
                          THEN
                        </span>
                        <span className="text-xs text-stone-400">{tn.thenEntry.date}</span>
                      </div>
                      <h4
                        onClick={() => onSelectEntry(tn.thenEntry.id)}
                        className="font-serif font-medium text-stone-900 text-sm hover:underline cursor-pointer mb-1"
                      >
                        {tn.thenEntry.title}
                      </h4>
                      <p className="text-xs text-stone-600 line-clamp-3 italic">
                        "{tn.thenEntry.excerpt}"
                      </p>
                    </div>

                    {/* NOW */}
                    <div className="p-4 bg-amber-50/40 rounded-xl border border-amber-200/60">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-900">
                          NOW
                        </span>
                        <span className="text-xs text-stone-400">{tn.nowEntry.date}</span>
                      </div>
                      <h4
                        onClick={() => onSelectEntry(tn.nowEntry.id)}
                        className="font-serif font-medium text-stone-900 text-sm hover:underline cursor-pointer mb-1"
                      >
                        {tn.nowEntry.title}
                      </h4>
                      <p className="text-xs text-stone-600 line-clamp-3 italic">
                        "{tn.nowEntry.excerpt}"
                      </p>
                    </div>
                  </div>

                  {/* Gemini Reflection */}
                  <div className="p-4 bg-[#fcfaf7] rounded-xl border border-[#eee7dd]">
                    <div className="flex items-start gap-2.5">
                      <Sparkles className="w-4 h-4 text-amber-800 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 block mb-1">
                          Reflective Perspective
                        </span>
                        <p className="text-xs sm:text-sm text-stone-800 font-sans leading-relaxed">
                          {tn.reflection}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Footer with Receipt */}
                  <div className="mt-3 flex items-center justify-between text-xs text-stone-500">
                    <span className="text-[11px] text-stone-400 italic">
                      {tn.tentative ? 'Tentative perspective for self-reflection' : ''}
                    </span>
                    <button
                      onClick={() => onOpenReceipt(tn.receipt)}
                      className="inline-flex items-center gap-1.5 text-xs text-amber-900 hover:text-amber-950 font-medium hover:underline"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Why these memories? (Receipt)</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: STILL WONDERING / OPEN LOOPS */}
      {activeSubTab === 'loops' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-stone-200">
            <div>
              <h3 className="font-serif text-base font-medium text-stone-900">
                Still Wondering (Unfinished Loops)
              </h3>
              <p className="text-xs text-stone-500">
                Decisions, pending conversations, or upcoming milestones you wrote about that are still unfolding.
              </p>
            </div>
            <button
              onClick={handleDetectLoops}
              disabled={isDetectingLoops || eligibleEntries.length === 0}
              className="px-4 py-2 rounded-xl text-xs font-medium bg-amber-900 text-white hover:bg-amber-950 disabled:opacity-50 transition-all inline-flex items-center gap-1.5"
            >
              <HelpCircle className={`w-3.5 h-3.5 ${isDetectingLoops ? 'animate-spin' : ''}`} />
              <span>{isDetectingLoops ? 'Scanning...' : 'Check for Open Loops'}</span>
            </button>
          </div>

          {unfinishedLoops.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-stone-300 p-8">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <h4 className="font-serif text-base font-medium text-stone-800 mb-1">
                No Unresolved Loops
              </h4>
              <p className="text-xs text-stone-500 max-w-md mx-auto mb-4">
                When you mention pending conversations, interviews, or decisions, Gemini will gently remember to ask how they turned out.
              </p>
              <button
                onClick={handleDetectLoops}
                disabled={isDetectingLoops || eligibleEntries.length === 0}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-amber-900 text-white hover:bg-amber-950 transition-all inline-flex items-center gap-1.5"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Scan Recent Moments</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {unfinishedLoops.map((loop) => {
                const isOpen = loop.status === 'OPEN';
                const isResolved = loop.status === 'RESOLVED';
                const isDismissed = loop.status === 'DISMISSED';

                return (
                  <div
                    key={loop.id}
                    className={`bg-white border rounded-2xl p-5 shadow-xs transition-all ${
                      isOpen
                        ? 'border-amber-200 bg-gradient-to-r from-amber-50/30 to-white'
                        : 'border-stone-200 opacity-80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase ${
                              isOpen
                                ? 'bg-amber-100 text-amber-900'
                                : isResolved
                                ? 'bg-emerald-100 text-emerald-900'
                                : 'bg-stone-100 text-stone-600'
                            }`}
                          >
                            {loop.status}
                          </span>
                          <span className="text-xs text-stone-400">
                            From "{loop.sourceTitle}" ({loop.sourceDate})
                          </span>
                        </div>
                        <p className="font-serif text-base font-medium text-stone-900">
                          {loop.question}
                        </p>
                      </div>

                      <button
                        onClick={() => handleDeleteLoop(loop.id)}
                        className="text-stone-400 hover:text-rose-600 p-1"
                        title="Delete Loop"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Resolution Notes if Resolved */}
                    {loop.outcomeNotes && (
                      <div className="mt-2 p-2.5 bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 rounded-lg">
                        <strong>Resolution:</strong> {loop.outcomeNotes}
                      </div>
                    )}

                    {/* Resolution Form if in progress */}
                    {resolvingLoopId === loop.id && (
                      <div className="mt-3 p-3 bg-white border border-stone-300 rounded-xl space-y-2">
                        <label className="text-xs font-medium text-stone-700 block">
                          How did this turn out?
                        </label>
                        <input
                          type="text"
                          value={loopResolutionText}
                          onChange={(e) => setLoopResolutionText(e.target.value)}
                          placeholder="e.g., The conversation went really well, we reached an agreement..."
                          className="w-full px-3 py-1.5 text-xs border border-stone-300 rounded-lg"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setResolvingLoopId(null)}
                            className="px-2.5 py-1 text-xs text-stone-600 hover:bg-stone-100 rounded-md"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleUpdateLoopStatus(loop.id, 'RESOLVED', loopResolutionText)}
                            className="px-3 py-1 text-xs bg-emerald-700 text-white rounded-md hover:bg-emerald-800"
                          >
                            Save Resolution
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    {isOpen && resolvingLoopId !== loop.id && (
                      <div className="mt-3 pt-3 border-t border-stone-100 flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => setResolvingLoopId(loop.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          <span>Resolve now</span>
                        </button>
                        <button
                          onClick={() => onSelectEntry(loop.sourceEntryId)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-stone-50 text-stone-700 border border-stone-200 hover:bg-stone-100 flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>View Entry</span>
                        </button>
                        <button
                          onClick={() => handleUpdateLoopStatus(loop.id, 'DISMISSED')}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-stone-500 hover:bg-stone-100"
                        >
                          Never ask again
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SECTION 4: WHAT GEMINI REMEMBERS (EDITABLE AI MEMORY) */}
      {activeSubTab === 'aiMemory' && (
        <div className="space-y-4">
          <div className="bg-[#fcfaf7] border border-amber-200/80 rounded-xl p-4">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-amber-800 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-serif text-sm font-medium text-stone-900">
                  Total Memory Sovereignty
                </h4>
                <p className="text-xs text-stone-600 mt-0.5">
                  Your journal belongs to you. Every concept Gemini hypothesizes can be inspected, confirmed, edited, or completely removed from AI memory.
                </p>
              </div>
            </div>
          </div>

          {aiMemories.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-stone-300 p-8">
              <Sparkles className="w-8 h-8 text-stone-300 mx-auto mb-2" />
              <h4 className="font-serif text-base font-medium text-stone-800 mb-1">
                No AI Memory Records Stored
              </h4>
              <p className="text-xs text-stone-500 max-w-md mx-auto mb-4">
                As you converse with the reflection companion and save connectable moments, derived long-term memory items will appear here for your review.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {aiMemories.map((mem) => {
                const isConfirmed = mem.userConfirmed || mem.status === 'CONFIRMED';
                const memorySources = entries.filter((e) => mem.sourceEntryIds?.includes(e.id));

                return (
                  <div
                    key={mem.id}
                    className="bg-white border border-[#e5dfd6] rounded-xl p-4 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                              isConfirmed
                                ? 'bg-emerald-100 text-emerald-900'
                                : 'bg-amber-100 text-amber-900'
                            }`}
                          >
                            {isConfirmed ? 'User-Confirmed Memory' : 'AI Hypothesis'}
                          </span>
                          <span className="text-xs text-stone-400">
                            Derived from {mem.sourceEntryIds?.length || 0} moments
                          </span>
                        </div>

                        {editingMemoryId === mem.id ? (
                          <div className="flex items-center gap-2 mt-1">
                            <input
                              type="text"
                              value={editMemoryConcept}
                              onChange={(e) => setEditMemoryConcept(e.target.value)}
                              className="px-2.5 py-1 text-sm border border-stone-300 rounded-lg w-full font-sans"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveEditMemory(mem.id)}
                              className="p-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <p className="text-sm text-stone-900 font-medium">
                            "{mem.concept}"
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingMemoryId(mem.id);
                            setEditMemoryConcept(mem.concept);
                          }}
                          className="text-stone-400 hover:text-stone-700 p-1"
                          title="Edit Memory"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteMemory(mem.id)}
                          className="text-stone-400 hover:text-rose-600 p-1"
                          title="Delete Memory"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between text-xs">
                      {!isConfirmed ? (
                        <button
                          onClick={() => handleConfirmMemory(mem.id)}
                          className="px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          <span>Confirm this memory</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Confirmed by you</span>
                        </span>
                      )}

                      {memorySources.length > 0 && (
                        <button
                          onClick={() =>
                            onOpenReceipt({
                              id: `rcpt_mem_${mem.id}`,
                              sources: memorySources.map((e) => ({
                                id: e.id,
                                title: e.title,
                                date: e.createdAt,
                                excerpt: e.content.slice(0, 150),
                                lens: e.lens,
                              })),
                              reason: `AI Memory: "${mem.concept}"`,
                            })
                          }
                          className="text-[11px] text-amber-900 hover:underline flex items-center gap-1"
                        >
                          <ShieldCheck className="w-3 h-3" />
                          <span>View Sources ({memorySources.length})</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
