import React from 'react';
import { 
  Home,
  BookOpen, 
  Compass, 
  Settings, 
  Sparkles, 
  LogIn, 
  LogOut, 
  User as UserIcon, 
  TrendingUp,
  Trophy,
  MapPin
} from 'lucide-react';
import { User } from '../firebase';

export type AppTab = 'home' | 'journal' | 'living-memory' | 'insights' | 'wins' | 'map' | 'discover' | 'settings';

interface NavbarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  user: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
  onOpenNewEntry: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  user,
  onSignIn,
  onSignOut,
  onOpenNewEntry,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-[#faf8f5] border-b border-[#e7e2da] shadow-2xs">
      {/* Primary Header Row */}
      <div className={`w-full px-4 sm:px-6 lg:px-8 h-14 sm:h-16 ${
        user 
          ? 'flex 2xl:grid 2xl:grid-cols-[auto_1fr_auto] items-center justify-between gap-2 sm:gap-4 xl:gap-6' 
          : 'flex items-center justify-between flex-nowrap gap-2 sm:gap-4'
      }`}>
        {/* Region 1: Brand / Home (Protected width, never overlapped, acts as Home) */}
        <div className="flex items-center min-w-0 flex-1 sm:flex-initial pr-1 z-10">
          <div 
            id="brand-logo"
            onClick={() => setActiveTab('home')}
            className={`flex items-center gap-2 sm:gap-2.5 cursor-pointer group min-w-0 rounded-xl px-2 py-1 -ml-2 transition-all ${
              activeTab === 'home' ? 'bg-amber-900/10 text-amber-950' : 'hover:bg-stone-200/40 text-[#2c2825]'
            }`}
            title="Personal Gemini Journal - Home"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-700/10 text-amber-800 flex items-center justify-center border border-amber-800/15 group-hover:bg-amber-700/20 transition-colors shrink-0">
              <BookOpen className="w-[18px] h-[18px]" />
            </div>
            <div className="flex flex-col justify-center min-w-0">
              <span className="font-serif text-xs sm:text-base lg:text-lg font-semibold tracking-tight leading-tight truncate">
                Personal Gemini Journal
              </span>
              <span className="text-[10px] sm:text-[11px] font-sans tracking-wide text-amber-900/75 font-medium leading-none truncate">
                Cloud Run AI Challenge • APAC Cohort 3
              </span>
            </div>
          </div>
        </div>

        {/* Region 2: Product Navigation in Wide Top Row */}
        {/* For authenticated: only shown in top row on 2xl (wide mode) when there is ample width */}
        {/* For signed out: shown on sm:flex (tablet and desktop) */}
        <nav className={`${
          user ? 'hidden 2xl:flex' : 'hidden sm:flex'
        } items-center justify-center gap-1 xl:gap-1.5 2xl:gap-2 min-w-0 px-1 overflow-visible`}>
          <button
            id="nav-tab-home"
            onClick={() => setActiveTab('home')}
            className={`px-2 xl:px-2.5 2xl:px-3 py-1.5 rounded-lg text-xs xl:text-[13px] 2xl:text-sm font-medium flex items-center gap-1 xl:gap-1.5 whitespace-nowrap shrink-0 transition-all cursor-pointer ${
              activeTab === 'home'
                ? 'bg-amber-900/10 text-amber-950 font-semibold shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/40'
            }`}
          >
            <Home className="w-3.5 h-3.5 xl:w-4 xl:h-4 shrink-0" />
            <span>Home</span>
          </button>

          {/* Authenticated-only navigation tabs */}
          {user && (
            <>
              <button
                id="nav-tab-journal"
                onClick={() => setActiveTab('journal')}
                className={`px-2 xl:px-2.5 2xl:px-3 py-1.5 rounded-lg text-xs xl:text-[13px] 2xl:text-sm font-medium flex items-center gap-1 xl:gap-1.5 whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                  activeTab === 'journal'
                    ? 'bg-amber-900/10 text-amber-950 font-semibold shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/40'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 xl:w-4 xl:h-4 shrink-0" />
                <span>Journal</span>
              </button>
              <button
                id="nav-tab-living-memory"
                onClick={() => setActiveTab('living-memory')}
                className={`px-2 xl:px-2.5 2xl:px-3 py-1.5 rounded-lg text-xs xl:text-[13px] 2xl:text-sm font-medium flex items-center gap-1 xl:gap-1.5 whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                  activeTab === 'living-memory'
                    ? 'bg-amber-900/10 text-amber-950 font-semibold shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/40'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 xl:w-4 xl:h-4 shrink-0" />
                <span>Living Memory</span>
              </button>

              <button
                id="nav-tab-insights"
                onClick={() => setActiveTab('insights')}
                className={`px-2 xl:px-2.5 2xl:px-3 py-1.5 rounded-lg text-xs xl:text-[13px] 2xl:text-sm font-medium flex items-center gap-1 xl:gap-1.5 whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                  activeTab === 'insights'
                    ? 'bg-amber-900/10 text-amber-950 font-semibold shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/40'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5 xl:w-4 xl:h-4 shrink-0" />
                <span>Insights & Moods</span>
              </button>

              <button
                id="nav-tab-wins"
                onClick={() => setActiveTab('wins')}
                className={`px-2 xl:px-2.5 2xl:px-3 py-1.5 rounded-lg text-xs xl:text-[13px] 2xl:text-sm font-medium flex items-center gap-1 xl:gap-1.5 whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                  activeTab === 'wins'
                    ? 'bg-amber-900/10 text-amber-950 font-semibold shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/40'
                }`}
              >
                <Trophy className="w-3.5 h-3.5 xl:w-4 xl:h-4 shrink-0" />
                <span>Wins Vault</span>
              </button>

              <button
                id="nav-tab-map"
                onClick={() => setActiveTab('map')}
                className={`px-2 xl:px-2.5 2xl:px-3 py-1.5 rounded-lg text-xs xl:text-[13px] 2xl:text-sm font-medium flex items-center gap-1 xl:gap-1.5 whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                  activeTab === 'map'
                    ? 'bg-amber-900/10 text-amber-950 font-semibold shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/40'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 xl:w-4 xl:h-4 shrink-0" />
                <span>Memory Map</span>
              </button>
            </>
          )}

          {/* Public/Always available tab: Discover */}
          <button
            id="nav-tab-discover"
            onClick={() => setActiveTab('discover')}
            className={`px-2 xl:px-2.5 2xl:px-3 py-1.5 rounded-lg text-xs xl:text-[13px] 2xl:text-sm font-medium flex items-center gap-1 xl:gap-1.5 whitespace-nowrap shrink-0 transition-all cursor-pointer ${
              activeTab === 'discover'
                ? 'bg-amber-900/10 text-amber-950 font-semibold shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/40'
            }`}
          >
            <Compass className="w-3.5 h-3.5 xl:w-4 xl:h-4 shrink-0" />
            <span>Discover</span>
          </button>

          {/* Authenticated-only settings tab */}
          {user && (
            <button
              id="nav-tab-settings"
              onClick={() => setActiveTab('settings')}
              className={`px-2 xl:px-2.5 2xl:px-3 py-1.5 rounded-lg text-xs xl:text-[13px] 2xl:text-sm font-medium flex items-center gap-1 xl:gap-1.5 whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-amber-900/10 text-amber-950 font-semibold shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/40'
              }`}
            >
              <Settings className="w-3.5 h-3.5 xl:w-4 xl:h-4 shrink-0" />
              <span>Settings</span>
            </button>
          )}
        </nav>

        {/* Region 3: User Actions (Protected right region, shrink-0) */}
        <div className="flex items-center justify-end gap-2 sm:gap-3 shrink-0 z-10">
          {user ? (
            <>
              <button
                id="btn-nav-new-entry"
                onClick={onOpenNewEntry}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg bg-stone-900 text-stone-50 hover:bg-stone-800 shadow-xs transition-all cursor-pointer whitespace-nowrap shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span>New Entry</span>
              </button>

              <div className="flex items-center gap-2 shrink-0">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-7 h-7 rounded-full border border-[#d6cfc5] shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-stone-300 flex items-center justify-center text-xs font-semibold text-stone-700 shrink-0">
                    {user.displayName ? user.displayName.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
                  </div>
                )}
                {/* Username hidden on narrower desktop/laptop widths so it never displaces navigation */}
                <span className="hidden 2xl:inline text-xs font-medium text-stone-700 max-w-[120px] truncate whitespace-nowrap">
                  {user.displayName || user.email}
                </span>

                <button
                  id="btn-signout"
                  onClick={onSignOut}
                  title="Sign out"
                  className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-200/50 transition-colors cursor-pointer shrink-0"
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <button
              id="btn-signin-google"
              onClick={onSignIn}
              aria-label="Sign in with Google"
              className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-900 text-amber-50 hover:bg-amber-800 transition-all shadow-xs cursor-pointer whitespace-nowrap shrink-0"
            >
              <LogIn className="w-3.5 h-3.5 shrink-0" />
              <span className="sm:hidden">Sign in</span>
              <span className="hidden sm:inline">Sign in with Google</span>
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Dedicated Navigation Row for Constrained Desktop, Laptop, Tablet & Mobile */}
      {/* When user is logged in: shown on viewports below 2xl (< 1536px), fitting standard laptop widths (1024px-1440px) and tablet/mobile */}
      {/* When user is signed out: shown only on mobile (< sm, < 640px) */}
      <div className={`${
        user ? '2xl:hidden' : 'sm:hidden'
      } flex border-t border-[#e7e2da] px-2 sm:px-4 py-1.5 bg-[#f5f1eb]/95 backdrop-blur-xs overflow-x-auto scrollbar-none items-center justify-start md:justify-center gap-1 sm:gap-2`}>
        <button
          id="nav-tab-home-compact"
          onClick={() => setActiveTab('home')}
          className={`py-1.5 px-2.5 text-center text-xs font-medium rounded-lg whitespace-nowrap shrink-0 cursor-pointer transition-all flex items-center gap-1.5 ${
            activeTab === 'home' ? 'bg-white shadow-xs font-semibold text-amber-950' : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
          }`}
        >
          <Home className="w-3.5 h-3.5 shrink-0" />
          <span>Home</span>
        </button>

        {user && (
          <>
            <button
              id="nav-tab-journal-compact"
              onClick={() => setActiveTab('journal')}
              className={`py-1.5 px-2.5 text-center text-xs font-medium rounded-lg whitespace-nowrap shrink-0 cursor-pointer transition-all flex items-center gap-1.5 ${
                activeTab === 'journal' ? 'bg-white shadow-xs font-semibold text-amber-950' : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              <span>Journal</span>
            </button>
            <button
              onClick={() => setActiveTab('living-memory')}
              className={`py-1.5 px-2.5 text-center text-xs font-medium rounded-lg whitespace-nowrap shrink-0 cursor-pointer transition-all flex items-center gap-1.5 ${
                activeTab === 'living-memory' ? 'bg-white shadow-xs font-semibold text-amber-950' : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>Living Memory</span>
            </button>

            <button
              onClick={() => setActiveTab('insights')}
              className={`py-1.5 px-2.5 text-center text-xs font-medium rounded-lg whitespace-nowrap shrink-0 cursor-pointer transition-all flex items-center gap-1.5 ${
                activeTab === 'insights' ? 'bg-white shadow-xs font-semibold text-amber-950' : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 shrink-0" />
              <span>Insights & Moods</span>
            </button>

            <button
              onClick={() => setActiveTab('wins')}
              className={`py-1.5 px-2.5 text-center text-xs font-medium rounded-lg whitespace-nowrap shrink-0 cursor-pointer transition-all flex items-center gap-1.5 ${
                activeTab === 'wins' ? 'bg-white shadow-xs font-semibold text-amber-950' : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 shrink-0" />
              <span>Wins Vault</span>
            </button>

            <button
              onClick={() => setActiveTab('map')}
              className={`py-1.5 px-2.5 text-center text-xs font-medium rounded-lg whitespace-nowrap shrink-0 cursor-pointer transition-all flex items-center gap-1.5 ${
                activeTab === 'map' ? 'bg-white shadow-xs font-semibold text-amber-950' : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>Memory Map</span>
            </button>
          </>
        )}

        <button
          onClick={() => setActiveTab('discover')}
          className={`py-1.5 px-2.5 text-center text-xs font-medium rounded-lg whitespace-nowrap shrink-0 cursor-pointer transition-all flex items-center gap-1.5 ${
            activeTab === 'discover' ? 'bg-white shadow-xs font-semibold text-amber-950' : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
          }`}
        >
          <Compass className="w-3.5 h-3.5 shrink-0" />
          <span>Discover</span>
        </button>

        {user && (
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-1.5 px-2.5 text-center text-xs font-medium rounded-lg whitespace-nowrap shrink-0 cursor-pointer transition-all flex items-center gap-1.5 ${
              activeTab === 'settings' ? 'bg-white shadow-xs font-semibold text-amber-950' : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
            }`}
          >
            <Settings className="w-3.5 h-3.5 shrink-0" />
            <span>Settings</span>
          </button>
        )}
      </div>
    </header>
  );
};
