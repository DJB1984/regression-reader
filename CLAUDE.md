# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

A focused markdown reader for running regression test suites. Line-by-line navigation, persistent notes, dark liquid glass aesthetic. Built with React + TypeScript + Vite. Runs locally in Chrome/Edge only.

---

## Commands

```bash
npm run dev      # start dev server at http://localhost:5173
npm run build    # tsc type-check + vite production build
npm run lint     # oxlint
```

---

## Project Structure

```
src/
├── App.tsx                    # Router: / and /session/:id
├── main.tsx
├── index.css                  # Global CSS custom properties (design tokens)
├── types.ts                   # Shared types: Mode, SessionData, SessionHandles, NotesFileContent
├── screens/
│   ├── HomeScreen.tsx / .module.css
│   └── ReaderView.tsx / .module.css   # All reader state lives here (useReducer)
├── components/
│   ├── DocumentPane.tsx / .module.css # Line rendering, highlight bar, animations
│   ├── KeyboardHandler.tsx            # Global keydown listener, no DOM output
│   ├── LineRow.tsx / .module.css
│   ├── NotesBubble.tsx / .module.css
│   ├── SessionCard.tsx / .module.css
│   └── TopBar.tsx / .module.css
├── context/
│   └── SessionStore.tsx       # Session CRUD, IndexedDB sync, disk flush
└── lib/
    ├── db.ts                  # idb-keyval wrappers (two separate stores)
    ├── fileSystem.ts          # File System Access API wrappers
    └── parseLines.ts          # Line parser
```

---

## Architecture

### Two-layer persistence
All in-session writes go to IndexedDB immediately via `idb-keyval`. The physical `.notes.json` on disk is only written on a 5-second idle debounce OR when the user clicks Save. Two separate idb stores: `rr-sessions-db/sessions` for session data, `rr-handles-db/handles` for file handles.

### Blank lines are retained
`parseLines()` splits on `\r?\n`, trims trailing whitespace, keeps empty strings. This maintains 1:1 line index alignment with the raw file so note keys in `.notes.json` match line numbers in any editor. Navigation skips indexes where `lines[i].trim().length === 0`.

### File handles stored in IndexedDB
`FileSystemFileHandle` objects can't be serialized to `localStorage`. They live in idb-keyval. On session open, `requestPermission()` is called on the stored handle — the browser re-prompts only if permission lapsed.

### Keyboard suspension
All global shortcuts are suppressed when focus is inside any `<textarea>` or `<input>`, checked via `document.activeElement` in `KeyboardHandler`. The note bubble intercepts `onWheel` to prevent triggering scroll mode while scrolling inside a note.

### Summary mode animation architecture
The highlight bar is a plain `div` driven imperatively (not a `motion.div`) to avoid spring conflicts with the rAF loop. Two effects in `DocumentPane`:
- **Effect 1** (`[activeIndex]`): spring-navigates the bar and scroll position. Defers to Effect 2 if rAF is running.
- **Effect 2** (`[mode, contextExpansion]`): runs a rAF loop (640ms for mode changes, 350ms for context-only changes) that snaps bar+scroll to the active line while layout animations settle.

When navigating away from an expanded context line, `SUMMARY_COLLAPSE_CURRENT` fires first, then `MOVE` fires 360ms later (after the rAF loop ends) so collapse and navigation are sequential, not simultaneous.

---

## Data Model

### `.notes.json` schema
```json
{
  "sessionName": "June Release",
  "filePath": "june-release.md",
  "currentLineIndex": 42,
  "lastAccessed": "2026-06-24T14:32:00Z",
  "notes": {
    "12": "Button does not respond on first click",
    "47": "Dropdown renders off-screen on 1280px viewport"
  }
}
```

Keys in `notes` are string 0-based line indices into the full `lines[]` array including blank lines. Saving an empty note deletes that key.

### ReaderState
```typescript
type ReaderState = {
  lines: string[];
  activeIndex: number;
  notes: Record<string, string>;
  mode: 'arrow' | 'jump' | 'scroll' | 'summary';
  noteBubbleOpen: boolean;
  noteBubbleDraft: string;
  contextExpansion: Record<string, number>; // noteLineIndex → lines expanded each side
};
```

---

## Keyboard Map

| Key | Context | Action |
|---|---|---|
| `↑` / `↓` | Arrow mode | Previous / next non-blank line |
| `←` / `→` | Any mode | Cycle modes: Scroll → Arrow → Jump → Summary |
| `Tab` | Arrow / Jump mode | Toggle between Arrow and Jump mode |
| `N` | Not typing | Open note bubble for active line |
| `Enter` | Note bubble | Save note and close bubble |
| `Shift+Enter` | Note bubble | Insert newline |
| `Esc` | Note bubble | Discard and close bubble |
| `↑` / `↓` | Jump mode | Previous / next noted line |
| `↑` / `↓` | Summary mode | Previous / next noted line |
| `Space` | Summary mode | Expand context (+2 lines each side per press) |
| `Esc` | Summary mode, context expanded | Collapse context |
| `Esc` | Summary mode, no context | Exit to Arrow mode |
| `←` / `→` | Scroll mode | Cycle modes (exit scroll) |

---

## Visual Design

Dark liquid glass. Key CSS tokens (defined in `index.css`):

```css
--glass-surface: rgba(255, 255, 255, 0.05);
--glass-border: rgba(255, 255, 255, 0.1);
--glass-blur: 20px;
--bg: #0a0a0f;
--text-primary: rgba(255, 255, 255, 0.9);
--text-faded: rgba(255, 255, 255, 0.2);
--note-dot: #f59e0b;
```

Framer Motion spring constants in `DocumentPane`:
- `SPRING` (navigation): `stiffness 500, damping 40, mass 0.5` — crisp, no bounce
- `COLLAPSE` (summary line collapse): `stiffness 280, damping 28, mass 0.5` — natural push

---

## Technical Gotchas

- The File System Access API requires a user gesture to open the picker. Don't call it on mount or in an async chain that's lost the gesture context.
- `idb-keyval` is the correct tool for storing file handles. `localStorage` serialization of handles does not work.
- Never put `contextExpansion` in the `MOVE` action — creating a new object reference triggers Effect 2's rAF loop, which snaps instead of springs. Context collapse is always a separate `SUMMARY_COLLAPSE_CURRENT` dispatch.
- The `currentModeRef` / `modeRef` / `activeIndexRef` / `contextExpansionRef` pattern in `ReaderView` lets stable `useCallback`s read current state without stale closures or re-creation on every render.
