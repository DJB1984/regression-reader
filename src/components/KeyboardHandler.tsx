import { useEffect } from 'react';
import type { Mode } from '../types';

type Props = {
  mode: Mode;
  onMoveUp: () => void;
  onMoveUpUncross: () => void;
  onMoveDown: () => void;
  onToggleJump: () => void;
  onOpenNote: () => void;
  onToggleCrossed: () => void;
  onStrikeAndMove: () => void;
  onOpenBugBubble: () => void;
  onMoveBugUp: () => void;
  onMoveBugDown: () => void;
  onExitScroll: () => void;
  onExpandContext: () => void;
  onSummaryEscape: () => void;
  onCycleMode: (direction: 'prev' | 'next') => void;
};

export default function KeyboardHandler({
  mode,
  onMoveUp,
  onMoveUpUncross,
  onMoveDown,
  onToggleJump,
  onOpenNote,
  onToggleCrossed,
  onStrikeAndMove,
  onOpenBugBubble,
  onMoveBugUp,
  onMoveBugDown,
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

      // Left/right (and A/D) cycle through modes in all non-typing contexts
      if (e.key === 'ArrowLeft'  || e.key === 'a') { e.preventDefault(); onCycleMode('prev'); return; }
      if (e.key === 'ArrowRight' || e.key === 'd') { e.preventDefault(); onCycleMode('next'); return; }

      // B always opens bug bubble regardless of mode
      if (e.key === 'b') { e.preventDefault(); onOpenBugBubble(); return; }

      // N opens bug bubble in bug mode, note bubble otherwise
      if (e.key === 'n') {
        e.preventDefault();
        if (mode === 'bug') onOpenBugBubble();
        else onOpenNote();
        return;
      }

      // X toggles strikethrough on the active line in all modes
      if (e.key === 'x') { e.preventDefault(); onToggleCrossed(); return; }

      // Bug mode navigation
      if (mode === 'bug') {
        if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'Enter') { e.preventDefault(); onMoveBugDown(); }
        if (e.key === 'ArrowUp'   || e.key === 'w')                      { e.preventDefault(); onMoveBugUp(); }
        return;
      }

      if (mode === 'scroll') {
        if (e.key === 'Escape') { e.preventDefault(); onExitScroll(); }
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
        return;
      }

      if (mode === 'summary') {
        if (e.key === 'Escape') { e.preventDefault(); onSummaryEscape(); }
        if (e.key === ' ')      { e.preventDefault(); onExpandContext(); }
        if (e.key === 'ArrowDown' || e.key === 'Enter') { e.preventDefault(); onMoveDown(); }
        if (e.key === 's') { e.preventDefault(); onStrikeAndMove(); }
        if (e.key === 'ArrowUp')  { e.preventDefault(); onMoveUp(); }
        if (e.key === 'w')        { e.preventDefault(); onMoveUpUncross(); }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
        case 'Enter':     e.preventDefault(); onMoveDown(); break;
        case 's':         e.preventDefault(); onStrikeAndMove(); break;
        case 'ArrowUp':   e.preventDefault(); onMoveUp(); break;
        case 'w':         e.preventDefault(); onMoveUpUncross(); break;
        case 'Tab':       e.preventDefault(); onToggleJump(); break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, onMoveUp, onMoveUpUncross, onMoveDown, onToggleJump, onOpenNote, onToggleCrossed,
      onStrikeAndMove, onOpenBugBubble, onMoveBugUp, onMoveBugDown,
      onExitScroll, onExpandContext, onSummaryEscape, onCycleMode]);

  return null;
}
