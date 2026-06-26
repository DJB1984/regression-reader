export type Mode = 'arrow' | 'jump' | 'scroll' | 'summary';

export type SessionData = {
  id: string;
  sessionName: string;
  filePath: string;
  currentLineIndex: number;
  lastAccessed: string;
  notes: Record<string, string>;
};

export type SessionHandles = {
  mdHandle: FileSystemFileHandle;
  notesHandle: FileSystemFileHandle;
};

/** Shape written to the physical .notes.json file (no internal id). */
export type NotesFileContent = Omit<SessionData, 'id'>;
