import React, { useState, useEffect, useRef } from 'react';
import { Smile, X } from 'lucide-react';

export interface EmojiPickerProps {
  isOpen?: boolean;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
}

type EmojiCategory = 'Smileys' | 'People' | 'Nature' | 'Food' | 'Activities' | 'Travel' | 'Objects' | 'Symbols';

const EMOJI_CATEGORIES: Record<EmojiCategory, string[]> = {
  Smileys: ['😀', '😃', '😄', '😁', '😊', '🥰', '😍', '😌', '🤔', '🧐', '😴', '🥺', '😭', '😤', '🤗', '🤫', '😇', '🥳', '😎', '🤓'],
  People: ['👋', '🙌', '👏', '🤝', '👍', '👎', '✌️', '🤞', '🙏', '💪', '🧠', '👀', '🧑‍💻', '🧘‍♀️', '🧘‍♂️', '🏃‍♀️', '🚶‍♂️', '🙋‍♀️', '🤷‍♂️', '✍️'],
  Nature: ['🌿', '🌱', '🌸', '🌼', '🌻', '🌲', '🌳', '🍂', '🍁', '☀️', '⛅', '🌧️', '⛈️', '❄️', '🌊', '🌙', '⭐', '✨', '🌈', '🔥'],
  Food: ['☕', '🍵', '🍎', '🥑', '🍞', '🥐', '🍕', '🥗', '🍲', '🍜', '🍱', '🍣', '🍫', '🍰', '🍪', '🍇', '🍉', '🍊', '🍓', '🧁'],
  Activities: ['🎨', '📚', '🎯', '⚽', '🏀', '🎾', '🎸', '🎹', '🎧', '🎮', '🏆', '🥇', '🚴‍♀️', '🧗‍♂️', '🏊‍♂️', '♟️', '🎬', '🎤', '🎪', '🎲'],
  Travel: ['✈️', '🚗', '🚲', '🚂', '🏖️', '⛰️', '🏕️', '🏙️', '🏡', '🗺️', '🧭', '🗼', '🗽', '⛺', '🌅', '🌄', '🌉', '🧳', '🚀', '⛵'],
  Objects: ['💡', '📖', '📝', '📌', '🔑', '💻', '📱', '📷', '⏰', '⏳', '🎁', '📦', '🏷️', '💎', '🕯️', '✉️', '📅', '🔍', '🔒', '📎'],
  Symbols: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💖', '⭐', '⚡', '☀️', '☘️', '⚓', '🕊️', '☮️', '✨', '✔️', '💯'],
};

export const EmojiPicker: React.FC<EmojiPickerProps> = ({
  isOpen = true,
  onClose,
  onSelectEmoji,
}) => {
  const [activeCategory, setActiveCategory] = useState<EmojiCategory>('Smileys');
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close on Escape or click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const displayedEmojis = EMOJI_CATEGORIES[activeCategory] || [];

  return (
    <div
      ref={pickerRef}
      className="absolute bottom-12 left-0 z-50 w-72 sm:w-80 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-2xl shadow-xl p-3 space-y-2.5 animate-in fade-in zoom-in-95 duration-100"
      role="dialog"
      aria-label="Emoji Picker"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-1.5 border-b border-stone-100 dark:border-stone-800">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-800 dark:text-stone-200">
          <Smile className="w-3.5 h-3.5 text-amber-600" />
          <span>Insert Emoji</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"
          aria-label="Close emoji picker"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] font-medium border-b border-stone-100 dark:border-stone-800">
        {(Object.keys(EMOJI_CATEGORIES) as EmojiCategory[]).map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={`px-2 py-1 rounded-lg whitespace-nowrap transition cursor-pointer ${
              activeCategory === cat
                ? 'bg-amber-100/80 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 font-semibold'
                : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800/40'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Emoji Grid */}
      <div
        className="grid grid-cols-7 sm:grid-cols-8 gap-1.5 max-h-48 overflow-y-auto p-1"
        role="grid"
        aria-label="Emojis"
      >
        {displayedEmojis.map((emoji, idx) => (
          <button
            key={`${emoji}-${idx}`}
            type="button"
            onClick={() => {
              onSelectEmoji(emoji);
              onClose();
            }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer active:scale-95"
            aria-label={`Insert ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};
