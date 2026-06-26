import type { NotesFileContent } from '../types';

export async function pickMdFile(): Promise<FileSystemFileHandle> {
  const [handle] = await window.showOpenFilePicker({
    types: [
      {
        description: 'Markdown file',
        accept: { 'text/markdown': ['.md'] },
      },
    ],
    multiple: false,
  });
  return handle;
}

export async function createNotesFile(
  suggestedName: string,
  startIn?: FileSystemFileHandle,
): Promise<FileSystemFileHandle> {
  return window.showSaveFilePicker({
    suggestedName,
    startIn,
    types: [
      {
        description: 'Notes file',
        accept: { 'application/json': ['.json'] },
      },
    ],
  });
}

export async function readMdFile(
  handle: FileSystemFileHandle,
): Promise<string> {
  const file = await handle.getFile();
  return file.text();
}

export async function readNotesFile(
  handle: FileSystemFileHandle,
): Promise<NotesFileContent | null> {
  try {
    const file = await handle.getFile();
    const text = await file.text();
    return JSON.parse(text) as NotesFileContent;
  } catch {
    return null;
  }
}

export async function writeNotesFile(
  handle: FileSystemFileHandle,
  data: NotesFileContent,
): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(JSON.stringify(data, null, 2));
  await writable.close();
}

export async function requestHandlePermission(
  handle: FileSystemFileHandle,
): Promise<boolean> {
  const status = await handle.queryPermission({ mode: 'readwrite' });
  if (status === 'granted') return true;
  const result = await handle.requestPermission({ mode: 'readwrite' });
  return result === 'granted';
}
