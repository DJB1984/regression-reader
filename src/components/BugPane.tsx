import { AnimatePresence } from 'framer-motion';
import { useEffect, useRef } from 'react';
import NotesBubble from './NotesBubble';
import styles from './BugPane.module.css';

type Props = {
  bugNotes: string[];
  activeBugIndex: number;
  bugBubbleOpen: boolean;
  bugBubbleDraft: string;
  editingBugIndex: number | null;
  onSaveBug: () => void;
  onDeleteBug: () => void;
  onCloseBug: () => void;
  onSetBugDraft: (text: string) => void;
};

export default function BugPane({
  bugNotes,
  activeBugIndex,
  bugBubbleOpen,
  bugBubbleDraft,
  editingBugIndex,
  onSaveBug,
  onDeleteBug,
  onCloseBug,
  onSetBugDraft,
}: Props) {
  const paneRef  = useRef<HTMLDivElement | null>(null);
  const activeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el   = activeRef.current;
    const pane = paneRef.current;
    if (!el || !pane) return;
    const top    = el.offsetTop;
    const height = el.offsetHeight;
    pane.scrollTop = Math.max(0, top - pane.clientHeight / 2 + height / 2);
  }, [activeBugIndex]);

  return (
    <div ref={paneRef} className={styles.pane}>
      <div className={styles.inner}>
        {bugNotes.length === 0 ? (
          <div className={styles.empty}>
            No bugs reported — press <kbd>B</kbd> while reading to add one.
          </div>
        ) : (
          bugNotes.map((bug, index) => {
            const isActive = index === activeBugIndex;
            return (
              <div key={index}>
                <div className={styles.separator} />
                <div
                  ref={isActive ? activeRef : undefined}
                  className={`${styles.entry} ${isActive ? styles.active : ''}`}
                >
                  <span className={styles.text}>{bug}</span>
                  {isActive && (
                    <AnimatePresence>
                      {bugBubbleOpen && editingBugIndex === index && (
                        <NotesBubble
                          key="bug-edit"
                          draft={bugBubbleDraft}
                          onChange={onSetBugDraft}
                          onSave={onSaveBug}
                          onDelete={onDeleteBug}
                          onClose={onCloseBug}
                          variant="bug"
                          placeholder="Describe the bug…"
                        />
                      )}
                    </AnimatePresence>
                  )}
                </div>
              </div>
            );
          })
        )}
        {bugNotes.length > 0 && <div className={styles.separator} />}
      </div>
    </div>
  );
}
