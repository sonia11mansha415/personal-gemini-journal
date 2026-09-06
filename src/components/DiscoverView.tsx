import React from 'react';
import { 
  Sparkles, 
  MapPin, 
  TrendingUp, 
  ShieldCheck, 
  ArrowRight, 
  BookOpen, 
  Trophy,
  Compass,
  LogIn
} from 'lucide-react';
import { AppTab } from './Navbar';

interface DiscoverViewProps {
  onNavigateToTab: (tab: AppTab) => void;
  isSignedIn?: boolean;
  onSignIn?: () => void;
}

export const DiscoverView: React.FC<DiscoverViewProps> = ({
  onNavigateToTab,
  isSignedIn = false,
  onSignIn,
}) => {
  const cards = [
    {
      id: 'lenses',
      title: 'Reflection Lenses',
      quote: 'See one memory from a different point of view.',
      description:
        'Switch perspectives seamlessly between Personal, Professional, Women & Life, and Identity & Growth. Explore hidden lessons without losing your original voice.',
      actionText: 'Open Reflection Journal',
      action: () => onNavigateToTab('journal'),
      icon: Sparkles,
    },
    {
      id: 'living-memory',
      title: 'Living Memory',
      quote: 'See how today’s story connects with your past.',
      description:
        'A respectful memory system that recognizes recurring themes, unfinished loops, and personal growth across months of journaling.',
      actionText: 'Explore Living Memory',
      action: () => onNavigateToTab('living-memory'),
      icon: BookOpen,
    },
    {
      id: 'insights',
      title: 'Insights & Mood Trends',
      quote: 'Notice patterns, moods, and meaningful changes.',
      description:
        'Weekly reflections and mood calendars that celebrate positive momentum, personal breakthroughs, and emotional balance with care and non-clinical clarity.',
      actionText: 'View Insights Dashboard',
      action: () => onNavigateToTab('insights'),
      icon: TrendingUp,
    },
    {
      id: 'wins',
      title: 'Career Wins Vault',
      quote: 'Recognize your contributions with verifiable memory receipts.',
      description:
        'Extract and confirm career breakthroughs, leadership milestones, and project completions. Filter and prepare wins for performance reviews or resumes.',
      actionText: 'Explore Wins Vault',
      action: () => onNavigateToTab('wins'),
      icon: Trophy,
    },
    {
      id: 'memory-map',
      title: 'Private Memory Map',
      quote: 'See where your memories happened across space and time.',
      description:
        'Attach optional, private places to your reflections. View multi-visit reflections and memories written in locations you return to.',
      actionText: 'Open Memory Map',
      action: () => onNavigateToTab('map'),
      icon: MapPin,
    },
    {
      id: 'privacy',
      title: 'Memory Privacy Controls',
      quote: 'Stay in total control of what AI remembers.',
      description:
        'Every single moment has an explicit privacy scope. Keep moments completely private from AI, allow one-time reflection, or authorize future memory connection.',
      actionText: 'Configure Privacy Controls',
      action: () => onNavigateToTab('settings'),
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
      {/* Hero Title */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100/70 border border-amber-200 text-amber-900 text-xs font-semibold uppercase tracking-wider mb-3">
          <Compass className="w-3.5 h-3.5" />
          <span>Explore Your Journal</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-stone-900 tracking-tight mb-3">
          Discover Your Personal Journal
        </h1>
        <p className="text-sm sm:text-base text-stone-600 font-sans leading-relaxed">
          A calm personal space designed to help you reflect deeply, understand your journey through time, and stay in total control of what AI remembers.
        </p>
      </div>

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              id={`discover-card-${card.id}`}
              className="bg-white border border-[#e5dfd6] rounded-2xl p-5 sm:p-6 flex flex-col shadow-xs hover:shadow-md transition-all"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-800/10 text-amber-900 flex items-center justify-center border border-amber-800/10 mb-3">
                  <Icon className="w-5 h-5" />
                </div>

                <h3 className="font-serif text-lg sm:text-xl font-semibold text-stone-900 mb-1">
                  {card.title}
                </h3>
                <p className="font-serif italic text-xs sm:text-sm text-amber-900/80 mb-2">
                  "{card.quote}"
                </p>
                <p className={`text-xs text-stone-600 font-sans leading-relaxed ${isSignedIn ? 'mb-3' : 'mb-0'}`}>
                  {card.description}
                </p>
              </div>

              {isSignedIn && (
                <div className="mt-auto pt-2.5">
                  <button
                    type="button"
                    onClick={card.action}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-[#faf8f5] hover:bg-stone-900 hover:text-white text-stone-800 border border-stone-200 hover:border-transparent transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                  >
                    <span>{card.actionText}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Page-level Sign In CTA for Signed-Out Visitors */}
      {!isSignedIn && (
        <div className="mt-12 p-6 sm:p-8 bg-white border border-[#e5dfd6] rounded-2xl text-center max-w-xl mx-auto shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-amber-800/10 text-amber-900 flex items-center justify-center border border-amber-800/10 mx-auto mb-3">
            <BookOpen className="w-5 h-5" />
          </div>
          <h2 className="font-serif text-xl sm:text-2xl font-semibold text-stone-900 mb-2">
            Start Your Private Journal
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 mb-5 max-w-md mx-auto">
            Reflect privately, explore your story across time, and keep full ownership of your memories.
          </p>
          <button
            id="btn-discover-signin"
            onClick={onSignIn}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-950 hover:bg-amber-900 text-white font-semibold text-xs sm:text-sm shadow-xs transition-all cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign in to start your journal</span>
          </button>
        </div>
      )}
    </div>
  );
};
