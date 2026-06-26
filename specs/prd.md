---
type: spec
project: regression-reader
date: 2026-06-24
status: draft
tags: [prd, requirements, regression-testing]
---

## Problem

Regression testing at [[Tektonux]] involves reading a large `.md` document — sections, sub-sections, nested lists, prose. After switching to another monitor to perform a test, it's easy to lose your place, forget the exact instruction, or lose track of which lines passed and which failed. The document becomes visually overwhelming and hard to navigate under task-switching pressure.

## Goal

A focused, line-by-line `.md` reader with persistent notes. The tool slows the document down, keeps the reader oriented, and captures failures so they can be reviewed after the full run.

## User

[[Davis Brooks]], UI developer intern at [[Tektonux]]. Uses it once per release cycle (roughly monthly) to run regression tests. Works on a multi-monitor setup; needs to frequently switch between the test doc and the product being tested.

## Core Requirements

### Home Screen

- Displays all past sessions, sorted by most recently accessed
- Each session shows its name and can be renamed at any time
- Session name defaults to the filename on creation
- "New Session" button: user picks a `.md` file, names the session, and enters the reader
- App remembers the last-used file and folder handles using IndexedDB (via File System Access API) so the user doesn't re-navigate or re-prompt every time

### Reader

- Renders the full document in a normal scrollable layout, retaining blank lines to preserve exact 1:1 line index mapping with the raw file
- The active line is displayed at full brightness; all other lines are faded (approx. 20-30% opacity)
- Arrow keys (up/down) move through lines, automatically skipping over blank lines
- All non-blank line types are treated equally: headers, sub-headers, list items, prose
- The document scrolls to keep the active line centered as the user navigates
- Navigation should remain responsive even while notes are being saved in the background.
- Current line position is saved instantly to local state (IndexedDB) and periodically flushed to the `.notes.json` file during idle periods (5-second debounce)

### Notes

- Global navigation shortcuts are explicitly suspended/ignored whenever focus is inside any text input or textarea
- Pressing **Alt+N** toggles a text bubble directly below the active line
- Pressing **Alt+N** inside an open note bubble saves the note, closes the bubble, and returns focus to reader navigation
- The note is written immediately to the local IndexedDB state
- Lines with notes are marked with a small colored dot in the left margin
- Notes are editable: opening the bubble on a line that already has a note pre-fills it
- Saving an empty note deletes the note entirely from the session memory rather than storing an empty string

### Navigation Modes

Three modes, switchable without leaving the reader:

1. **Arrow key mode** (default): up/down arrows move line by line through the document's non-blank lines
2. **Note jump mode**: toggled with **Tab** or a top bar button; up/down arrows skip between noted lines only
3. **Scroll mode**: entered automatically when the user scrolls with the mouse wheel. While in scroll mode, all lines return to full opacity and the document behaves like a normal scrollable document. The active line does not change, and arrow key presses are ignored (no viewport snapping). Scroll mode remains active until the user clicks a specific line. Clicking a line sets that line as the active line and returns the reader to Arrow Key mode.

### Notes Summary View

Accessed via a top bar button. Shows a list of every noted line:

- The flagged line is displayed emphasized at the top of each entry
- The note is shown directly below it, editable inline
- The original markdown document is always read-only. Only notes are editable.
- Up/down arrow keys move between entries (ignored when editing text)
- **Space** expands context around the current entry (reveals lines above and below from the original document); each additional Space press expands further
- **Escape** collapses the context back
- The flagged line remains emphasized even when context is expanded

## Persistence

Each session syncs to a companion `.notes.json` file located in the user's local folder (e.g., within OneDrive):

- The original `.md` file is a read-only reference
- A companion `.notes.json` file is created by the app (same name, different extension)
- The `.notes.json` stores: session name, current line position, and a map of 1:1 line indices to note text
- Live edits save instantly to IndexedDB. Writes to the physical `.notes.json` file occur on an idle timeout (5 seconds) or when clicking the explicit **Save** button in the TopBar.

## Non-Goals

- No cloud sync architectural layer (handled upstream by OneDrive)
- No collaboration features
- No markdown rendering (lines are displayed as raw text, keeping formatting basic and robust)
- No mobile support

## Success Criteria

- Davis can navigate a test doc without losing his place under multi-monitor task-switching pressure
- He can toggle notes using a single shortcut (`Alt+N`) without breaking keyboard focus loops
- Hard disk writes are buffered to prevent OneDrive file-locking conflicts
