import type { RefObject } from 'react';
import type { Mode } from '../types';
import styles from './LineRow.module.css';

type Props = {
  line: string;
  isActive: boolean;
  hasNote: boolean;
  isBlank: boolean;
  mode: Mode;
  isContext?: boolean;
  elementRef?: RefObject<HTMLDivElement | null>;
  onClick?: () => void;
};

export default function LineRow({
  line,
  isActive,
  hasNote,
  isBlank,
  mode,
  isContext,
  elementRef,
  onClick,
}: Props) {
  // Fade non-active content in all focused modes; in summary, context lines are exempt
  // (they get the .context class instead at a slightly higher opacity)
  const faded = !isActive && !isBlank && mode !== 'scroll' && !(mode === 'summary' && isContext);
  const clickable = !!onClick && (mode === 'scroll' || (mode === 'summary' && !isContext));

  return (
    <div
      ref={elementRef}
      className={[
        styles.row,
        isBlank   ? styles.blank    : '',
        faded     ? styles.faded    : '',
        isContext ? styles.context  : '',
        clickable ? styles.clickable : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onClick}
      aria-current={isActive ? 'true' : undefined}
    >
      <span className={styles.dot}>
        {hasNote && !isBlank && <span className={styles.dotMark} aria-hidden />}
      </span>
      <span className={styles.text}>{isBlank ? '' : line}</span>
    </div>
  );
}
