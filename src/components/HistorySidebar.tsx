import React, { useState } from 'react';
import { 
  Search, 
  Star, 
  Calendar, 
  Filter, 
  Plus, 
  Sparkles, 
  BookOpen, 
  Tag as TagIcon,
  ChevronRight
} from 'lucide-react';
import { JournalEntry, ReflectionLens } from '../types';

interface HistorySidebarProps {
  entries: JournalEntry[];
  activeEntryId: string | undefined;
  onSelectEntry: (entry: JournalEntry) => void;
  onNewEntry: () => void;
  isLoading: boolean;
  hasMoreEntries?: boolean;
  isLoadingMore?: boolean;
  onLoadMoreEntries?: () => void;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
  entries,
  activeEntryId,
  onSelectEntry,
  onNewEntry,
  isLoading,
  hasMoreEntries = false,
  isLoadingMore = false,
  onLoadMoreEntries,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [lensFilter, setLensFilter] = useState<string>('ALL');
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const filteredEntries = entries.filter((entry) => {
    // Filter by search query
    const matchSearch =
      !searchTerm ||
      entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.tags?.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()));

    // Filter by lens
    const matchLens = lensFilter === 'ALL' || entry.lens === lensFilter;

    // Filter by favorites
    const matchFavorite = !favoritesOnly || Boolean(entry.favorite);

    return matchSearch && matchLens && matchFavorite;
  });

  const getLensColor = (lens: ReflectionLens) => {
    switch (lens) {
      case 'PROFESSIONAL':
        return 'bg-indigo-50 text-indigo-800 border-indigo-200';
      case 'WOMEN_AND_LIFE':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'IDENTITY_AND_GROWTH':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'PERSONAL':
      default:
        return 'bg-amber-50 text-amber-800 border-amber-200';
    }
  };

  return (
    <div className="bg-white border border-[#e5dfd6] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col h-[calc(100vh-8.5rem)] min-h-[500px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#ece6dd] mb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-amber-800" />
          <h3 className="font-serif text-sm font-semibold text-stone-900">
            Journal History
          </h3>
          <span className="text-[11px] font-sans px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-medium">
            {entries.length}
          </span>
        </div>

        <button
          id="btn-sidebar-new-entry"
          onClick={onNewEntry}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 transition-colors shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5" />
          New
        </button>
      </div>

      {/* Search Input */}
      <div className="relative mb-2.5">
        <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-stone-400" />
        <input
          id="input-history-search"
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search thoughts, titles, tags..."
          className="w-full bg-[#faf7f2] border border-stone-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-amber-800 font-sans"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 mb-3 overflow-x-auto pb-1 text-[11px] font-medium text-stone-600">
        <button
          onClick={() => setLensFilter('ALL')}
          className={`px-2 py-0.5 rounded-md shrink-0 transition-colors ${
            lensFilter === 'ALL' ? 'bg-stone-800 text-white' : 'hover:bg-stone-100'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setLensFilter('PERSONAL')}
          className={`px-2 py-0.5 rounded-md shrink-0 transition-colors ${
            lensFilter === 'PERSONAL' ? 'bg-amber-800 text-white' : 'hover:bg-stone-100'
          }`}
        >
          Personal
        </button>
        <button
          onClick={() => setLensFilter('PROFESSIONAL')}
          className={`px-2 py-0.5 rounded-md shrink-0 transition-colors ${
            lensFilter === 'PROFESSIONAL' ? 'bg-indigo-800 text-white' : 'hover:bg-stone-100'
          }`}
        >
          Work
        </button>
        <button
          onClick={() => setFavoritesOnly(!favoritesOnly)}
          className={`p-1 rounded-md shrink-0 border ml-auto transition-colors ${
            favoritesOnly ? 'bg-amber-100 border-amber-300 text-amber-700' : 'border-stone-200 text-stone-400'
          }`}
          title="Favorites only"
        >
          <Star className={`w-3 h-3 ${favoritesOnly ? 'fill-amber-500' : ''}`} />
        </button>
      </div>

      {/* Entries List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {isLoading ? (
          <div className="text-center py-12 text-stone-400 text-xs">
            <Sparkles className="w-5 h-5 mx-auto mb-2 animate-spin text-amber-700" />
            Loading entries...
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="text-center py-12 text-stone-400 px-4">
            <Calendar className="w-6 h-6 mx-auto mb-2 text-stone-300" />
            <p className="text-xs font-medium text-stone-500">No moments found</p>
            <p className="text-[11px] text-stone-400 mt-1">
              {searchTerm ? 'Try adjusting your search terms' : 'Write your first entry to begin your story'}
            </p>
          </div>
        ) : (
          filteredEntries.map((item) => {
            const isSelected = item.id === activeEntryId;
            const dateStr = item.createdAt
              ? new Date(item.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })
              : 'Draft';

            return (
              <div
                key={item.id}
                id={`history-entry-${item.id}`}
                onClick={() => onSelectEntry(item)}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-amber-50/60 border-amber-300 ring-1 ring-amber-400/30 shadow-2xs'
                    : 'bg-white border-stone-200 hover:border-stone-300 hover:bg-stone-50/50'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[11px] text-stone-500 font-sans font-medium">
                    {dateStr}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {item.favorite && (
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    )}
                    <span
                      className={`text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded-sm border ${getLensColor(
                        item.lens
                      )}`}
                    >
                      {item.lens === 'PERSONAL' && 'Personal'}
                      {item.lens === 'PROFESSIONAL' && 'Work'}
                      {item.lens === 'WOMEN_AND_LIFE' && 'Women'}
                      {item.lens === 'IDENTITY_AND_GROWTH' && 'Growth'}
                    </span>
                  </div>
                </div>

                <h4 className="font-serif text-xs font-semibold text-stone-900 truncate mb-1">
                  {item.title || 'Untitled Moment'}
                </h4>

                <p className="text-[11px] text-stone-500 line-clamp-2 leading-relaxed mb-2 font-sans">
                  {item.content}
                </p>

                {item.tags && item.tags.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    {item.tags.slice(0, 3).map((t) => (
                      <span
                        key={t}
                        className="text-[10px] text-stone-500 bg-stone-100 px-1.5 py-0.2 rounded-xs"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}

        {hasMoreEntries && onLoadMoreEntries && (
          <div className="pt-2 pb-1 text-center shrink-0">
            <button
              type="button"
              onClick={onLoadMoreEntries}
              disabled={isLoadingMore}
              id="btn-load-more-entries"
              className="w-full py-2 px-3 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl border border-stone-200 transition cursor-pointer disabled:opacity-50"
            >
              {isLoadingMore ? 'Loading older moments…' : 'Load Older Moments'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
