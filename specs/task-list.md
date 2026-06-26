---
type: spec
project: regression-reader
date: 2026-06-24
status: draft
tags: [tasks, implementation, claude-code]
---

Work through these tasks in order. Each task should be fully working before starting the next. Run the dev server after each task and verify the feature manually.

## Phase 1: Project Scaffold

- [ ] Initialize Vite + React + TypeScript project (`npm create vite@latest regression-reader -- --template react-ts`)
- [ ] Install dependencies: `react-router-dom`, `framer-motion`, `idb-keyval`
- [ ] Set up CSS custom properties for the dark liquid glass design system (colors, blur values, opacity levels, border styles, spacing scale)
- [ ] Create base `App.tsx` with React Router: routes for `/` (HomeScreen), `/session/:id` (ReaderView), `/session/:id/summary` (SummaryView)
- [ ] Add an unsupported-browser check on load: if `window.showOpenFilePicker` is undefined, show a clear message telling the user to open in Chrome or Edge

## Phase 2: File System & Data Layer

- [ ] Write a `fileSystem.ts` service using the File System Access API: `pickMdFile()`, `createNotesFile()`, `readNotesFile()`, `writeNotesFile()`
- [ ] Implement the `.notes.json` schema (sessionName, filePath, currentLineIndex, lastAccessed, notes map using true file line indices)
- [ ] Write a `parseLines(raw: string): string[]` utility that splits on `\r?\n` and trims trailing whitespace, but retains empty strings to preserve 1:1 line index alignment with the raw file
- [ ] Set up `idb-keyval` to store serialized `FileSystemFileHandle` and `FileSystemDirectoryHandle` objects securely across app sessions
- [ ] Write a `SessionStore` context that saves running state instantly to IndexedDB and provides `createSession`, `updateSession`, and a manual disk flush method that writes to the physical `.notes.json`

## Phase 3: Home Screen

- [ ] Build `HomeScreen` component: list of `SessionCard` components sorted by `lastAccessed` descending
- [ ] Build `SessionCard`: shows session name, last accessed date, click to open reader
- [ ] Add inline rename on `SessionCard` (click the name to edit, Enter to confirm; suspend all outer navigation shortcuts while the field is focused)
- [ ] Build `NewSessionModal`: name input + file picker trigger; on confirm, create session, save handles to IndexedDB, and navigate to reader
- [ ] Style everything in dark liquid glass: frosted panels, blurred backgrounds, subtle borders

## Phase 4: Reader — Core

- [ ] Build `ReaderView` layout: `TopBar` + `DocumentPane` + global `KeyboardHandler`
- [ ] Build `DocumentPane`: renders all parsed lines as `LineRow` components; blank lines are rendered as structural spacers (empty, non-interactive rows)
- [ ] Build `LineRow`: receives `isActive` and `hasNote` props; active line is full opacity with a subtle background highlight; inactive lines are at 20% opacity; lines with notes show a small amber dot in the left margin
- [ ] Implement arrow key navigation in `KeyboardHandler`: up/down move `activeIndex`, automatically skipping indexes where `lines[index].trim().length === 0`; document scrolls to keep active line centered (`scrollIntoView` with `block: 'center'`)
- [ ] Suspend all global keyboard navigation events when document focus is inside any `<textarea>` or `<input>` element
- [ ] Save `currentLineIndex` and active session state to IndexedDB instantly on movement; establish a 5000ms idle debounce to automatically flush state to the physical `.notes.json`
- [ ] On session open, restore `activeIndex` from IndexedDB

## Phase 5: Reader — Notes

- [ ] Build `NotesBubble`: a Framer Motion animated panel appearing below the active `LineRow`; contains a textarea
- [ ] Wire **Alt+N**: if bubble is closed, open it (pre-filled if a note exists for this line) and focus the textarea; if bubble is open, save the text to IndexedDB and close the bubble, returning focus to document navigation
- [ ] Wire **Escape** inside `NotesBubble` to discard unsaved changes and close the bubble
- [ ] On save: if note text is non-empty, write it to the `notes` map in IndexedDB; if note text is empty, delete that key from the `notes` map entirely. Update `hasNote` on the `LineRow` accordingly.
- [ ] Animate bubble: use a responsive spring animation on open (expands naturally, settles quickly, minimal bounce); smooth reverse on close

## Phase 6: Reader — Navigation Modes & Manual Save

- [ ] Build `TopBar`: shows session name, three mode indicator buttons (Arrow, Jump, Scroll), a manual **Save** button (disk icon), and a Summary button
- [ ] Wire the Save button to immediately flush current IndexedDB state to the physical `.notes.json` file; show a brief visual success confirmation
- [ ] Implement **note jump mode**: Tab key (and top bar button) toggles mode; in jump mode, up/down skip exclusively to non-blank line indexes that have a note in the `notes` map
- [ ] Implement **scroll mode**: enter automatically on mouse wheel event — set all lines to full opacity, lock `activeIndex` in place, and intercept/ignore arrow key events. Exit only when the user clicks a `LineRow`, which sets that line as `activeIndex` and returns to Arrow Key mode.
- [ ] Style top bar mode buttons: active mode has a glass highlight; switching has a quick, precise sliding transition

## Phase 7: Notes Summary View

- [ ] Build `SummaryView`: navigated to from the TopBar Summary button
- [ ] Render one `NoteEntry` per entry in the `notes` map, sorted sequentially by line index
- [ ] Build `NoteEntry`: emphasized line text on top (read-only — the markdown document is never editable), editable textarea for the note directly below; changes save to IndexedDB on blur or Alt+N. If note is cleared to empty, delete that key from the `notes` map. Suspend global arrow navigation while the textarea is focused.
- [ ] Implement up/down arrow navigation between `NoteEntry` blocks (only when not editing text)
- [ ] Implement **Space** to expand context: each press reveals additional lines above and below the flagged line pulled from the true indexed line array (start with 2 lines each side, add 2 per press); animate with a smooth push — surrounding lines appear to make room for the expanded content
- [ ] The flagged line stays visually emphasized (full opacity, highlight) even when context is expanded
- [ ] Implement **Escape** to collapse context back; animate the reverse

## Phase 8: Polish & Edge Cases

- [ ] Add a loading state for when the `.md` file is being read
- [ ] Handle missing/moved files: show a graceful error panel with a "Re-link File" option that re-prompts the file picker and updates the IndexedDB handle
- [ ] Add a delete session option on the home screen with a confirmation modal
- [ ] Verify correct parsing against Windows-style line endings (`\r\n`)
- [ ] Verify the full keyboard map: no conflicts, all shortcuts behave as specified, all navigation suspends correctly when inputs are focused
- [ ] Final visual pass: confirm liquid glass panels are consistent, spring transitions feel smooth and settled, nothing drags or snaps jarringly
