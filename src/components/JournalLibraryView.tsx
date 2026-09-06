import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Star, 
  MapPin, 
  Calendar, 
  Tag as TagIcon, 
  Sparkles, 
  BookOpen, 
  Heart, 
  Briefcase, 
  Flower2, 
  Compass, 
  X, 
  ChevronRight,
  RefreshCw,
  Plus
} from 'lucide-react';
import { JournalEntry, JournalMood, ReflectionLens } from '../types';
import { getMoodTheme } from '../theme/moodThemes';

interface JournalLibraryViewProps {
  entries: JournalEntry[];
  onSelectEntry: (entry: JournalEntry) => void;
  onNewEntry: () => void;
  isLoading: boolean;
  hasMoreEntries: boolean;
  isLoadingMore: boolean;
  onLoadMoreEntries: () => void;
}

export const JournalLibraryView: React.FC<JournalLibraryViewProps> = ({
  entries,
  onSelectEntry,
  onNewEntry,
  isLoading,
  hasMoreEntries,
  isLoadingMore,
  onLoadMoreEntries,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMood, setSelectedMood] = useState<string>('ALL');
  const [selectedLens, setSelectedLens] = useState<string>('ALL');
  const [selectedTag, setSelectedTag] = useState<string>('ALL');
  const [selectedPlace, setSelectedPlace] = useState<string>('ALL');
  const [favoritesOnly, setFavoritesOnly] = useState<boolean>(false);

  // Derive unique tags across loaded entries
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    entries.forEach((e) => {
      if (Array.isArray(e.tags)) {
        e.tags.forEach((t) => tagSet.add(t));
      }
    });
    return Array.from(tagSet).sort();
  }, [entries]);

  // Derive unique place names across loaded entries
  const availablePlaces = useMemo(() => {
    const placeSet = new Set<string>();
    entries.forEach((e) => {
      if (e.location?.placeName) {
        placeSet.add(e.location.placeName);
      }
    });
    return Array.from(placeSet).sort();
  }, [entries]);

  // Filter entries based on active filters
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      // 1. Text Search across title, content, and tags
      if (searchQuery.trim()) {
        const queryLower = searchQuery.toLowerCase().trim();
        const titleMatch = (entry.title || '').toLowerCase().includes(queryLower);
        const contentMatch = (entry.content || '').toLowerCase().includes(queryLower);
        const tagsMatch = (entry.tags || []).some((t) => t.toLowerCase().includes(queryLower));
        const placeMatch = (entry.location?.placeName || '').toLowerCase().includes(queryLower);
        if (!titleMatch && !contentMatch && !tagsMatch && !placeMatch) {
          return false;
        }
      }

      // 2. Mood Filter
      if (selectedMood !== 'ALL') {
        if (entry.mood !== selectedMood) {
          return false;
        }
      }

      // 3. Lens Filter
      if (selectedLens !== 'ALL') {
        if (entry.lens !== selectedLens) {
          return false;
        }
      }

      // 4. Tag Filter
      if (selectedTag !== 'ALL') {
        if (!entry.tags || !entry.tags.includes(selectedTag)) {
          return false;
        }
      }

      // 5. Place Filter
      if (selectedPlace !== 'ALL') {
        if (entry.location?.placeName !== selectedPlace) {
          return false;
        }
      }

      // 6. Favorites Filter
      if (favoritesOnly) {
        if (!entry.favorite) {
          return false;
        }
      }

      return true;
    });
  }, [entries, searchQuery, selectedMood, selectedLens, selectedTag, selectedPlace, favoritesOnly]);

  const hasActiveFilters = 
    searchQuery.trim().length > 0 || 
    selectedMood !== 'ALL' || 
    selectedLens !== 'ALL' || 
    selectedTag !== 'ALL' || 
    selectedPlace !== 'ALL' || 
    favoritesOnly;

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedMood('ALL');
    setSelectedLens('ALL');
    setSelectedTag('ALL');
    setSelectedPlace('ALL');
    setFavoritesOnly(false);
  };

  const moods: { id: JournalMood; label: string; emoji: string }[] = [
    { id: 'peaceful', label: 'Peaceful', emoji: '🌿' },
    { id: 'energized', label: 'Energized', emoji: '⚡' },
    { id: 'thoughtful', label: 'Thoughtful', emoji: '💭' },
    { id: 'grateful', label: 'Grateful', emoji: '✨' },
    { id: 'stressed', label: 'Stressed', emoji: '🌧️' },
  ];

  const getLensIcon = (lens?: ReflectionLens) => {
    switch (lens) {
      case 'PROFESSIONAL':
        return <Briefcase className="w-3.5 h-3.5 text-indigo-700 shrink-0" />;
      case 'WOMEN_AND_LIFE':
        return <Flower2 className="w-3.5 h-3.5 text-rose-700 shrink-0" />;
      case 'IDENTITY_AND_GROWTH':
        return <Compass className="w-3.5 h-3.5 text-emerald-700 shrink-0" />;
      case 'PERSONAL':
      default:
        return <Heart className="w-3.5 h-3.5 text-amber-700 shrink-0" />;
    }
  };

  const getLensLabel = (lens?: ReflectionLens) => {
    switch (lens) {
      case 'PROFESSIONAL':
        return 'Professional';
      case 'WOMEN_AND_LIFE':
        return 'Women & Life';
      case 'IDENTITY_AND_GROWTH':
        return 'Identity & Growth';
      case 'PERSONAL':
      default:
        return 'Personal';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls Bar */}
      <div className="bg-white border border-[#e5dfd6] rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-900/80">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Library Archive</span>
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-semibold text-stone-900 mt-0.5">
              My Journal
            </h2>
            <p className="text-xs text-stone-500 font-sans mt-0.5">
              Browse, search, and filter your saved moments with calm clarity.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              id="btn-library-new-entry"
              type="button"
              onClick={onNewEntry}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-900 text-stone-50 text-xs font-semibold hover:bg-stone-800 transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Entry</span>
            </button>
          </div>
        </div>

        {/* Search Bar & Favorite Toggle */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
            <input
              id="input-library-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search across titles, thoughts, places, or tags…"
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-stone-300 bg-[#faf8f5] text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-amber-800 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600 rounded-md"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <button
            type="button"
            id="btn-library-filter-favorites"
            onClick={() => setFavoritesOnly(!favoritesOnly)}
            className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer shrink-0 ${
              favoritesOnly
                ? 'bg-amber-100/90 border-amber-300 text-amber-950 font-semibold shadow-2xs'
                : 'bg-[#faf8f5] border-stone-300 text-stone-700 hover:bg-white'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${favoritesOnly ? 'fill-amber-500 text-amber-600' : 'text-stone-400'}`} />
            <span>Favorites Only</span>
          </button>
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-[#f0eae1]">
          {/* Mood Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block">
              Mood
            </label>
            <select
              id="select-library-mood"
              value={selectedMood}
              onChange={(e) => setSelectedMood(e.target.value)}
              className="w-full bg-[#faf8f5] border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-stone-800 font-medium focus:ring-1 focus:ring-amber-800 cursor-pointer"
            >
              <option value="ALL">All Moods</option>
              {moods.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.emoji} {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Reflection Lens Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block">
              Perspective
            </label>
            <select
              id="select-library-lens"
              value={selectedLens}
              onChange={(e) => setSelectedLens(e.target.value)}
              className="w-full bg-[#faf8f5] border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-stone-800 font-medium focus:ring-1 focus:ring-amber-800 cursor-pointer"
            >
              <option value="ALL">All Perspectives</option>
              <option value="PERSONAL">Personal</option>
              <option value="PROFESSIONAL">Professional</option>
              <option value="WOMEN_AND_LIFE">Women & Life</option>
              <option value="IDENTITY_AND_GROWTH">Identity & Growth</option>
            </select>
          </div>

          {/* Tag Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block">
              Tag
            </label>
            <select
              id="select-library-tag"
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              disabled={availableTags.length === 0}
              className="w-full bg-[#faf8f5] border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-stone-800 font-medium focus:ring-1 focus:ring-amber-800 cursor-pointer disabled:opacity-50"
            >
              <option value="ALL">All Tags ({availableTags.length})</option>
              {availableTags.map((t) => (
                <option key={t} value={t}>
                  #{t}
                </option>
              ))}
            </select>
          </div>

          {/* Place Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block">
              Location
            </label>
            <select
              id="select-library-place"
              value={selectedPlace}
              onChange={(e) => setSelectedPlace(e.target.value)}
              disabled={availablePlaces.length === 0}
              className="w-full bg-[#faf8f5] border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-stone-800 font-medium focus:ring-1 focus:ring-amber-800 cursor-pointer disabled:opacity-50"
            >
              <option value="ALL">All Locations ({availablePlaces.length})</option>
              {availablePlaces.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Filter Summary / Reset */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#f0eae1] text-xs">
            <span className="text-stone-500">
              Showing <strong>{filteredEntries.length}</strong> of {entries.length} moments
            </span>
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-amber-800 hover:text-amber-950 font-medium flex items-center gap-1 underline cursor-pointer"
            >
              <X className="w-3 h-3" />
              <span>Reset filters</span>
            </button>
          </div>
        )}
      </div>

      {/* Cards Grid or Empty State */}
      {isLoading && entries.length === 0 ? (
        <div className="p-12 text-center text-stone-500 font-serif bg-white border border-[#e5dfd6] rounded-2xl">
          <RefreshCw className="w-6 h-6 animate-spin text-amber-700 mx-auto mb-3" />
          <p className="text-sm">Loading your journal moments...</p>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="p-12 text-center bg-white border border-[#e5dfd6] rounded-2xl space-y-3">
          <BookOpen className="w-10 h-10 text-stone-300 mx-auto" />
          <h3 className="font-serif text-lg font-medium text-stone-800">
            {hasActiveFilters ? 'No moments match your filters' : 'Your journal is quiet'}
          </h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
            {hasActiveFilters
              ? 'Try resetting your search query or loosening your perspective, mood, or tag filters.'
              : 'Write your first reflective moment to begin building your living journal.'}
          </p>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#faf8f5] border border-stone-300 text-stone-800 text-xs font-semibold hover:bg-stone-100 transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear filters</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onNewEntry}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-900 text-stone-50 text-xs font-semibold hover:bg-stone-800 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Write a New Entry</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {filteredEntries.map((entry) => {
            const moodTheme = getMoodTheme(entry.mood);
            const dateStr = entry.createdAt
              ? new Date(entry.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : 'Recent';

            return (
              <div
                key={entry.id}
                id={`journal-library-card-${entry.id}`}
                onClick={() => onSelectEntry(entry)}
                className="p-5 sm:p-6 rounded-2xl bg-white border border-[#e5dfd6] hover:border-stone-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group space-y-3"
              >
                <div className="space-y-2.5">
                  {/* Card Header: Metadata Pills */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#faf8f5] border border-stone-200 text-stone-700">
                        {getLensIcon(entry.lens)}
                        <span>{getLensLabel(entry.lens)}</span>
                      </span>

                      {entry.mood && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#faf8f5] border border-stone-200 text-stone-700 capitalize">
                          <span className={`w-1.5 h-1.5 rounded-full ${moodTheme.dotColor}`} />
                          <span>{entry.mood}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-stone-400">
                      {entry.favorite && (
                        <Star className="w-4 h-4 fill-amber-500 text-amber-600 shrink-0" />
                      )}
                      <span className="text-[11px] font-mono text-stone-500">
                        {dateStr}
                      </span>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="font-serif text-lg font-semibold text-stone-900 group-hover:text-amber-950 transition-colors line-clamp-1">
                    {entry.title || 'Untitled moment'}
                  </h3>

                  {/* Content Preview */}
                  <p className="text-xs text-stone-600 font-serif leading-relaxed line-clamp-3 italic">
                    {entry.content?.trim()}
                  </p>
                </div>

                {/* Footer: Tags & Location */}
                <div className="pt-2 border-t border-[#f5f1ea] flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                    {entry.location?.placeName && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-stone-500 truncate">
                        <MapPin className="w-3 h-3 text-amber-700 shrink-0" />
                        <span className="truncate max-w-[140px]">{entry.location.placeName}</span>
                      </span>
                    )}

                    {Array.isArray(entry.tags) && entry.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center text-[10px] font-mono text-stone-500 bg-stone-100 px-1.5 py-0.2 rounded"
                      >
                        #{tag}
                      </span>
                    ))}
                    {Array.isArray(entry.tags) && entry.tags.length > 3 && (
                      <span className="text-[10px] text-stone-400">
                        +{entry.tags.length - 3}
                      </span>
                    )}
                  </div>

                  <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-stone-800 group-hover:text-amber-900 transition-colors shrink-0">
                    <span>Open</span>
                    <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination: Load More Older Entries */}
      {hasMoreEntries && (
        <div className="text-center pt-2">
          <button
            type="button"
            id="btn-library-load-more"
            onClick={onLoadMoreEntries}
            disabled={isLoadingMore}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-stone-300 text-stone-800 text-xs font-semibold hover:bg-stone-50 transition shadow-2xs cursor-pointer disabled:opacity-50"
          >
            {isLoadingMore ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Loading older moments...</span>
              </>
            ) : (
              <span>Load More Moments</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
