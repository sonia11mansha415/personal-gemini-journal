import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Sparkles, 
  Send, 
  AlertCircle, 
  RefreshCw, 
  ArrowRight, 
  Check, 
  Award, 
  X,
  MessageCircle,
  ShieldCheck,
  Briefcase,
  Heart,
  Compass,
  Sun
} from 'lucide-react';
import { ReflectionMessage, ReflectionLens, MemoryContract, MemoryReceipt } from '../types';
import { cleanReflectionProse } from '../utils/reflectionSanitizer';

interface ReflectionPanelProps {
  entryId?: string;
  messages: ReflectionMessage[];
  currentLens: ReflectionLens;
  enabledLenses?: ReflectionLens[];
  memoryContract: MemoryContract;
  isReflecting: boolean;
  reflectionError: string | null;
  onSendFollowUp: (promptText: string) => void;
  onSwitchLens: (newLens: ReflectionLens) => void;
  onConfirmCareerWin: (win: { title: string; summary: string }) => Promise<boolean> | void;
  onRetryReflection: () => void;
  onOpenReceipt?: (receipt: MemoryReceipt) => void;
}

export const ReflectionPanel: React.FC<ReflectionPanelProps> = ({
  entryId,
  messages,
  currentLens,
  enabledLenses,
  memoryContract,
  isReflecting,
  reflectionError,
  onSendFollowUp,
  onSwitchLens,
  onConfirmCareerWin,
  onRetryReflection,
  onOpenReceipt,
}) => {
  const [followUpText, setFollowUpText] = useState('');
  const [dismissedLensSuggestion, setDismissedLensSuggestion] = useState(false);
  const [dismissedWinSuggestion, setDismissedWinSuggestion] = useState(false);
  const [confirmedWins, setConfirmedWins] = useState<string[]>([]);

  // 1. Internal Scroll Ref for the conversation stream (never scrolls window/document)
  const conversationRef = useRef<HTMLDivElement>(null);
  const shouldStickToBottomRef = useRef<boolean>(false);
  const scrollRafIdRef = useRef<number | null>(null);
  const prevEntryIdRef = useRef<string | undefined>(entryId);
  const prevMessagesLengthRef = useRef<number>(messages.length);
  const prevIsReflectingRef = useRef<boolean>(isReflecting);

  // Helper to detect prefers-reduced-motion for accessible scroll behavior
  const getScrollBehavior = useCallback((): ScrollBehavior => {
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return 'auto';
    }
    return 'smooth';
  }, []);

  // Safe bottom-scroll helper targeting ONLY the internal conversation container
  const scrollToBottom = useCallback((behavior?: ScrollBehavior) => {
    if (scrollRafIdRef.current !== null) {
      cancelAnimationFrame(scrollRafIdRef.current);
      scrollRafIdRef.current = null;
    }

    // Double requestAnimationFrame ensures layout flush and accurate scrollHeight
    scrollRafIdRef.current = requestAnimationFrame(() => {
      scrollRafIdRef.current = requestAnimationFrame(() => {
        scrollRafIdRef.current = null;
        const container = conversationRef.current;
        if (!container) return;
        const effectiveBehavior = behavior || getScrollBehavior();
        container.scrollTo({
          top: container.scrollHeight,
          behavior: effectiveBehavior,
        });
      });
    });
  }, [getScrollBehavior]);

  // Clean up any pending RAF on unmount
  useEffect(() => {
    return () => {
      if (scrollRafIdRef.current !== null) {
        cancelAnimationFrame(scrollRafIdRef.current);
      }
    };
  }, []);

  // 6. Respect Intentional User Scrolling: detect upward scroll > 80px from bottom
  const handleScroll = () => {
    const container = conversationRef.current;
    if (!container) return;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    if (distanceFromBottom > 80) {
      // User scrolled up intentionally to inspect prior conversation
      shouldStickToBottomRef.current = false;
    } else {
      // User returned near the bottom
      shouldStickToBottomRef.current = true;
    }
  };

  // 7. Entry / Conversation Isolation: reset state when switching entries
  useEffect(() => {
    if (prevEntryIdRef.current !== entryId) {
      prevEntryIdRef.current = entryId;
      shouldStickToBottomRef.current = false;
      if (conversationRef.current) {
        conversationRef.current.scrollTop = 0;
      }
      prevMessagesLengthRef.current = messages.length;
      prevIsReflectingRef.current = isReflecting;
    }
  }, [entryId, messages.length, isReflecting]);

  // 4 & 5. Reaction to message additions and isReflecting transitions
  useEffect(() => {
    const messagesIncreased = messages.length > prevMessagesLengthRef.current;
    const isReflectingStarted = !prevIsReflectingRef.current && isReflecting;
    const isReflectingFinished = prevIsReflectingRef.current && !isReflecting;

    prevMessagesLengthRef.current = messages.length;
    prevIsReflectingRef.current = isReflecting;

    if (shouldStickToBottomRef.current) {
      if (messagesIncreased || isReflectingStarted || isReflectingFinished) {
        scrollToBottom();
      }
    }
  }, [messages.length, isReflecting, scrollToBottom]);

  // If memoryContract is STORE_ONLY, reflection is disabled by user contract
  if (memoryContract === 'STORE_ONLY') {
    return (
      <div className="bg-stone-100/80 dark:bg-stone-900/40 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 text-center text-stone-600 dark:text-stone-400">
        <Sparkles className="w-5 h-5 mx-auto mb-2 text-stone-400 dark:text-stone-500" />
        <h4 className="font-serif text-base font-semibold text-stone-800 dark:text-stone-200 mb-1">
          Private Moment
        </h4>
        <p className="text-xs text-stone-500 dark:text-stone-400 max-w-md mx-auto leading-relaxed">
          This moment is saved privately and is not used for AI reflection. You can change the Memory Scope above at any time if you would like to reflect.
        </p>
      </div>
    );
  }

  const latestAssistant = [...messages].reverse().find((m) => m.role === 'assistant');

  const lensBadge = {
    PERSONAL: { label: 'Personal Lens', color: 'text-amber-900 bg-amber-50 border-amber-200', icon: Sun },
    PROFESSIONAL: { label: 'Professional Lens', color: 'text-indigo-900 bg-indigo-50 border-indigo-200', icon: Briefcase },
    WOMEN_AND_LIFE: { label: 'Women & Life Lens', color: 'text-rose-900 bg-rose-50 border-rose-200', icon: Heart },
    IDENTITY_AND_GROWTH: { label: 'Identity & Growth Lens', color: 'text-emerald-900 bg-emerald-50 border-emerald-200', icon: Compass },
  }[currentLens];

  // Check if suggested lens can be displayed
  const suggestedLensConfig = latestAssistant?.suggestedLens
    ? {
        PERSONAL: { label: 'Personal', icon: '☀️' },
        PROFESSIONAL: { label: 'Professional', icon: '💼' },
        WOMEN_AND_LIFE: { label: 'Women & Life', icon: '🌸' },
        IDENTITY_AND_GROWTH: { label: 'Identity & Growth', icon: '🌱' },
      }[latestAssistant.suggestedLens]
    : null;

  const canShowLensSuggestion = Boolean(
    latestAssistant?.suggestedLens &&
    latestAssistant.suggestedLens !== currentLens &&
    !dismissedLensSuggestion &&
    (latestAssistant.suggestedLens !== 'WOMEN_AND_LIFE' || (enabledLenses || []).includes('WOMEN_AND_LIFE'))
  );

  const handleFollowUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanText = followUpText.trim();
    if (!cleanText || isReflecting) return;
    // 3. Send Behavior: Mark stick to bottom, clear input, call onSendFollowUp, scroll smoothly
    shouldStickToBottomRef.current = true;
    setFollowUpText('');
    onSendFollowUp(cleanText);
    scrollToBottom('smooth');
  };

  return (
    <div className="bg-[#faf8f5] border border-[#e5dfd6] rounded-2xl p-4 sm:p-6 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-3.5 sm:pb-4 border-b border-[#e9e3da] mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-amber-800/10 text-amber-900 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="font-serif text-sm font-semibold text-stone-900 leading-snug">
              Reflective Companion
            </h4>
            <span className="text-[11px] text-stone-500 font-sans block truncate">
              Thoughtful mirroring • Your journal remains primary
            </span>
          </div>
        </div>

        <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg border whitespace-nowrap shrink-0 ${lensBadge.color}`}>
          {lensBadge.label}
        </span>
      </div>

      {/* Error state */}
      {reflectionError && (
        <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-4 mb-4 flex items-start justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-0.5">Reflection Temporarily Unavailable</p>
              <p className="text-stone-600">{reflectionError}</p>
            </div>
          </div>
          <button
            id="btn-retry-reflection"
            onClick={() => {
              shouldStickToBottomRef.current = true;
              scrollToBottom('smooth');
              onRetryReflection();
            }}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-800 text-white font-medium hover:bg-amber-900 shrink-0"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        </div>
      )}

      {/* Suggested Lens Notification (Never auto-switches, dismissible, metadata separated) */}
      {canShowLensSuggestion && suggestedLensConfig && (
        <div className="mb-4 bg-indigo-50/95 border border-indigo-200 rounded-xl p-4 text-xs text-indigo-950 shadow-2xs">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <span className="text-base shrink-0 select-none">
                {suggestedLensConfig.icon}
              </span>
              <div>
                <span className="font-semibold block text-indigo-900 mb-0.5">
                  A different perspective might help • Try {suggestedLensConfig.label} Lens
                </span>
                {latestAssistant?.suggestedLensReason && (
                  <p className="text-stone-600 italic leading-snug mb-2">
                    "{latestAssistant.suggestedLensReason}"
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <button
                    id="btn-switch-suggested-lens"
                    onClick={() => {
                      onSwitchLens(latestAssistant!.suggestedLens!);
                      setDismissedLensSuggestion(true);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-indigo-700 text-white font-medium hover:bg-indigo-800 transition-colors shadow-2xs whitespace-nowrap"
                  >
                    Switch to {suggestedLensConfig.label} <ArrowRight className="w-3 h-3" />
                  </button>
                  <button
                    id="btn-dismiss-suggested-lens"
                    onClick={() => setDismissedLensSuggestion(true)}
                    className="px-2.5 py-1 rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-100/60 font-medium transition-colors"
                  >
                    Not now
                  </button>
                </div>
              </div>
            </div>
            <button
              onClick={() => setDismissedLensSuggestion(true)}
              className="p-1 text-indigo-400 hover:text-indigo-800"
              title="Dismiss suggestion"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Suggested Career Win (Requires explicit user confirmation!) */}
      {latestAssistant?.suggestedCareerWin && !dismissedWinSuggestion && (
        <div className="mb-4 bg-emerald-50/95 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-950 shadow-2xs">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Award className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block text-emerald-900 mb-0.5">
                  Possible Career Win: {latestAssistant.suggestedCareerWin.title}
                </span>
                <p className="text-stone-600 leading-snug mb-2">
                  {latestAssistant.suggestedCareerWin.summary}
                </p>
                {confirmedWins.includes(latestAssistant.suggestedCareerWin.title) ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 font-semibold whitespace-nowrap">
                    <Check className="w-3 h-3" /> Confirmed & Saved to Wins Vault
                  </span>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      id="btn-confirm-career-win"
                      onClick={async () => {
                        const win = latestAssistant!.suggestedCareerWin!;
                        const res = onConfirmCareerWin(win);
                        if (res instanceof Promise) {
                          const ok = await res;
                          if (ok !== false) {
                            setConfirmedWins((prev) => [...prev, win.title]);
                          }
                        } else {
                          setConfirmedWins((prev) => [...prev, win.title]);
                        }
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-700 text-white font-medium hover:bg-emerald-800 shadow-2xs transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <Check className="w-3 h-3" /> Confirm & Save Win
                    </button>
                    <button
                      id="btn-dismiss-career-win"
                      onClick={() => setDismissedWinSuggestion(true)}
                      className="px-2.5 py-1 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-100/60 font-medium transition-colors"
                    >
                      Not now
                    </button>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => setDismissedWinSuggestion(true)}
              className="p-1 text-emerald-400 hover:text-emerald-800"
              title="Dismiss suggestion"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Messages Stream */}
      <div
        ref={conversationRef}
        onScroll={handleScroll}
        className="space-y-3.5 mb-5 max-h-96 overflow-y-auto pr-1"
      >
        {messages.length === 0 ? (
          <div className="text-center py-6 text-stone-400">
            <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-xs font-serif text-stone-500 italic">
              Write your moment above and click "Reflect with Gemini" to begin a calm, focused dialogue.
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const displayText = m.role === 'assistant' ? cleanReflectionProse(m.text) : m.text;
            return (
              <div
                key={m.id}
                className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-stone-900 text-stone-100 rounded-br-xs font-sans'
                      : 'bg-white border border-[#e6e0d6] text-stone-800 rounded-bl-xs font-serif text-sm shadow-2xs'
                  }`}
                >
                  {displayText}
                </div>

                {m.role === 'assistant' && m.memoryReceipt && (
                  <button
                    onClick={() => onOpenReceipt?.(m.memoryReceipt!)}
                    className="mt-1.5 ml-1 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50/90 border border-amber-200/80 text-amber-950 text-[11px] font-medium hover:bg-amber-100 transition-all shadow-2xs"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-800" />
                    <span>Why this insight? ({m.memoryReceipt.sources.length} past moments connected)</span>
                  </button>
                )}
              </div>
            );
          })
        )}

        {/* Lightweight typing/loading state */}
        {isReflecting && (
          <div className="flex justify-start">
            <div className="bg-white border border-[#e6e0d6] rounded-2xl rounded-bl-xs px-4 py-3 text-xs text-stone-600 font-sans flex items-center gap-2.5 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 animate-spin text-amber-700 shrink-0" />
              <div className="flex flex-col">
                <span className="font-sans font-semibold text-[11px] text-amber-900 uppercase tracking-wider">Reflective Companion</span>
                <span className="italic text-stone-500 font-serif">Reflecting on your moment…</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Multi-turn Follow-up Input */}
      {messages.length > 0 && (
        <form onSubmit={handleFollowUpSubmit} className="flex items-center gap-2">
          <input
            id="input-reflection-followup"
            type="text"
            value={followUpText}
            autoComplete="off"
            data-lpignore="true"
            onChange={(e) => setFollowUpText(e.target.value)}
            disabled={isReflecting}
            placeholder="Ask a follow-up or explore deeper..."
            className="flex-1 bg-white border border-stone-300 rounded-xl px-3.5 py-2 text-xs text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-amber-800 shadow-2xs font-sans"
          />
          <button
            id="btn-send-followup"
            type="submit"
            disabled={!followUpText.trim() || isReflecting}
            className="p-2 rounded-xl bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-50 transition-colors shadow-2xs shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      )}
    </div>
  );
};
