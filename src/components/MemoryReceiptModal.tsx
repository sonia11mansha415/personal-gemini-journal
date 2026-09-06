import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  ExternalLink, 
  Check, 
  Trash2, 
  Unlink, 
  Calendar,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { MemoryReceipt, MemoryReceiptSource } from '../types';
import { authenticatedFetch } from '../api/authClient';

interface MemoryReceiptModalProps {
  receipt: MemoryReceipt | null;
  onClose: () => void;
  onSelectEntry?: (entryId: string) => void;
  onReceiptUpdated?: () => void;
}

export const MemoryReceiptModal: React.FC<MemoryReceiptModalProps> = ({
  receipt,
  onClose,
  onSelectEntry,
  onReceiptUpdated,
}) => {
  const [feedbackSent, setFeedbackSent] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!receipt) return null;

  const handleFeedback = async (verdict: 'ACCURATE' | 'NOT_QUITE' | 'DISCONNECTED' | 'REMOVED') => {
    setIsProcessing(true);
    try {
      await authenticatedFetch('/api/journal/receipts/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receiptId: receipt.id,
          verdict,
          sourceEntryIds: receipt.sources.map((s) => s.id),
        }),
      });
      setFeedbackSent(verdict);
      if (onReceiptUpdated) {
        onReceiptUpdated();
      }
      setTimeout(() => {
        if (verdict === 'REMOVED' || verdict === 'DISCONNECTED') {
          onClose();
        }
      }, 1200);
    } catch (err) {
      console.error('Error submitting receipt feedback:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs"
      onClick={onClose}
    >
      <div 
        className="bg-white border border-[#e5dfd6] rounded-2xl shadow-xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#fcfaf7] border-b border-[#e9e3da] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100/80 border border-amber-300/60 flex items-center justify-center text-amber-800">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-medium text-stone-900">
                Why this connection?
              </h3>
              <p className="text-xs text-stone-500">
                See the journal moments used for this insight
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/50 transition-all cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Why this insight block */}
          {receipt.reason && (
            <div className="p-3.5 bg-amber-50/70 border border-amber-200/60 rounded-xl">
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-900/80 block mb-0.5">
                    Why this connection was made
                  </span>
                  <p className="text-stone-800 text-xs sm:text-sm font-sans">
                    {receipt.reason}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Cross-entry claim if provided */}
          {receipt.crossEntryClaim && (
            <div className="text-xs text-stone-600 italic bg-stone-50 p-3 rounded-lg border border-stone-200/80">
              "{receipt.crossEntryClaim}"
            </div>
          )}

          {/* Verified Source Memories */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-600">
                Moments used for this insight ({receipt.sources.length})
              </span>
            </div>

            <div className="space-y-2.5">
              {receipt.sources.map((source, index) => (
                <div
                  key={source.id || index}
                  className="p-3.5 bg-[#fdfcfb] border border-[#e8e2d8] rounded-xl hover:border-amber-300/80 transition-all"
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h4 className="font-serif font-medium text-stone-900 text-sm">
                      {source.title || 'Untitled Moment'}
                    </h4>
                    {onSelectEntry && (
                      <button
                        onClick={() => {
                          onSelectEntry(source.id);
                          onClose();
                        }}
                        className="text-xs text-amber-800 hover:text-amber-950 hover:underline inline-flex items-center gap-1 font-medium shrink-0"
                      >
                        <span>Open</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-stone-500 mb-2">
                    <Calendar className="w-3.5 h-3.5 text-stone-400" />
                    <span>
                      {source.date
                        ? new Date(source.date).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : 'Earlier Moment'}
                    </span>
                    {source.lens && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-stone-100 text-stone-600 font-medium">
                        {source.lens}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-stone-600 line-clamp-3 bg-white p-2.5 rounded-lg border border-stone-100 italic">
                    "{source.excerpt}"
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* User Feedback & Control Section */}
          <div className="pt-2 border-t border-[#eee7dd]">
            <div className="flex items-center gap-1.5 text-xs text-stone-500 mb-3">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>How accurate is this memory connection?</span>
            </div>

            {feedbackSent ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>
                  {feedbackSent === 'ACCURATE' && 'Marked as accurate. Thank you for refining your Living Memory.'}
                  {feedbackSent === 'NOT_QUITE' && 'Feedback noted. Gemini will adjust its sensitivity.'}
                  {feedbackSent === 'DISCONNECTED' && 'Disconnected. These moments will no longer be linked together.'}
                  {feedbackSent === 'REMOVED' && 'Memory removed from your AI Living Memory.'}
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  onClick={() => handleFeedback('ACCURATE')}
                  disabled={isProcessing}
                  className="px-3 py-2 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-all flex items-center justify-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Accurate</span>
                </button>
                <button
                  onClick={() => handleFeedback('NOT_QUITE')}
                  disabled={isProcessing}
                  className="px-3 py-2 rounded-lg text-xs font-medium bg-stone-100 text-stone-700 border border-stone-200 hover:bg-stone-200/80 transition-all flex items-center justify-center gap-1"
                >
                  <span>Not quite</span>
                </button>
                <button
                  onClick={() => handleFeedback('DISCONNECTED')}
                  disabled={isProcessing}
                  className="px-3 py-2 rounded-lg text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-all flex items-center justify-center gap-1"
                >
                  <Unlink className="w-3.5 h-3.5" />
                  <span>Don't connect</span>
                </button>
                <button
                  onClick={() => handleFeedback('REMOVED')}
                  disabled={isProcessing}
                  className="px-3 py-2 rounded-lg text-xs font-medium bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100 transition-all flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#fcfaf7] border-t border-[#e9e3da] px-6 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium bg-stone-800 text-white hover:bg-stone-900 transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
