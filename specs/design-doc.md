---
type: spec
project: regression-reader
date: 2026-06-24
status: draft
tags: [design, architecture, react]
---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | React 18 + TypeScript | Matches Davis's existing skill set at [[Tektonux]] |
| Build tool | Vite | Fast local dev, minimal config |
| Styling | CSS Modules + custom properties | Full control over the glass aesthetic; no Tailwind constraint |
| Animation | Framer Motion | Spring physics for the expand/collapse and line transitions |
| File I/O | File System Access API + idb-keyval | Native local file interaction; stores file handles securely across sessions via IndexedDB |
| Routing | React Router v6 | Clear separate screens for Home, Reader, and Summary |
| State | React context + `useReducer` | Global memory engine backed by IndexedDB; no external server needed |

## Visual Design

**Aesthetic:** Dark liquid glass. Inspired by Apple's visionOS/iOS 26 glass treatment, adapted to dark mode.

Key CSS primitives:
- `backdrop-filter: blur(20px)` on panels and overlays
- `background: rgba(255,255,255,0.05)` for glass surfaces
- `border: 1px solid rgba(255,255,255,0.1)` for glass edges
- Dark base background: `#0a0a0f` or similar deep navy-black
- Active line highlight: `rgba(255,255,255,0.9)` text, subtle background glow
- Faded lines: `opacity: 0.2`
- Dot markers: amber (`#f59e0b`)

## Data Model

### `.notes.json` schema

```json
{
  "sessionName": "June Release",
  "filePath": "june-release.md",
  "currentLineIndex": 42,
  "lastAccessed": "2026-06-24T14:32:00Z",
  "notes": {
    "12": "Button does not respond on first click — needs second tap",
    "47": "Dropdown renders off-screen on 1280px viewport"
  }
}
```

- Keys in `notes` map to 0-based index positions within the full line array (including blank lines)
- Blank lines are stored as empty strings in the array to maintain 1:1 synchronization with the raw file's line numbers
- Saving an empty note deletes that key from the `notes` map entirely rather than storing an empty string
- Live session mutations update instantly to IndexedDB. Disk flushes to `.notes.json` execute automatically on a 5000ms idle timeout or immediately via the TopBar manual Save button.

## Component Architecture

```
App
├── Router
│   ├── HomeScreen          /
│   │   ├── SessionCard     (per session)
│   │   └── NewSessionModal
│   ├── ReaderView          /session/:id
│   │   ├── TopBar          (mode buttons, session name, manual save button)
│   │   ├── DocumentPane    (scrollable doc with line rendering)
│   │   │   ├── LineRow     (per line — handles active/faded state)
│   │   │   └── NotesBubble (appears below active line via Alt+N)
│   │   └── KeyboardHandler (global key listener; bypassed when inputs are focused)
│   └── SummaryView         /session/:id/summary
│       ├── TopBar
│       ├── NoteEntry       (per noted line — line + editable note + expandable context)
│       └── KeyboardHandler
```

## State Shape (ReaderView)

```typescript
type ReaderState = {
  lines: string[]                    // all lines including blank (empty string = blank)
  activeIndex: number                // current line (always points to a non-blank line)
  notes: Record<string, string>      // lineIndex -> note text
  mode: 'arrow' | 'jump' | 'scroll'
  noteBubbleOpen: boolean
  noteBubbleDraft: string
}
```

## File System & IndexedDB Flow

1. On first "New Session": `window.showOpenFilePicker()` → user picks `.md` file → app creates companion `.notes.json` via `showSaveFilePicker()` (same folder, same name, `.notes.json` extension)
2. Both `FileSystemFileHandle` objects are stored in IndexedDB via `idb-keyval`; no `localStorage` serialization of handles
3. On subsequent opens: handles are retrieved from IndexedDB and `requestPermission()` is called — browser will re-prompt only if permission lapsed
4. All in-session writes go to IndexedDB immediately; physical `.notes.json` writes are flushed on a 5-second idle debounce or when the user clicks the manual Save button
5. This two-layer approach prevents OneDrive file-locking conflicts from rapid successive writes

> [!warning] Browser Compatibility
> File System Access API requires Chrome or Edge. Safari and Firefox do not support it as of mid-2026. The app should display a clear unsupported-browser message on load if the API is absent.

## Parsing

Lines are parsed to maintain exact 1:1 line number alignment with the raw file:

```typescript
function parseLines(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map(line => line.trimEnd());
  // Blank lines are retained as empty strings.
  // The keyboard navigator skips indexes where lines[index].trim().length === 0
}
```

The markdown document is always read-only; only the companion `.notes.json` is ever written to.

## Scroll Mode Mechanics

Scroll mode triggers automatically on mouse wheel events:

- All lines animate smoothly to full opacity
- The `activeIndex` pointer remains locked in place
- Arrow key events are intercepted and ignored completely
- Focus inside any text input or textarea maintains priority regardless of mode
- The only exit condition is a user click on a specific `LineRow`, which sets it as the new `activeIndex` and returns to Arrow Key mode

## Keyboard Map

| Key | Context | Action |
|---|---|---|
| Arrow Down | Arrow key mode | Next non-blank line |
| Arrow Up | Arrow key mode | Previous non-blank line |
| Alt+N | Arrow key mode, bubble closed | Open note bubble on active line |
| Alt+N | Note bubble open | Save note and close bubble |
| Escape | Note bubble open | Discard changes and close bubble |
| Tab | Reader | Toggle note jump mode |
| Arrow Down | Note jump mode | Next noted line |
| Arrow Up | Note jump mode | Previous noted line |
| (any arrow) | Scroll mode | Ignored — no viewport snapping |
| Space | Summary view | Expand context (each press adds more lines) |
| Arrow Down | Summary view, not editing | Next note entry |
| Arrow Up | Summary view, not editing | Previous note entry |
| Escape | Summary view, context expanded | Collapse context |

> [!note] Keyboard Focus Rule
> All global navigation shortcuts (arrows, Tab, Alt+N) are suspended when document focus is inside any `<input>` or `<textarea>`. This prevents navigation interference while the user is typing a note.

## Animation Spec

All transitions use Framer Motion. Tune values to achieve the described feel rather than treating these as hard targets:

- **Line focus**: A fast, smooth fade that feels immediate without drawing attention.
- **Note bubble appear**: A responsive spring animation that expands naturally and settles quickly with little to no visible bounce.
- **Note bubble dismiss**: A smooth reverse transition that feels responsive and unobtrusive.
- **Context expand**: A smooth push animation that gives the impression of surrounding lines making room for the expanded content.
- **Context collapse**: The reverse of the expansion, returning smoothly to the compact view.
- **Mode switch**: A quick sliding transition that feels responsive and precise.
