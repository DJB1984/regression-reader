import { useEffect, useRef } from 'react';
import type { KeyboardEvent, WheelEvent } from 'react';
import { motion } from 'framer-motion';
import styles from './NotesBubble.module.css';

type Props = {
  draft: string;
  onChange: (text: string) => void;
  onSave: () => void;
  onClose: () => void;
};

export default function NotesBubble({ draft, onChange, onSave, onClose }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    // Enter saves; Shift+Enter inserts a newline as normal
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSave();
    }
    // Alt+N (save + close) is also handled by the global KeyboardHandler
  };

  // Prevent wheel events from bubbling up to DocumentPane's onWheel,
  // which would trigger scroll mode while the user is scrolling within the note.
  const stopWheelPropagation = (e: WheelEvent) => e.stopPropagation();

  return (
    <motion.div
      className={styles.wrapper}
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.7 }}
      style={{ overflow: 'hidden' }}
      onWheel={stopWheelPropagation}
    >
      <div className={styles.bubble}>
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          value={draft}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a note…"
          rows={3}
        />
        <p className={styles.hint}>
          <kbd>Enter</kbd> save &nbsp;·&nbsp; <kbd>Shift+Enter</kbd> newline &nbsp;·&nbsp; <kbd>Esc</kbd> discard
        </p>
      </div>
    </motion.div>
  );
}
