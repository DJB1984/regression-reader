import { createStore, get, set, del, entries } from 'idb-keyval';
import type { SessionData, SessionHandles } from '../types';

const sessionStore = createStore('rr-sessions-db', 'sessions');
const handleStore  = createStore('rr-handles-db',  'handles');

export async function getAllSessions(): Promise<SessionData[]> {
  const all = await entries<string, SessionData>(sessionStore);
  return all
    .map(([, v]) => v)
    .sort(
      (a, b) =>
        new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime(),
    );
}

export async function getSession(id: string): Promise<SessionData | undefined> {
  return get<SessionData>(id, sessionStore);
}

export async function saveSession(session: SessionData): Promise<void> {
  await set(session.id, session, sessionStore);
}

export async function removeSession(id: string): Promise<void> {
  await Promise.all([del(id, sessionStore), del(id, handleStore)]);
}

export async function getHandles(
  id: string,
): Promise<SessionHandles | undefined> {
  return get<SessionHandles>(id, handleStore);
}

export async function saveHandles(
  id: string,
  handles: SessionHandles,
): Promise<void> {
  await set(id, handles, handleStore);
}
