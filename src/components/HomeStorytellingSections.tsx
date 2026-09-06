import React from 'react';
import { 
  Sparkles, 
  Layers, 
  Clock, 
  ShieldCheck, 
  Mic, 
  MapPin, 
  Receipt, 
  ArrowRight,
  Cloud,
  Linkedin,
  Github,
  Code2,
  ExternalLink,
  Cpu,
  Database,
  Lock
} from 'lucide-react';

/**
 * Primary Creator Identity Card
 * Positioned near top of Home, directly below navbar
 */
export const CreatorIdentityCard: React.FC = () => {
  return (
    <section className="bg-white border border-[#e8e2d8] rounded-3xl p-6 sm:p-8 shadow-xs text-left">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
        <img
          src="/images/sonia-mansha-profile.jpg"
          alt="Sonia Mansha"
          className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl object-cover border border-[#e8e2d8] shadow-xs shrink-0"
        />
        <div className="space-y-3 flex-1 text-center sm:text-left">
          <div>
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-stone-900 tracking-tight">
              Built by Sonia Mansha
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed font-sans mt-1.5 max-w-2xl">
              Created as part of the Google Cloud Gen AI Academy APAC Cohort 3 journey — exploring how thoughtful product design, generative AI, cloud infrastructure, memory, privacy, security, and user control can come together in one personal experience.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-1">
            <a
              id="link-developer-linkedin"
              href="https://www.linkedin.com/in/sonia11mansha415/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#0077b5] text-white text-xs font-semibold hover:bg-[#006097] transition-all shadow-xs cursor-pointer"
            >
              <Linkedin className="w-3.5 h-3.5 shrink-0" />
              <span>LinkedIn</span>
              <ExternalLink className="w-3 h-3 opacity-80 shrink-0" />
            </a>

            <a
              id="link-developer-github"
              href="https://github.com/sonia11mansha415"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-stone-900 text-stone-50 text-xs font-semibold hover:bg-stone-800 transition-all shadow-xs cursor-pointer"
            >
              <Github className="w-3.5 h-3.5 shrink-0" />
              <span>GitHub Profile</span>
              <ExternalLink className="w-3 h-3 opacity-80 shrink-0" />
            </a>

            <a
              id="link-developer-source-code"
              href="https://github.com/sonia11mansha415/personal-gemini-journal"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-stone-300 text-stone-800 text-xs font-semibold hover:bg-stone-50 transition-all shadow-2xs cursor-pointer"
            >
              <Code2 className="w-3.5 h-3.5 text-amber-800 shrink-0" />
              <span>Explore the Source Code</span>
              <ExternalLink className="w-3 h-3 opacity-80 shrink-0" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

/**
 * Ideathon & Google Cloud Gen AI Academy Story Section
 */
export const ProjectStorySection: React.FC = () => {
  return (
    <section className="bg-white/90 border border-[#e8e2d8] rounded-3xl p-6 sm:p-8 shadow-xs text-left space-y-4">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100/80 border border-amber-200 text-amber-900 text-xs font-semibold uppercase tracking-wider">
        <Sparkles className="w-3.5 h-3.5 text-amber-700 shrink-0" />
        <span>Google Cloud Gen AI Academy • APAC Cohort 3</span>
      </div>

      <div className="space-y-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-amber-900/80 font-sans block">
          Built through the Google Cloud Gen AI Academy
        </span>
        <h2 className="font-serif text-xl sm:text-2xl font-semibold text-stone-900 tracking-tight">
          From using AI to building with AI
        </h2>
      </div>

      <p className="text-sm sm:text-base text-stone-600 font-sans leading-relaxed">
        This project grew from a simple question: What if a digital journal could remember with permission, reflect from different perspectives, and still leave the user fully in control?
      </p>

      <p className="text-sm sm:text-base text-stone-600 font-sans leading-relaxed">
        During the Google Cloud Gen AI Academy APAC Cohort 3 challenge, I explored how generative AI could become more than a chatbot — combining thoughtful reflection, longitudinal memory, user-controlled privacy, voice, location-aware memories, and cloud deployment into one calm journaling experience, learning firsthand how an AI product is actually engineered.
      </p>

      <p className="text-xs sm:text-sm text-stone-500 font-sans italic pt-2 border-t border-[#f0ece4]">
        My goal was not to make AI write the journal for you, but to create a thoughtful companion that helps you understand your own story.
      </p>
    </section>
  );
};

/**
 * Product Capabilities & Philosophy Sections
 * (6 Feature Cards, What I Wanted to Explore, Journey Strip, Built With Technology)
 */
export const HomeStorytellingSections: React.FC = () => {
  return (
    <div className="space-y-16 text-left max-w-4xl mx-auto">
      {/* 1. What I Wanted to Explore */}
      <section className="space-y-6">
        <div className="text-center sm:text-left">
          <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-stone-900 tracking-tight mb-3">
            What I wanted to explore
          </h2>
          <p className="text-sm sm:text-base text-stone-600 font-sans leading-relaxed max-w-3xl">
            What happens when an AI journal does more than respond to one prompt?
          </p>
          <p className="text-sm sm:text-base text-stone-600 font-sans leading-relaxed max-w-3xl mt-2">
            This project explores whether an AI companion can connect experiences across time, respect clear user boundaries, and still keep the person—not the AI—at the centre of the journal.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="p-5 rounded-2xl bg-white border border-[#e8e2d8] shadow-2xs">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-900 flex items-center justify-center border border-amber-200/60 shrink-0">
                <Layers className="w-4 h-4 text-amber-800" />
              </div>
              <h3 className="font-serif text-base font-semibold text-stone-900">
                Reflection from different perspectives
              </h3>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed font-sans">
              Revisiting moments through personal life, work growth, identity, and life milestones without distorting your original voice.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-[#e8e2d8] shadow-2xs">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-900 flex items-center justify-center border border-indigo-200/60 shrink-0">
                <ShieldCheck className="w-4 h-4 text-indigo-800" />
              </div>
              <h3 className="font-serif text-base font-semibold text-stone-900">
                Memory with user control
              </h3>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed font-sans">
              Explicit memory contracts that give you total authority over which thoughts stay strictly private and which can connect.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-[#e8e2d8] shadow-2xs">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-900 flex items-center justify-center border border-emerald-200/60 shrink-0">
                <Clock className="w-4 h-4 text-emerald-800" />
              </div>
              <h3 className="font-serif text-base font-semibold text-stone-900">
                Long-term patterns without losing context
              </h3>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed font-sans">
              Discovering emerging life threads and unresolved loops across weeks and months, with transparent memory receipts.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-[#e8e2d8] shadow-2xs">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-900 flex items-center justify-center border border-rose-200/60 shrink-0">
                <Sparkles className="w-4 h-4 text-rose-800" />
              </div>
              <h3 className="font-serif text-base font-semibold text-stone-900">
                AI that supports rather than dominates
              </h3>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed font-sans">
              A gentle reflection companion that helps you notice meaning without empty compliments, unsolicited advice, or conversational clutter.
            </p>
          </div>
        </div>
      </section>

      {/* 2. What Makes This Journal Different (6 Product Cards) */}
      <section className="space-y-6">
        <div className="text-center sm:text-left">
          <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-stone-900 tracking-tight mb-2">
            What makes this journal different
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 font-sans">
            Core features designed around human continuity, privacy, and genuine perspective.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Card 1: Reflection Lenses */}
          <div className="p-6 rounded-2xl bg-white border border-[#e8e2d8] shadow-2xs flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-900 flex items-center justify-center border border-amber-200/80 mb-3.5">
                <Layers className="w-4 h-4 text-amber-800" />
              </div>
              <h3 className="font-serif text-base font-semibold text-stone-900 mb-2">
                Reflection Lenses
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed font-sans">
                See the same moment from different perspectives without changing your original voice.
              </p>
            </div>
          </div>

          {/* Card 2: Living Memory */}
          <div className="p-6 rounded-2xl bg-white border border-[#e8e2d8] shadow-2xs flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-900 flex items-center justify-center border border-indigo-200/80 mb-3.5">
                <Sparkles className="w-4 h-4 text-indigo-800" />
              </div>
              <h3 className="font-serif text-base font-semibold text-stone-900 mb-2">
                Living Memory
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed font-sans">
                Notice patterns and connections across the moments you've chosen to connect.
              </p>
            </div>
          </div>

          {/* Card 3: Memory Receipts */}
          <div className="p-6 rounded-2xl bg-white border border-[#e8e2d8] shadow-2xs flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-900 flex items-center justify-center border border-emerald-200/80 mb-3.5">
                <Receipt className="w-4 h-4 text-emerald-800" />
              </div>
              <h3 className="font-serif text-base font-semibold text-stone-900 mb-2">
                Memory Receipts
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed font-sans">
                See which past moments helped shape an AI insight.
              </p>
            </div>
          </div>

          {/* Card 4: Your Memory, Your Rules */}
          <div className="p-6 rounded-2xl bg-white border border-[#e8e2d8] shadow-2xs flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-900 flex items-center justify-center border border-amber-200/80 mb-3.5">
                <ShieldCheck className="w-4 h-4 text-amber-800" />
              </div>
              <h3 className="font-serif text-base font-semibold text-stone-900 mb-2">
                Your Memory, Your Rules
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed font-sans">
                Choose whether a moment stays private, supports one reflection, or becomes part of your longer story.
              </p>
            </div>
          </div>

          {/* Card 5: Voice Journaling */}
          <div className="p-6 rounded-2xl bg-white border border-[#e8e2d8] shadow-2xs flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-900 flex items-center justify-center border border-rose-200/80 mb-3.5">
                <Mic className="w-4 h-4 text-rose-800" />
              </div>
              <h3 className="font-serif text-base font-semibold text-stone-900 mb-2">
                Voice Journaling
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed font-sans">
                Capture a thought naturally when speaking feels easier than typing.
              </p>
            </div>
          </div>

          {/* Card 6: Memories Across Place & Time */}
          <div className="p-6 rounded-2xl bg-white border border-[#e8e2d8] shadow-2xs flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-900 flex items-center justify-center border border-teal-200/80 mb-3.5">
                <MapPin className="w-4 h-4 text-teal-800" />
              </div>
              <h3 className="font-serif text-base font-semibold text-stone-900 mb-2">
                Memories Across Place & Time
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed font-sans">
                Optionally reconnect memories with places that mattered to your story.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Simple Journey Strip */}
      <section className="p-5 sm:p-6 rounded-2xl bg-white/70 border border-[#e8e2d8] text-center shadow-2xs">
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm font-medium text-stone-700">
          <span className="px-3 py-1 rounded-lg bg-[#f4eee6] text-amber-950 font-semibold">Idea</span>
          <ArrowRight className="w-3.5 h-3.5 text-stone-400 shrink-0" />
          <span className="px-3 py-1 rounded-lg bg-[#f4eee6] text-amber-950 font-semibold">Reflection Lenses</span>
          <ArrowRight className="w-3.5 h-3.5 text-stone-400 shrink-0" />
          <span className="px-3 py-1 rounded-lg bg-[#f4eee6] text-amber-950 font-semibold">Living Memory</span>
          <ArrowRight className="w-3.5 h-3.5 text-stone-400 shrink-0" />
          <span className="px-3 py-1 rounded-lg bg-[#f4eee6] text-amber-950 font-semibold">Voice & Place</span>
          <ArrowRight className="w-3.5 h-3.5 text-stone-400 shrink-0" />
          <span className="px-3 py-1 rounded-lg bg-[#f4eee6] text-amber-950 font-semibold">Privacy & Control</span>
          <ArrowRight className="w-3.5 h-3.5 text-stone-400 shrink-0" />
          <span className="px-3 py-1 rounded-lg bg-stone-900 text-stone-100 font-semibold">Cloud Run</span>
        </div>
      </section>

      {/* 4. Technology Strip */}
      <section className="text-center space-y-3 pt-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 font-sans block">
          Built with
        </span>
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-stone-200/80 text-xs font-medium text-stone-800 shadow-2xs">
            <Cpu className="w-3.5 h-3.5 text-amber-700" />
            Gemini
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-stone-200/80 text-xs font-medium text-stone-800 shadow-2xs">
            <Cloud className="w-3.5 h-3.5 text-blue-700" />
            Google Cloud Run
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-stone-200/80 text-xs font-medium text-stone-800 shadow-2xs">
            <Lock className="w-3.5 h-3.5 text-amber-600" />
            Firebase Authentication
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-stone-200/80 text-xs font-medium text-stone-800 shadow-2xs">
            <Database className="w-3.5 h-3.5 text-orange-600" />
            Cloud Firestore
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-stone-200/80 text-xs font-medium text-stone-800 shadow-2xs">
            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
            Google Maps Platform
          </span>
        </div>
      </section>
    </div>
  );
};
