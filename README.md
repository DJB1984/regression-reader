# Regression Reader

A focused markdown reader built for running regression test suites. Instead of losing your place in a wall of text every time you switch monitors, Regression Reader shows you one line at a time — everything else fades back. Annotate failures as you go and review them all at the end.

> Built to solve a real problem from my UI developer internship at Tektonux.

## Features

- **Line-by-line navigation** — arrow keys move through every non-blank line, one at a time. The active line is full brightness; everything else fades.
- **Note bubbles** — press `N` on any line to drop a note. Noted lines get a small amber dot. Empty notes auto-delete.
- **Four navigation modes** — cycle with `←` / `→`
  - Arrow mode (default): move line by line
  - Jump mode (`Tab`): skip between only the lines you flagged
  - Scroll mode: free scroll with full opacity; click a line to re-engage
  - Summary mode: collapses everything except your noted lines in-place. Press `Space` to expand context around any entry.
- **Persistent sessions** — sessions are saved locally. Come back the next day and you're right where you left off.
- **Session library** — home screen lists all past sessions sorted by most recent. Rename them, delete them, or open any past run.
- **Dark liquid glass UI** — minimal, easy on the eyes, smooth spring animations.
- **OneDrive-friendly** — writes are buffered through IndexedDB before flushing to disk, preventing file-locking conflicts with sync services.

---

## Tech Stack

- React 18 + TypeScript
- Vite
- Framer Motion
- React Router v6
- File System Access API + idb-keyval

> Requires Chrome or Edge (File System Access API not supported in Safari/Firefox).

---

## Getting Started

```bash
git clone https://github.com/your-username/regression-reader.git
cd regression-reader
npm install
npm run dev
```

Open `http://localhost:5173` in Chrome or Edge.

On first use, click **New Session**, pick a `.md` file from your machine, name the session, and start reading.

---

## How It Works

Your `.md` file stays on your machine — the app never uploads it anywhere. A companion `.notes.json` file is created in the same folder to store your notes and session position. Both files can live in OneDrive, Dropbox, or anywhere else you sync files.

---

## Why I Built This

I was doing regression testing at my internship and kept losing my place. The test document was hundreds of lines long — headers, sub-headers, nested lists — and every time I switched monitors to actually run a test, I'd come back and have no idea where I was. I needed something that would lock me to one line at a time and let me mark failures without breaking my flow. So I built it.
