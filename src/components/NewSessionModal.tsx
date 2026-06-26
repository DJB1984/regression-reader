import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '../context/SessionStore';
import { createNotesFile, pickMdFile } from '../lib/fileSystem';
import styles from './NewSessionModal.module.css';

type Props = {
  onClose: () => void;
};

export default function NewSessionModal({ onClose }: Props) {
  const { createSession } = useSessionStore();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [mdHandle, setMdHandle] = useState<FileSystemFileHandle | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const handlePickFile = async () => {
    setError(null);
    try {
      const handle = await pickMdFile();
      setMdHandle(handle);
      if (!name.trim()) {
        setName(handle.name.replace(/\.md$/i, ''));
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setError('Could not open file.');
    }
  };

  const handleCreate = async () => {
    if (!name.trim() || !mdHandle || creating) return;
    setCreating(true);
    setError(null);
    try {
      // Both pickers must be called here, directly in the click handler,
      // so Chrome's user-gesture requirement is satisfied.
      const baseName = mdHandle.name.replace(/\.md$/i, '');
      const notesHandle = await createNotesFile(`${baseName}.notes.json`, mdHandle);
      const id = await createSession(name.trim(), mdHandle, notesHandle);
      navigate(`/session/${id}`);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        setCreating(false);
        return;
      }
      console.error('Session creation failed:', e);
      const detail = e instanceof Error ? e.message : String(e);
      setError(`Failed to create session: ${detail}`);
      setCreating(false);
    }
  };

  const canCreate = name.trim().length > 0 && mdHandle !== null && !creating;

  const handleModalKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'Enter' && canCreate) handleCreate();
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={e => e.stopPropagation()}
        onKeyDown={handleModalKey}
      >
        <h2 className={styles.title}>New Session</h2>

        <label className={styles.label}>
          Session name
          <input
            ref={nameRef}
            className={styles.input}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. June Release"
          />
        </label>

        <div className={styles.filePicker}>
          <button className={styles.fileButton} onClick={handlePickFile}>
            {mdHandle ? 'Change file' : 'Pick .md file'}
          </button>
          {mdHandle && (
            <span className={styles.fileName}>{mdHandle.name}</span>
          )}
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.actions}>
          <button className={styles.cancelButton} onClick={onClose}>
            Cancel
          </button>
          <button
            className={styles.createButton}
            onClick={handleCreate}
            disabled={!canCreate}
          >
            {creating ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
