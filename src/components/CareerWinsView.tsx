import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Plus, 
  CheckCircle2, 
  Trash2, 
  Edit3, 
  Calendar, 
  FileText, 
  Eye, 
  Sparkles,
  AlertCircle,
  Save,
  X
} from 'lucide-react';
import { CareerWin, JournalEntry, MemoryReceipt } from '../types';
import { authenticatedFetch } from '../api/authClient';

interface CareerWinsViewProps {
  entries: JournalEntry[];
  onOpenReceipt: (receipt: MemoryReceipt) => void;
  onSelectEntry: (entry: JournalEntry) => void;
}

export const CareerWinsView: React.FC<CareerWinsViewProps> = ({
  entries,
  onOpenReceipt,
  onSelectEntry,
}) => {
  const [wins, setWins] = useState<CareerWin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New / Editing Modal State
  const [isCreating, setIsCreating] = useState(false);
  const [editingWin, setEditingWin] = useState<CareerWin | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().slice(0, 10),
    userNotes: '',
    confirmed: true,
  });

  // Fetch wins
  const fetchWins = async () => {
    setIsLoading(true);
    try {
      const res = await authenticatedFetch('/api/journal/wins');
      if (res.ok) {
        const data = await res.json();
        setWins(data.wins || []);
      }
    } catch (err) {
      console.warn('Failed to load career wins:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWins();
  }, []);

  // Save new win
  const handleSaveWin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    setIsSaving(true);
    setError(null);

    try {
      if (editingWin) {
        // Update existing win
        const res = await authenticatedFetch(`/api/journal/wins/${editingWin.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (!res.ok) throw new Error('Failed to update win');
        const data = await res.json();
        setWins((prev) => prev.map((w) => (w.id === editingWin.id ? data.win : w)));
        setEditingWin(null);
      } else {
        // Create new win
        const res = await authenticatedFetch('/api/journal/wins', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (!res.ok) throw new Error('Failed to create win');
        const data = await res.json();
        setWins((prev) => [data.win, ...prev]);
        setIsCreating(false);
      }

      setFormData({
        title: '',
        description: '',
        date: new Date().toISOString().slice(0, 10),
        userNotes: '',
        confirmed: true,
      });
    } catch (err: any) {
      setError(err?.message || 'Failed to persist career win');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete win
  const handleDeleteWin = async (id: string) => {
    try {
      const res = await authenticatedFetch(`/api/journal/wins/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setWins((prev) => prev.filter((w) => w.id !== id));
      }
    } catch (err) {
      console.warn('Failed to delete win:', err);
    }
  };

  // Prepare edit
  const handleStartEdit = (win: CareerWin) => {
    setEditingWin(win);
    setFormData({
      title: win.title,
      description: win.description,
      date: win.date,
      userNotes: win.userNotes || '',
      confirmed: win.confirmed,
    });
    setIsCreating(false);
  };

  // Find candidate entries that might represent wins (Professional lens with positive terms)
  const candidateEntries = entries.filter((e) => {
    if (e.lens !== 'PROFESSIONAL') return false;
    const text = (e.title + ' ' + e.content).toLowerCase();
    return text.includes('launched') || text.includes('completed') || text.includes('shipped') || text.includes('promoted') || text.includes('milestone') || text.includes('success');
  }).slice(0, 3);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-stone-900 dark:bg-stone-900 border border-stone-800 rounded-2xl p-6 text-stone-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-amber-400 font-medium text-sm">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span>Professional Career Wins</span>
          </div>
          <h2 className="text-2xl font-serif text-white tracking-tight">
            The Career Wins Vault
          </h2>
          <p className="text-stone-400 text-sm max-w-xl">
            A permanent, private record of your real achievements, shipped milestones, and professional breakthroughs. Grounded in truth, never inflated.
          </p>
        </div>

        <button
          onClick={() => {
            setIsCreating(true);
            setEditingWin(null);
            setFormData({
              title: '',
              description: '',
              date: new Date().toISOString().slice(0, 10),
              userNotes: '',
              confirmed: true,
            });
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-medium text-xs rounded-xl shadow-sm transition flex-shrink-0"
          id="btn-add-win"
        >
          <Plus className="w-4 h-4" />
          <span>Record a Career Win</span>
        </button>
      </div>

      {/* Suggested Wins from Professional Entries */}
      {candidateEntries.length > 0 && wins.length === 0 && (
        <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-900 dark:text-amber-200">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Moments That May Be Career Wins:</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {candidateEntries.map((e) => (
              <div
                key={e.id}
                className="p-3 rounded-lg bg-white dark:bg-stone-900 border border-amber-100 dark:border-amber-900/50 flex flex-col justify-between space-y-2"
              >
                <div>
                  <h4 className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                    {e.title}
                  </h4>
                  <p className="text-xs text-stone-500 line-clamp-2 mt-0.5">
                    {e.content}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsCreating(true);
                    setFormData({
                      title: e.title,
                      description: e.content.slice(0, 250),
                      date: e.createdAt.slice(0, 10),
                      userNotes: '',
                      confirmed: true,
                    });
                  }}
                  className="text-xs text-amber-600 dark:text-amber-400 font-medium hover:underline text-left"
                >
                  + Add as Verified Career Win
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CREATE / EDIT FORM MODAL / DRAWER */}
      {(isCreating || editingWin) && (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-md space-y-5">
          <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
            <h3 className="font-serif text-lg text-stone-900 dark:text-stone-100">
              {editingWin ? 'Edit Career Win' : 'Record New Career Win'}
            </h3>
            <button
              onClick={() => {
                setIsCreating(false);
                setEditingWin(null);
              }}
              className="p-1 text-stone-400 hover:text-stone-600 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSaveWin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-stone-700 dark:text-stone-300">
                Win Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Shipped v2.0 Architecture, Promoted to Staff Lead, Resolved Critical Latency"
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-stone-700 bg-transparent text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                id="input-win-title"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-stone-700 dark:text-stone-300">
                  Date Achieved
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-stone-700 bg-transparent text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  id="input-win-date"
                />
              </div>

              <div className="space-y-1.5 flex items-center pt-6">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-700 dark:text-stone-300">
                  <input
                    type="checkbox"
                    checked={formData.confirmed}
                    onChange={(e) => setFormData({ ...formData, confirmed: e.target.checked })}
                    className="rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                    id="checkbox-win-confirmed"
                  />
                  <span>Mark as Verified Milestone</span>
                </label>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-stone-700 dark:text-stone-300">
                Description & Context
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What did you achieve, what obstacles were overcome, and why was it meaningful?"
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-stone-700 bg-transparent text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                id="textarea-win-desc"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-stone-700 dark:text-stone-300">
                Personal Notes / Learnings (Optional)
              </label>
              <textarea
                rows={2}
                value={formData.userNotes}
                onChange={(e) => setFormData({ ...formData, userNotes: e.target.value })}
                placeholder="Key takeaways, skills developed, or notes for future performance reviews..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-stone-700 bg-transparent text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                id="textarea-win-notes"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setEditingWin(null);
                }}
                className="px-4 py-2 text-xs text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-medium text-xs rounded-lg shadow transition disabled:opacity-50"
                id="btn-save-win"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{editingWin ? 'Update Milestone' : 'Save to Vault'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* WINS LIST */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
            Verified Milestones ({wins.length})
          </span>
          <span className="text-xs text-stone-400">
            Sorted by date
          </span>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-xs text-stone-400">Loading Wins Vault...</div>
        ) : wins.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-stone-300 dark:border-stone-700 bg-stone-50/40 dark:bg-stone-900/40 rounded-2xl space-y-3">
            <Trophy className="w-8 h-8 text-stone-300 dark:text-stone-600 mx-auto" />
            <p className="text-xs text-stone-500">Your Wins Vault is ready for its first milestone.</p>
            <button
              onClick={() => setIsCreating(true)}
              className="text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline"
            >
              + Add your first Career Win
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {wins.map((win) => (
              <div
                key={win.id}
                className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4"
                id={`card-win-${win.id}`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                        {win.title}
                      </h4>
                    </div>
                    <span className="text-[11px] font-mono text-stone-400 flex-shrink-0">
                      {win.date}
                    </span>
                  </div>

                  {win.description && (
                    <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                      {win.description}
                    </p>
                  )}

                  {win.userNotes && (
                    <div className="p-2.5 rounded-lg bg-stone-50 dark:bg-stone-800/60 text-xs text-stone-500 dark:text-stone-400 space-y-0.5">
                      <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider block">
                        Personal Takeaway:
                      </span>
                      <p className="italic">{win.userNotes}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-stone-100 dark:border-stone-800 text-xs">
                  {win.receipt ? (
                    <button
                      onClick={() => onOpenReceipt(win.receipt!)}
                      className="inline-flex items-center gap-1 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 font-medium transition"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Memory Receipt</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-stone-400">Direct Entry</span>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleStartEdit(win)}
                      className="p-1.5 text-stone-400 hover:text-stone-600 transition"
                      title="Edit Milestone"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteWin(win.id)}
                      className="p-1.5 text-stone-400 hover:text-rose-600 transition"
                      title="Delete Milestone"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
