import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent as ReactMouseEvent } from 'react';
import type { SessionData } from '../types';
import { useSessionStore } from '../context/SessionStore';
import styles from './SessionCard.module.css';

const dateFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

type Props = {
  session: SessionData;
  onOpen: () => void;
};

export default function SessionCard({ session, onOpen }: Props) {
  const { updateSession, deleteSession } = useSessionStore();
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(session.sessionName);
  const [confirming, setConfirming] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renaming) inputRef.current?.select();
  }, [renaming]);

  const startRename = (e: ReactMouseEvent) => {
    e.stopPropagation();
    setDraft(session.sessionName);
    setRenaming(true);
  };

  const confirmRename = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== session.sessionName) {
      updateSession(session.id, { sessionName: trimmed });
    }
    setRenaming(false);
  };

  const handleInputKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      confirmRename();
    } else if (e.key === 'Escape') {
      setRenaming(false);
    }
  };

  const handleCardKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') onOpen();
  };

  return (
    <div
      className={styles.card}
      onClick={onOpen}
      onKeyDown={handleCardKey}
      role="button"
      tabIndex={0}
    >
      <div className={styles.content}>
        {renaming ? (
          <input
            ref={inputRef}
            className={styles.renameInput}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={handleInputKey}
            onBlur={confirmRename}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span
            className={styles.name}
            onClick={startRename}
            title="Click to rename"
          >
            {session.sessionName}
          </span>
        )}
        <span className={styles.meta}>
          {session.filePath} &middot; {dateFormat.format(new Date(session.lastAccessed))}
        </span>
      </div>
      {confirming ? (
        <div className={styles.confirmRow} onClick={e => e.stopPropagation()}>
          <span className={styles.confirmText}>Delete?</span>
          <button
            className={styles.confirmYes}
            onClick={e => { e.stopPropagation(); deleteSession(session.id); }}
          >
            Yes
          </button>
          <button
            className={styles.confirmNo}
            onClick={e => { e.stopPropagation(); setConfirming(false); }}
          >
            No
          </button>
        </div>
      ) : (
        <button
          className={styles.deleteBtn}
          aria-label="Delete session"
          onClick={e => { e.stopPropagation(); setConfirming(true); }}
        >
          ×
        </button>
      )}
      <span className={styles.arrow} aria-hidden>›</span>
    </div>
  );
}
