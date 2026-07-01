import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Mode } from '../types';
import { useSessionStore } from '../context/SessionStore';
import { getHandles, getSession, saveHandles } from '../lib/db';
import { pickMdFile, readMdFile, requestHandlePermission } from '../lib/fileSystem';
import { parseLines } from '../lib/parseLines';
import { useGlobalKeys } from '../hooks/useGlobalKeys';
import TopBar from '../components/TopBar';
import DocumentPane from '../components/DocumentPane';
import KeyboardHandler from '../components/KeyboardHandler';
import styles from './ReaderView.module.css';

// ─── State ──────────────────────────────────────────────────────────────────

type ReaderState = {
  lines: string[];
  activeIndex: number;
  notes: Record<string, string>;
  crossedLines: string[];
  mode: Mode;
  noteBubbleOpen: boolean;
  noteBubbleDraft: string;
  contextExpansion: Record<string, number>;
};

type ReaderAction =
  | { type: 'INIT'; lines: string[]; activeIndex: number; notes: Record<string, string>; crossedLines: string[] }
  | { type: 'MOVE'; direction: 'prev' | 'next' }
  | { type: 'SET_MODE'; mode: Mode }
  | { type: 'CLICK_LINE'; index: number }
  | { type: 'OPEN_NOTE_BUBBLE' }
  | { type: 'CLOSE_NOTE_BUBBLE' }
  | { type: 'SET_NOTE_DRAFT'; text: string }
  | { type: 'SAVE_NOTE' }
  | { type: 'TOGGLE_CROSSED' }
  | { type: 'EXPAND_CONTEXT' }
  | { type: 'SUMMARY_ESCAPE' }
  | { type: 'SUMMARY_COLLAPSE_CURRENT' };

const initialState: ReaderState = {
  lines: [],
  activeIndex: 0,
  notes: {},
  crossedLines: [],
  mode: 'arrow',
  noteBubbleOpen: false,
  noteBubbleDraft: '',
  contextExpansion: {},
};

function nextNonBlank(lines: string[], from: number, step: number): number {
  let i = from + step;
  while (i >= 0 && i < lines.length) {
    if (lines[i].trim().length > 0) return i;
    i += step;
  }
  return from;
}

function notedLines(state: ReaderState): number[] {
  return Object.keys(state.notes)
    .map(Number)
    .filter(i => state.lines[i]?.trim().length > 0)
    .sort((a, b) => a - b);
}

function readerReducer(state: ReaderState, action: ReaderAction): ReaderState {
  switch (action.type) {
    case 'INIT':
      return {
        ...state,
        lines: action.lines,
        activeIndex: action.activeIndex,
        notes: action.notes,
        crossedLines: action.crossedLines,
      };

    case 'MOVE': {
      if (state.mode === 'scroll') return state;
      if (state.mode === 'jump' || state.mode === 'summary') {
        const noted = notedLines(state);
        const cur   = noted.indexOf(state.activeIndex);
        const next  =
          action.direction === 'next'
            ? (noted[cur + 1] ?? state.activeIndex)
            : (noted[cur - 1] ?? state.activeIndex);
        if (next === state.activeIndex) return state;
        return { ...state, activeIndex: next };
      }
      const step = action.direction === 'next' ? 1 : -1;
      return { ...state, activeIndex: nextNonBlank(state.lines, state.activeIndex, step) };
    }

    case 'SET_MODE': {
      // Always reset context expansion on mode change
      const contextExpansion: Record<string, number> = {};
      if (action.mode === 'jump' || action.mode === 'summary') {
        const noted = notedLines(state);
        if (noted.length > 0 && !noted.includes(state.activeIndex)) {
          const closest = noted.reduce((best, idx) =>
            Math.abs(idx - state.activeIndex) < Math.abs(best - state.activeIndex) ? idx : best
          );
          return { ...state, mode: action.mode, activeIndex: closest, contextExpansion };
        }
      }
      return { ...state, mode: action.mode, contextExpansion };
    }

    case 'CLICK_LINE':
      if (state.mode === 'scroll' && state.lines[action.index]?.trim().length > 0) {
        return { ...state, activeIndex: action.index, mode: 'arrow' };
      }
      if (
        state.mode === 'summary' &&
        String(action.index) in state.notes &&
        state.lines[action.index]?.trim().length > 0
      ) {
        return { ...state, activeIndex: action.index };
      }
      return state;

    case 'OPEN_NOTE_BUBBLE':
      return {
        ...state,
        noteBubbleOpen: true,
        noteBubbleDraft: state.notes[String(state.activeIndex)] ?? '',
      };

    case 'CLOSE_NOTE_BUBBLE':
      return { ...state, noteBubbleOpen: false, noteBubbleDraft: '' };

    case 'SET_NOTE_DRAFT':
      return { ...state, noteBubbleDraft: action.text };

    case 'SAVE_NOTE': {
      const text = state.noteBubbleDraft.trim();
      const notes = { ...state.notes };
      if (text) {
        notes[String(state.activeIndex)] = text;
      } else {
        delete notes[String(state.activeIndex)];
      }
      return { ...state, notes, noteBubbleOpen: false, noteBubbleDraft: '' };
    }

    case 'TOGGLE_CROSSED': {
      if (state.lines[state.activeIndex]?.trim().length === 0) return state;
      const key = String(state.activeIndex);
      const already = state.crossedLines.includes(key);
      return {
        ...state,
        crossedLines: already
          ? state.crossedLines.filter(k => k !== key)
          : [...state.crossedLines, key],
      };
    }

    case 'EXPAND_CONTEXT': {
      if (state.mode !== 'summary') return state;
      const key = String(state.activeIndex);
      return {
        ...state,
        contextExpansion: {
          ...state.contextExpansion,
          [key]: (state.contextExpansion[key] ?? 0) + 2,
        },
      };
    }

    case 'SUMMARY_ESCAPE': {
      const key = String(state.activeIndex);
      if ((state.contextExpansion[key] ?? 0) > 0) {
        // Delete the key entirely — setting to 0 would leave the key in the object,
        // causing a subsequent MOVE to create a new contextExpansion ref and trigger Effect 2
        const contextExpansion = { ...state.contextExpansion };
        delete contextExpansion[key];
        return { ...state, contextExpansion };
      }
      return { ...state, mode: 'arrow', contextExpansion: {} };
    }

    case 'SUMMARY_COLLAPSE_CURRENT': {
      if (state.mode !== 'summary') return state;
      const key = String(state.activeIndex);
      if (!(key in state.contextExpansion)) return state;
      const contextExpansion = { ...state.contextExpansion };
      delete contextExpansion[key];
      return { ...state, contextExpansion };
    }
  }
}

// ─── Load State ──────────────────────────────────────────────────────────────

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string; canRelink: boolean }
  | { status: 'ready' };

// ─── Component ──────────────────────────────────────────────────────────────

export default function ReaderView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { updateSession, flushToDisk } = useSessionStore();
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });
  const [sessionName, setSessionName] = useState('');
  const [loadTrigger, setLoadTrigger] = useState(0);
  const [globalKeysEnabled, setGlobalKeysEnabled] = useState(false);
  const [state, dispatch] = useReducer(readerReducer, initialState);
  const debounceRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Mutable mirrors so stable callbacks can read latest state without deps
  const modeRef             = useRef(state.mode);
  const activeIndexRef      = useRef(state.activeIndex);
  const contextExpansionRef = useRef(state.contextExpansion);
  modeRef.current             = state.mode;
  activeIndexRef.current      = state.activeIndex;
  contextExpansionRef.current = state.contextExpansion;

  // Load file + restore state on mount (re-runs when loadTrigger increments after re-link)
  useEffect(() => {
    if (!id) return;
    setLoadState({ status: 'loading' });
    async function load() {
      const [session, handles] = await Promise.all([getSession(id!), getHandles(id!)]);
      if (!session || !handles) {
        setLoadState({ status: 'error', message: 'Session not found.', canRelink: false });
        return;
      }
      const granted = await requestHandlePermission(handles.mdHandle);
      if (!granted) {
        setLoadState({ status: 'error', message: 'File permission denied.', canRelink: true });
        return;
      }
      let raw: string;
      try {
        raw = await readMdFile(handles.mdHandle);
      } catch {
        setLoadState({ status: 'error', message: 'Could not read file — it may have been moved or deleted.', canRelink: true });
        return;
      }
      const lines = parseLines(raw);

      const firstNonBlank = lines.findIndex(l => l.trim().length > 0);
      const safeIndex =
        session.currentLineIndex < lines.length &&
        lines[session.currentLineIndex].trim().length > 0
          ? session.currentLineIndex
          : Math.max(0, firstNonBlank);

      setSessionName(session.sessionName);
      dispatch({ type: 'INIT', lines, activeIndex: safeIndex, notes: session.notes, crossedLines: session.crossedLines ?? [] });
      setLoadState({ status: 'ready' });
    }
    load().catch(() => setLoadState({ status: 'error', message: 'Failed to load file.', canRelink: true }));
  }, [id, loadTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist to IndexedDB instantly; debounce disk flush
  useEffect(() => {
    if (loadState.status !== 'ready' || !id) return;
    updateSession(id, { currentLineIndex: state.activeIndex, notes: state.notes, crossedLines: state.crossedLines });
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { flushToDisk(id); }, 5000);
  }, [state.activeIndex, state.notes, id, loadState.status, updateSession, flushToDisk]);

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
      if (id) flushToDisk(id);
    };
  }, [id, flushToDisk]);

  const onMoveUp = useCallback(() => {
    if (modeRef.current === 'summary') {
      const key = String(activeIndexRef.current);
      if (key in contextExpansionRef.current) {
        // Collapse context first, navigate after animation settles
        if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
        dispatch({ type: 'SUMMARY_COLLAPSE_CURRENT' });
        pendingTimerRef.current = setTimeout(() => {
          dispatch({ type: 'MOVE', direction: 'prev' });
          pendingTimerRef.current = null;
        }, 360); // 10ms after Effect 2's 350ms rAF loop ends
        return;
      }
    }
    dispatch({ type: 'MOVE', direction: 'prev' });
  }, []);

  const onMoveDown = useCallback(() => {
    if (modeRef.current === 'summary') {
      const key = String(activeIndexRef.current);
      if (key in contextExpansionRef.current) {
        if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
        dispatch({ type: 'SUMMARY_COLLAPSE_CURRENT' });
        pendingTimerRef.current = setTimeout(() => {
          dispatch({ type: 'MOVE', direction: 'next' });
          pendingTimerRef.current = null;
        }, 360);
        return;
      }
    }
    dispatch({ type: 'MOVE', direction: 'next' });
  }, []);
  const onToggleJump   = useCallback(() =>
    dispatch({ type: 'SET_MODE', mode: state.mode === 'jump' ? 'arrow' : 'jump' }),
    [state.mode]);
  const onEnterScroll  = useCallback(() => dispatch({ type: 'SET_MODE', mode: 'scroll' }), []);
  const onExitScroll   = useCallback(() => dispatch({ type: 'SET_MODE', mode: 'arrow' }), []);
  const onLineClick    = useCallback((i: number) => dispatch({ type: 'CLICK_LINE', index: i }), []);
  const onSave         = useCallback(() => { if (id) flushToDisk(id); }, [id, flushToDisk]);
  const onOpenNote     = useCallback(() => dispatch({ type: 'OPEN_NOTE_BUBBLE' }), []);
  const onCloseNote    = useCallback(() => dispatch({ type: 'CLOSE_NOTE_BUBBLE' }), []);
  const onSaveNote     = useCallback(() => dispatch({ type: 'SAVE_NOTE' }), []);
  const onSetNoteDraft = useCallback((text: string) => dispatch({ type: 'SET_NOTE_DRAFT', text }), []);
  const onExpandContext   = useCallback(() => dispatch({ type: 'EXPAND_CONTEXT' }), []);
  const onSummaryEscape   = useCallback(() => dispatch({ type: 'SUMMARY_ESCAPE' }), []);
  const onToggleCrossed   = useCallback(() => dispatch({ type: 'TOGGLE_CROSSED' }), []);

  const MODE_CYCLE: Mode[] = ['scroll', 'arrow', 'jump', 'summary'];
  const onCycleMode = useCallback((direction: 'prev' | 'next') => {
    const cur  = MODE_CYCLE.indexOf(modeRef.current);
    const next = direction === 'next'
      ? MODE_CYCLE[(cur + 1) % MODE_CYCLE.length]
      : MODE_CYCLE[(cur - 1 + MODE_CYCLE.length) % MODE_CYCLE.length];
    dispatch({ type: 'SET_MODE', mode: next });
  }, []); // stable — reads mode via modeRef

  useGlobalKeys(globalKeysEnabled, { onMoveUp, onMoveDown, onToggleCrossed, onCycleMode });

  const handleRelink = useCallback(async () => {
    if (!id) return;
    try {
      const mdHandle = await pickMdFile();
      const handles = await getHandles(id);
      if (handles) await saveHandles(id, { ...handles, mdHandle });
      setLoadTrigger(k => k + 1);
    } catch {
      // user cancelled the picker
    }
  }, [id]);

  if (loadState.status === 'loading') {
    return <div className={styles.status}>Loading…</div>;
  }
  if (loadState.status === 'error') {
    return (
      <div className={styles.status}>
        <p>{loadState.message}</p>
        <div className={styles.errorActions}>
          {loadState.canRelink && (
            <button className={styles.relinkBtn} onClick={handleRelink}>
              Re-link File
            </button>
          )}
          <button className={styles.backBtn} onClick={() => navigate('/')}>
            Back to home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <TopBar
        sessionName={sessionName}
        mode={state.mode}
        onModeChange={mode => dispatch({ type: 'SET_MODE', mode })}
        onSave={onSave}
        onBack={() => navigate('/')}
        globalKeysEnabled={globalKeysEnabled}
        onGlobalKeysToggle={() => setGlobalKeysEnabled(v => !v)}
      />
      <DocumentPane
        lines={state.lines}
        activeIndex={state.activeIndex}
        notes={state.notes}
        crossedLines={state.crossedLines}
        mode={state.mode}
        noteBubbleOpen={state.noteBubbleOpen}
        noteBubbleDraft={state.noteBubbleDraft}
        contextExpansion={state.contextExpansion}
        onLineClick={onLineClick}
        onScroll={onEnterScroll}
        onSaveNote={onSaveNote}
        onCloseNote={onCloseNote}
        onSetNoteDraft={onSetNoteDraft}
      />
      <AnimatePresence>
        {state.mode === 'scroll' && (
          <motion.div
            className={styles.scrollHint}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
          >
            Scroll mode &nbsp;·&nbsp; click any line to focus &nbsp;·&nbsp; <kbd>Esc</kbd> to exit
          </motion.div>
        )}
      </AnimatePresence>
      <KeyboardHandler
        mode={state.mode}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onToggleJump={onToggleJump}
        onOpenNote={onOpenNote}
        onToggleCrossed={onToggleCrossed}
        onExitScroll={onExitScroll}
        onExpandContext={onExpandContext}
        onSummaryEscape={onSummaryEscape}
        onCycleMode={onCycleMode}
      />
    </div>
  );
}
