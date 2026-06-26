import { AnimatePresence, animate, motion } from 'framer-motion';
import { Fragment, useCallback, useEffect, useMemo, useRef } from 'react';
import type { Mode } from '../types';
import LineRow from './LineRow';
import NotesBubble from './NotesBubble';
import styles from './DocumentPane.module.css';

type Props = {
  lines: string[];
  activeIndex: number;
  notes: Record<string, string>;
  mode: Mode;
  noteBubbleOpen: boolean;
  noteBubbleDraft: string;
  contextExpansion: Record<string, number>;
  onLineClick: (index: number) => void;
  onScroll: () => void;
  onSaveNote: () => void;
  onCloseNote: () => void;
  onSetNoteDraft: (text: string) => void;
};

const SPRING   = { type: 'spring', stiffness: 500, damping: 40, mass: 0.5 } as const;
const COLLAPSE = { type: 'spring', stiffness: 280, damping: 28, mass: 0.5 } as const;

export default function DocumentPane({
  lines,
  activeIndex,
  notes,
  mode,
  noteBubbleOpen,
  noteBubbleDraft,
  contextExpansion,
  onLineClick,
  onScroll,
  onSaveNote,
  onCloseNote,
  onSetNoteDraft,
}: Props) {
  const paneRef        = useRef<HTMLDivElement | null>(null);
  const activeRef      = useRef<HTMLDivElement | null>(null);
  const highlightRef   = useRef<HTMLDivElement | null>(null);
  const scrollAnim     = useRef<ReturnType<typeof animate> | null>(null);
  const highlightAnim  = useRef<ReturnType<typeof animate> | null>(null);
  const rafRef         = useRef<number | null>(null);
  const mountedRef     = useRef(false);
  const prevModeRef    = useRef<Mode>(mode);
  // Mutable mirror of mode — readable by Effect 1 without being in its dep array
  const currentModeRef = useRef<Mode>(mode);
  currentModeRef.current = mode;

  // Indices where context-frame separator lines should appear in summary mode.
  // 'before' = insert separator immediately before this line index (top of context block).
  // 'after'  = insert separator immediately after this line index (bottom of context block).
  const separators = useMemo(() => {
    const before = new Set<number>();
    const after  = new Set<number>();
    if (mode !== 'summary') return { before, after };
    for (const [key, expansion] of Object.entries(contextExpansion)) {
      if ((expansion ?? 0) <= 0) continue;
      const idx    = Number(key);
      const topIdx = Math.max(0, idx - expansion);
      const botIdx = Math.min(lines.length - 1, idx + expansion);
      if (topIdx < idx) before.add(topIdx); // context exists above
      if (botIdx > idx) after.add(botIdx);  // context exists below
    }
    return { before, after };
  }, [mode, contextExpansion, lines.length]);

  // Which lines are visible in summary mode
  const visibleInSummary = useMemo(() => {
    if (mode !== 'summary') return null;
    const visible = new Set<number>();
    for (const key of Object.keys(notes)) {
      const lineIdx = Number(key);
      if (!lines[lineIdx]?.trim()) continue;
      visible.add(lineIdx);
      const expansion = contextExpansion[key] ?? 0;
      for (let j = Math.max(0, lineIdx - expansion); j < lineIdx; j++) visible.add(j);
      for (let j = lineIdx + 1; j <= Math.min(lines.length - 1, lineIdx + expansion); j++) visible.add(j);
    }
    return visible;
  }, [mode, notes, contextExpansion, lines]);

  // ── Helpers ──────────────────────────────────────────────────────────────

  // Instantly snap the highlight bar to the given position (no animation)
  function snapHighlight(top: number, height: number) {
    const el = highlightRef.current;
    if (!el) return;
    el.style.top    = `${top}px`;
    el.style.height = `${height}px`;
  }

  // Spring-animate the highlight bar to the given position
  function springHighlight(top: number, height: number) {
    const el = highlightRef.current;
    if (!el) return;
    const fromTop    = parseFloat(el.style.top)    || 0;
    const fromHeight = parseFloat(el.style.height) || 0;
    highlightAnim.current?.stop();
    highlightAnim.current = animate(0, 1, {
      ...SPRING,
      onUpdate: p => {
        if (!highlightRef.current) return;
        highlightRef.current.style.top    = `${fromTop    + (top    - fromTop)    * p}px`;
        highlightRef.current.style.height = `${fromHeight + (height - fromHeight) * p}px`;
      },
    });
  }

  // ── Effect 1: activeIndex changes ─────────────────────────────────────────
  // Handles initial mount and smooth navigation in non-summary modes.
  // In summary mode: if no rAF loop is running (no layout change pending),
  // also springs to the new line. If the rAF loop IS running (layout animating),
  // skips — Effect 2 owns positioning.
  useEffect(() => {
    const el   = activeRef.current;
    const pane = paneRef.current;
    if (!el || !pane) return;

    const top    = el.offsetTop;
    const height = el.offsetHeight;
    const target = Math.max(0, top - pane.clientHeight / 2 + height / 2);

    if (!mountedRef.current) {
      snapHighlight(top, height);
      pane.scrollTop = target;
      mountedRef.current = true;
      return;
    }

    // In summary mode with a layout animation in progress, Effect 2 owns scroll
    if (currentModeRef.current === 'summary' && rafRef.current !== null) return;

    scrollAnim.current?.stop();
    scrollAnim.current = animate(pane.scrollTop, target, {
      ...SPRING,
      onUpdate: v => { pane.scrollTop = v; },
    });
    springHighlight(top, height);
  }, [activeIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Effect 2: layout-changing transitions in/around summary mode ──────────
  // Fires on mode or contextExpansion changes (NOT activeIndex).
  // Runs a rAF loop that directly drives both scrollTop and the highlight bar
  // so the active line stays pinned to centre while content collapses/expands.
  useEffect(() => {
    if (!mountedRef.current) return;

    const prev = prevModeRef.current;
    prevModeRef.current = mode;

    // Only needed when entering, within, or exiting summary mode
    if (mode !== 'summary' && prev !== 'summary') return;

    scrollAnim.current?.stop();
    highlightAnim.current?.stop();
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);

    const startTime = performance.now();
    // Mode transitions collapse many lines simultaneously — run longer.
    // Within-summary context changes collapse only a few — shorter is snappier
    // and must finish before the 360ms pending-move timer fires.
    const duration  = mode !== prev ? 640 : 350;

    const loop = () => {
      const el   = activeRef.current;
      const pane = paneRef.current;
      if (!el || !pane) { rafRef.current = null; return; }

      const top    = el.offsetTop;
      const height = el.offsetHeight;
      snapHighlight(top, height);
      pane.scrollTop = Math.max(0, top - pane.clientHeight / 2 + height / 2);

      if (performance.now() - startTime < duration) {
        rafRef.current = requestAnimationFrame(loop);
      } else {
        rafRef.current = null;
      }
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    };
  }, [mode, contextExpansion]); // activeIndex intentionally excluded

  // Cleanup on unmount
  useEffect(() => () => {
    scrollAnim.current?.stop();
    highlightAnim.current?.stop();
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
  }, []);

  const handleWheel = useCallback(() => {
    if (mode !== 'scroll') onScroll();
  }, [mode, onScroll]);

  const hasNotes = Object.keys(notes).some(k => lines[Number(k)]?.trim());

  return (
    <div ref={paneRef} className={styles.pane} onWheel={handleWheel}>
      <div className={styles.inner}>
        {/* Plain div — positioned imperatively, no Framer Motion spring conflict */}
        <div ref={highlightRef} className={styles.highlight} />

        {mode === 'summary' && !hasNotes && (
          <div className={styles.emptyNotes}>
            No notes yet — navigate to any line and press <kbd>Alt+N</kbd> to add one.
          </div>
        )}

        {lines.map((line, index) => {
          const isBlank  = line.trim().length === 0;
          const isActive = index === activeIndex;
          const isNoted  = !isBlank && String(index) in notes;

          let hidden    = false;
          let isContext = false;
          if (mode === 'summary') {
            if (isNoted) {
              hidden = false;
            } else if (visibleInSummary?.has(index)) {
              hidden    = false;
              isContext = true;
            } else {
              hidden = true;
            }
          }

          const showSepBefore = separators.before.has(index);
          const showSepAfter  = separators.after.has(index);

          return (
            <Fragment key={index}>
              <AnimatePresence>
                {showSepBefore && (
                  <motion.div
                    key="sep-before"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={COLLAPSE}
                    style={{ overflow: 'hidden' }}
                  >
                    <div className={styles.contextSeparator} />
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div
                animate={hidden
                  ? { height: 0, opacity: 0 }
                  : { height: 'auto', opacity: 1 }}
                initial={false}
                transition={COLLAPSE}
                style={{ overflow: 'hidden' }}
              >
                <LineRow
                  line={line}
                  isActive={isActive}
                  hasNote={isNoted}
                  isBlank={isBlank}
                  mode={mode}
                  isContext={isContext}
                  elementRef={isActive ? activeRef : undefined}
                  onClick={
                    isBlank                           ? undefined
                    : mode === 'summary' && isContext ? undefined
                    : () => onLineClick(index)
                  }
                />
                {isActive && (
                  <AnimatePresence>
                    {noteBubbleOpen && (
                      <NotesBubble
                        key="bubble"
                        draft={noteBubbleDraft}
                        onChange={onSetNoteDraft}
                        onSave={onSaveNote}
                        onClose={onCloseNote}
                      />
                    )}
                  </AnimatePresence>
                )}
              </motion.div>

              <AnimatePresence>
                {showSepAfter && (
                  <motion.div
                    key="sep-after"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={COLLAPSE}
                    style={{ overflow: 'hidden' }}
                  >
                    <div className={styles.contextSeparator} />
                  </motion.div>
                )}
              </AnimatePresence>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
