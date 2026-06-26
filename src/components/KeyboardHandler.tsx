import { useEffect } from 'react';
import type { Mode } from '../types';

type Props = {
  mode: Mode;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleJump: () => void;
  onOpenNote: () => void;
  onExitScroll: () => void;
  onExpandContext: () => void;
  onSummaryEscape: () => void;
  onCycleMode: (direction: 'prev' | 'next') => void;
};

export default function KeyboardHandler({
  mode,
  onMoveUp,
  onMoveDown,
  onToggleJump,
  onOpenNote,
  onExitScroll,
  onExpandContext,
  onSummaryEscape,
  onCycleMode,
}: Props) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      const isTyping =
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement;

      if (isTyping) return;

      // Left/right cycle through modes in all non-typing contexts
      if (e.key === 'ArrowLeft')  { e.preventDefault(); onCycleMode('prev'); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); onCycleMode('next'); return; }

      // N opens the note bubble in all modes
      if (e.key === 'n') { e.preventDefault(); onOpenNote(); return; }

      if (mode === 'scroll') {
        if (e.key === 'Escape') { e.preventDefault(); onExitScroll(); }
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
        return;
      }

      if (mode === 'summary') {
        if (e.key === 'Escape') { e.preventDefault(); onSummaryEscape(); }
        if (e.key === ' ')      { e.preventDefault(); onExpandContext(); }
        if (e.key === 'ArrowDown') { e.preventDefault(); onMoveDown(); }
        if (e.key === 'ArrowUp')   { e.preventDefault(); onMoveUp(); }
        return;
      }

      switch (e.key) {
        case 'ArrowDown': e.preventDefault(); onMoveDown(); break;
        case 'ArrowUp':   e.preventDefault(); onMoveUp();   break;
        case 'Tab':       e.preventDefault(); onToggleJump(); break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, onMoveUp, onMoveDown, onToggleJump, onOpenNote,
      onExitScroll, onExpandContext, onSummaryEscape, onCycleMode]);

  return null;
}
