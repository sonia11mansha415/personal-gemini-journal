import React from 'react';
import { 
  BookOpen, 
  PenLine,
  ArrowRight
} from 'lucide-react';
import { CreatorIdentityCard, ProjectStorySection, HomeStorytellingSections } from './HomeStorytellingSections';
import { Footer } from './Footer';

interface AuthenticatedHomeViewProps {
  onOpenJournal: () => void;
  onOpenNewEntry?: () => void;
}

export const AuthenticatedHomeView: React.FC<AuthenticatedHomeViewProps> = ({
  onOpenJournal,
  onOpenNewEntry
}) => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 text-center space-y-12">
      {/* 1. Main Hero & Quick Actions */}
      <section className="pt-2">
        <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold text-stone-900 tracking-tight mb-4 max-w-3xl mx-auto leading-tight">
          A private journal that mirrors your story through Reflection Lenses.
        </h1>

        <p className="text-base sm:text-lg text-stone-600 max-w-2xl mx-auto mb-8 font-sans leading-relaxed">
          Write freely in your own private journal. Explore thoughtful reflections across Personal, Professional, Women & Life, and Identity & Growth lenses—at your own pace.
        </p>

        {/* Primary Authenticated CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
          <button
            id="btn-home-open-journal"
            type="button"
            onClick={onOpenJournal}
            className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-stone-900 text-stone-50 font-semibold text-sm hover:bg-stone-800 transition-all shadow-md hover:shadow-lg cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-amber-300 shrink-0" />
            <span>Open My Journal</span>
            <ArrowRight className="w-4 h-4 text-stone-400 shrink-0" />
          </button>

          {onOpenNewEntry && (
            <button
              id="btn-home-new-entry"
              type="button"
              onClick={onOpenNewEntry}
              className="inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-white border border-[#e8e2d8] text-stone-800 font-semibold text-sm hover:bg-stone-50 transition-all shadow-xs cursor-pointer"
            >
              <PenLine className="w-4 h-4 text-amber-800 shrink-0" />
              <span>Write a New Entry</span>
            </button>
          )}
        </div>

        {/* Product Philosophy Strip */}
        <div className="p-6 sm:p-8 rounded-2xl bg-white/80 border border-[#e8e2d8] shadow-2xs text-center max-w-2xl mx-auto space-y-2">
          <p className="font-serif text-lg sm:text-xl font-medium text-stone-900 leading-snug">
            AI should help you notice your story, not take it over.
          </p>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed font-sans">
            Reflect at your own pace. Keep what matters. Stay in control of what becomes part of your story.
          </p>
        </div>
      </section>

      {/* 2. Product Capability Content, Journey & Technology */}
      <HomeStorytellingSections />

      {/* 3. Primary Creator / Project Identity Card */}
      <CreatorIdentityCard />

      {/* 4. Google Cloud Gen AI Academy / APAC Cohort 3 Context & Ideathon Story */}
      <ProjectStorySection />

      {/* 5. Minimal Elegant Footer */}
      <Footer />
    </div>
  );
};
