import { AnimatePresence, motion } from 'framer-motion';
import { useRef, useState } from 'react';
import type { Mode } from '../types';
import styles from './TopBar.module.css';

const MODES: { value: Mode; label: string }[] = [
  { value: 'scroll',  label: 'Scroll'  },
  { value: 'arrow',   label: 'Arrow'   },
  { value: 'jump',    label: 'Jump'    },
  { value: 'summary', label: 'Summary' },
  { value: 'bug',     label: 'Bug'     },
];

type Props = {
  sessionName: string;
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  onSave: () => void;
  onBack: () => void;
  globalKeysEnabled: boolean;
  onGlobalKeysToggle: () => void;
  notesExpanded: boolean;
  onNotesExpandedToggle: () => void;
};

export default function TopBar({
  sessionName,
  mode,
  onModeChange,
  onSave,
  onBack,
  globalKeysEnabled,
  onGlobalKeysToggle,
  notesExpanded,
  onNotesExpandedToggle,
}: Props) {
  const [saved, setSaved] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSave = () => {
    onSave();
    if (timerRef.current) clearTimeout(timerRef.current);
    setSaved(true);
    timerRef.current = setTimeout(() => setSaved(false), 1500);
  };

  return (
    <header className={styles.bar}>
      <button className={styles.iconBtn} onClick={onBack} title="Back to home">
        ←
      </button>

      <span className={styles.name}>{sessionName}</span>

      <div className={styles.modes}>
        {MODES.map(m => (
          <button
            key={m.value}
            className={`${styles.modeBtn} ${mode === m.value ? styles.modeActive : ''}`}
            onClick={() => onModeChange(m.value)}
          >
            {mode === m.value && (
              <AnimatePresence>
                <motion.span
                  className={styles.modeBg}
                  layoutId="mode-bg"
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              </AnimatePresence>
            )}
            <span className={styles.modeLbl}>{m.label}</span>
          </button>
        ))}
      </div>

      <div className={styles.actions}>
        <label className={styles.toggleGroup}>
          <span className={styles.toggleLabel}>Global</span>
          <button
            role="switch"
            aria-checked={globalKeysEnabled}
            className={`${styles.toggle} ${globalKeysEnabled ? styles.toggleOn : ''}`}
            onClick={onGlobalKeysToggle}
            title="Navigate while window is unfocused"
          >
            <span className={styles.toggleThumb} />
          </button>
        </label>
        <label className={styles.toggleGroup}>
          <span className={styles.toggleLabel}>Notes</span>
          <button
            role="switch"
            aria-checked={notesExpanded}
            className={`${styles.toggle} ${notesExpanded ? styles.toggleOn : ''}`}
            onClick={onNotesExpandedToggle}
            title="Show all note text inline"
          >
            <span className={styles.toggleThumb} />
          </button>
        </label>
        <button
          className={`${styles.iconBtn} ${saved ? styles.iconBtnSaved : ''}`}
          onClick={handleSave}
          title="Flush notes to disk"
        >
          {saved ? '✓' : '↓'}
        </button>
      </div>
    </header>
  );
}
