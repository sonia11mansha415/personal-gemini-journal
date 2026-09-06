import React from 'react';
import { Heart, Briefcase, Flower2, Compass, LogIn } from 'lucide-react';
import { CreatorIdentityCard, ProjectStorySection, HomeStorytellingSections } from './HomeStorytellingSections';
import { Footer } from './Footer';

interface UnauthenticatedViewProps {
  onSignIn: () => void;
}

export const UnauthenticatedView: React.FC<UnauthenticatedViewProps> = ({ onSignIn }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 text-center space-y-12">
      {/* 2. Primary Creator / Project Identity Card */}
      <CreatorIdentityCard />

      {/* 3. Google Cloud Gen AI Academy / APAC Cohort 3 Context & Ideathon Story */}
      <ProjectStorySection />

      {/* 4. Main Hero */}
      <section className="pt-2">
        <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold text-stone-900 tracking-tight mb-4 max-w-3xl mx-auto leading-tight">
          A private journal that mirrors your story through Reflection Lenses.
        </h1>

        <p className="text-base sm:text-lg text-stone-600 max-w-2xl mx-auto mb-8 font-sans leading-relaxed">
          Write freely in your own private journal. Explore thoughtful reflections across Personal, Professional, Women & Life, and Identity & Growth lenses—at your own pace.
        </p>

        {/* Primary CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
          <button
            id="btn-hero-signin-google"
            onClick={onSignIn}
            className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-stone-900 text-stone-50 font-semibold text-sm hover:bg-stone-800 transition-all shadow-md hover:shadow-lg cursor-pointer"
          >
            <LogIn className="w-4 h-4 text-amber-300" />
            <span>Sign in with Google</span>
          </button>
        </div>

        {/* 5. Four Reflection Lenses Showcase */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left mb-8">
          <div className="p-5 rounded-2xl bg-white border border-[#e8e2d8] shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center border border-amber-200 mb-3">
              <Heart className="w-4 h-4" />
            </div>
            <h3 className="font-serif text-base font-semibold text-stone-900 mb-1">
              Personal Lens
            </h3>
            <p className="text-xs text-stone-500 leading-relaxed font-sans">
              Everyday reflections, relationships, emotional clarity, and meaningful moments.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-[#e8e2d8] shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-800 flex items-center justify-center border border-indigo-200 mb-3">
              <Briefcase className="w-4 h-4" />
            </div>
            <h3 className="font-serif text-base font-semibold text-stone-900 mb-1">
              Professional Lens
            </h3>
            <p className="text-xs text-stone-500 leading-relaxed font-sans">
              Work lessons, milestones, and career growth grounded in truth, without false praise.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-[#e8e2d8] shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-800 flex items-center justify-center border border-rose-200 mb-3">
              <Flower2 className="w-4 h-4" />
            </div>
            <h3 className="font-serif text-base font-semibold text-stone-900 mb-1">
              Women & Life Lens
            </h3>
            <p className="text-xs text-stone-500 leading-relaxed font-sans">
              An opt-in perspective celebrating agency, boundaries, and leadership without stereotypes.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-[#e8e2d8] shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center border border-emerald-200 mb-3">
              <Compass className="w-4 h-4" />
            </div>
            <h3 className="font-serif text-base font-semibold text-stone-900 mb-1">
              Identity & Growth
            </h3>
            <p className="text-xs text-stone-500 leading-relaxed font-sans">
              Curious inquiries into mindset shifts, evolving values, and inner journeys.
            </p>
          </div>
        </div>

        {/* Product Philosophy Section */}
        <div className="p-6 rounded-2xl bg-white/80 border border-[#e8e2d8] shadow-2xs text-center max-w-2xl mx-auto space-y-2">
          <p className="font-serif text-base sm:text-lg font-medium text-stone-900 leading-snug">
            AI should help you notice your story, not take it over.
          </p>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed font-sans">
            Reflect at your own pace. Keep what matters. Stay in control of what becomes part of your story.
          </p>
        </div>
      </section>

      {/* 6. Product Capabilities, Journey Strip & Built With Technology */}
      <HomeStorytellingSections />

      {/* 8. Minimal Elegant Footer */}
      <Footer />
    </div>
  );
};
