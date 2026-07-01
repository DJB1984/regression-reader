import { AnimatePresence, motion } from 'framer-motion';
import { useRef, useState } from 'react';
import type { Mode } from '../types';
import styles from './TopBar.module.css';

const MODES: { value: Mode; label: string }[] = [
  { value: 'scroll',  label: 'Scroll'  },
  { value: 'arrow',   label: 'Arrow'   },
  { value: 'jump',    label: 'Jump'    },
  { value: 'summary', label: 'Summary' },
];

type Props = {
  sessionName: string;
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  onSave: () => void;
  onBack: () => void;
  globalKeysEnabled: boolean;
  onGlobalKeysToggle: () => void;
};

export default function TopBar({
  sessionName,
  mode,
  onModeChange,
  onSave,
  onBack,
  globalKeysEnabled,
  onGlobalKeysToggle,
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
        <button
          role="switch"
          aria-checked={globalKeysEnabled}
          className={`${styles.toggle} ${globalKeysEnabled ? styles.toggleOn : ''}`}
          onClick={onGlobalKeysToggle}
          title="Global keys — navigate while window is unfocused"
        >
          <span className={styles.toggleThumb} />
        </button>
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
