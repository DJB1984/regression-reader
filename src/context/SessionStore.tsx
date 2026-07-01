import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import type { SessionData } from '../types';
import {
  getAllSessions,
  removeSession,
  saveHandles,
  saveSession,
  getHandles,
  getSession,
} from '../lib/db';
import { writeNotesFile } from '../lib/fileSystem';

type SessionContextValue = {
  sessions: SessionData[];
  createSession: (
    name: string,
    mdHandle: FileSystemFileHandle,
    notesHandle: FileSystemFileHandle,
  ) => Promise<string>;
  updateSession: (
    id: string,
    patch: Partial<Omit<SessionData, 'id'>>,
  ) => void;
  deleteSession: (id: string) => Promise<void>;
  flushToDisk: (id: string) => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionStore({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<SessionData[]>([]);

  useEffect(() => {
    getAllSessions().then(setSessions);
  }, []);

  const createSession = useCallback(
    async (
      name: string,
      mdHandle: FileSystemFileHandle,
      notesHandle: FileSystemFileHandle,
    ): Promise<string> => {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      const session: SessionData = {
        id,
        sessionName: name,
        filePath: mdHandle.name,
        currentLineIndex: 0,
        lastAccessed: now,
        notes: {},
        crossedLines: [],
        bugs: {},
      };

      await Promise.all([
        saveSession(session),
        saveHandles(id, { mdHandle, notesHandle }),
        writeNotesFile(notesHandle, {
          sessionName: session.sessionName,
          filePath: session.filePath,
          currentLineIndex: session.currentLineIndex,
          lastAccessed: session.lastAccessed,
          notes: session.notes,
          crossedLines: session.crossedLines,
          bugs: session.bugs,
        }),
      ]);

      setSessions(prev => [session, ...prev]);
      return id;
    },
    [],
  );

  const updateSession = useCallback(
    (id: string, patch: Partial<Omit<SessionData, 'id'>>) => {
      setSessions(prev => {
        const idx = prev.findIndex(s => s.id === id);
        if (idx === -1) return prev;

        const updated: SessionData = {
          ...prev[idx],
          ...patch,
          lastAccessed: new Date().toISOString(),
        };

        saveSession(updated).catch(console.error);

        const next = [...prev];
        next[idx] = updated;
        next.sort(
          (a, b) =>
            new Date(b.lastAccessed).getTime() -
            new Date(a.lastAccessed).getTime(),
        );
        return next;
      });
    },
    [],
  );

  const deleteSession = useCallback(async (id: string) => {
    await removeSession(id);
    setSessions(prev => prev.filter(s => s.id !== id));
  }, []);

  const flushToDisk = useCallback(async (id: string) => {
    const [session, handles] = await Promise.all([
      getSession(id),
      getHandles(id),
    ]);
    if (!session || !handles) return;

    await writeNotesFile(handles.notesHandle, {
      sessionName: session.sessionName,
      filePath: session.filePath,
      currentLineIndex: session.currentLineIndex,
      lastAccessed: session.lastAccessed,
      notes: session.notes,
      crossedLines: session.crossedLines ?? [],
      bugs: session.bugs ?? {},
    });
  }, []);

  return (
    <SessionContext.Provider
      value={{ sessions, createSession, updateSession, deleteSession, flushToDisk }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSessionStore(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSessionStore must be used inside SessionStore');
  return ctx;
}
