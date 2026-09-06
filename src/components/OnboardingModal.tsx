import React, { useState } from 'react';
import { Sparkles, Check, Heart, Briefcase, Flower2, Compass } from 'lucide-react';
import { ReflectionLens, UserPreferences } from '../types';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPreferences?: UserPreferences;
  onSavePreferences: (prefs: UserPreferences) => Promise<void>;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  currentPreferences,
  onSavePreferences,
}) => {
  const [enabledLenses, setEnabledLenses] = useState<ReflectionLens[]>(
    currentPreferences?.enabledLenses || ['PERSONAL', 'PROFESSIONAL', 'IDENTITY_AND_GROWTH']
  );
  const [defaultLens, setDefaultLens] = useState<ReflectionLens>(
    currentPreferences?.defaultLens || 'PERSONAL'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const toggleLens = (lens: ReflectionLens) => {
    let next: ReflectionLens[];
    if (enabledLenses.includes(lens)) {
      // Must keep at least one enabled
      if (enabledLenses.length <= 1) return;
      next = enabledLenses.filter((l) => l !== lens);
      if (defaultLens === lens) {
        setDefaultLens(next[0]);
      }
    } else {
      next = [...enabledLenses, lens];
    }
    setEnabledLenses(next);
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await onSavePreferences({
        enabledLenses,
        defaultLens,
        defaultMemoryContract: currentPreferences?.defaultMemoryContract || 'MAY_CONNECT',
        onboardingCompleted: true,
      });
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const lenses = [
    {
      id: 'PERSONAL' as ReflectionLens,
      title: 'Personal',
      icon: Heart,
      color: 'text-amber-800 bg-amber-50 border-amber-200',
      description: 'Everyday life, memories, relationships, emotions, choices, and gratitude.',
      badge: 'Core',
    },
    {
      id: 'PROFESSIONAL' as ReflectionLens,
      title: 'Professional',
      icon: Briefcase,
      color: 'text-indigo-800 bg-indigo-50 border-indigo-200',
      description: 'Projects, lessons learned, feedback, achievements, and career growth without invented metrics.',
      badge: 'Work & Impact',
    },
    {
      id: 'WOMEN_AND_LIFE' as ReflectionLens,
      title: 'Women & Life',
      icon: Flower2,
      color: 'text-rose-800 bg-rose-50 border-rose-200',
      description: 'Optional space to notice boundaries, agency, milestones, leadership, and independence with zero stereotyping.',
      badge: 'Opt-in Perspective',
    },
    {
      id: 'IDENTITY_AND_GROWTH' as ReflectionLens,
      title: 'Identity & Growth',
      icon: Compass,
      color: 'text-emerald-800 bg-emerald-50 border-emerald-200',
      description: 'Tentatively exploring mindset shifts, habits, values, and inner evolutions through gentle inquiry.',
      badge: 'Inner Evolution',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-[#faf8f5] border border-[#e2ddd5] rounded-2xl max-w-xl w-full p-6 sm:p-8 shadow-xl text-stone-800 my-8">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-900/80 mb-2">
          <Sparkles className="w-4 h-4 text-amber-600" />
          Welcome to Personal Gemini Journal
        </div>
        <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-stone-900 mb-2 tracking-tight">
          How would you like to reflect?
        </h2>
        <p className="text-stone-600 text-sm mb-6 leading-relaxed">
          Select the perspectives you want active in your journal. You can switch between enabled lenses anytime while writing, and your privacy remains strictly yours.
        </p>

        <div className="space-y-3 mb-6">
          {lenses.map((item) => {
            const isEnabled = enabledLenses.includes(item.id);
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                id={`lens-option-${item.id.toLowerCase()}`}
                onClick={() => toggleLens(item.id)}
                className={`flex items-start gap-3.5 p-3.5 rounded-xl border transition-all cursor-pointer ${
                  isEnabled
                    ? 'bg-white border-stone-300 shadow-xs ring-1 ring-stone-900/5'
                    : 'bg-stone-100/60 border-stone-200 opacity-65 hover:opacity-85'
                }`}
              >
                <div className={`p-2 rounded-lg border ${item.color} mt-0.5 shrink-0`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-stone-900">{item.title}</span>
                    <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-stone-200/60 text-stone-700">
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 leading-snug">{item.description}</p>
                </div>
                <div
                  className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                    isEnabled
                      ? 'bg-stone-900 border-stone-900 text-white'
                      : 'border-stone-300 bg-white'
                  }`}
                >
                  {isEnabled && <Check className="w-3.5 h-3.5" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Default Lens Selector */}
        <div className="mb-6 p-4 rounded-xl bg-white border border-[#e4dfd6]">
          <label className="block text-xs font-semibold text-stone-700 mb-1.5 uppercase tracking-wide">
            Your Starting Default Lens
          </label>
          <select
            id="select-default-lens"
            value={defaultLens}
            onChange={(e) => setDefaultLens(e.target.value as ReflectionLens)}
            className="w-full bg-[#fcfbfa] border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-800 font-medium focus:outline-none focus:ring-2 focus:ring-amber-800/20"
          >
            {enabledLenses.map((l) => (
              <option key={l} value={l}>
                {l === 'PERSONAL' && 'Personal — Everyday Moments & Emotion'}
                {l === 'PROFESSIONAL' && 'Professional — Work, Decisions & Achievements'}
                {l === 'WOMEN_AND_LIFE' && 'Women & Life — Agency, Boundaries & Milestones'}
                {l === 'IDENTITY_AND_GROWTH' && 'Identity & Growth — Evolving Values & Mindset'}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#eae5dd]">
          <button
            id="btn-onboarding-complete"
            disabled={isSubmitting || enabledLenses.length === 0}
            onClick={handleSave}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-stone-900 text-white font-medium text-sm hover:bg-stone-800 disabled:opacity-50 shadow-xs transition-all"
          >
            {isSubmitting ? 'Configuring Journal...' : 'Begin Journaling'}
          </button>
        </div>
      </div>
    </div>
  );
};
