/** Type augmentations for the File System Access API (not yet in TS 6 DOM lib). */

interface FilePickerAcceptType {
  description?: string;
  accept: Record<string, string[]>;
}

interface ShowOpenFilePickerOptions {
  types?: FilePickerAcceptType[];
  multiple?: boolean;
  excludeAcceptAllOption?: boolean;
}

interface ShowSaveFilePickerOptions {
  suggestedName?: string;
  startIn?: FileSystemHandle | string;
  types?: FilePickerAcceptType[];
  excludeAcceptAllOption?: boolean;
}

interface FileSystemHandlePermissionDescriptor {
  mode?: 'read' | 'readwrite';
}

interface FileSystemFileHandle {
  queryPermission(
    descriptor?: FileSystemHandlePermissionDescriptor,
  ): Promise<PermissionState>;
  requestPermission(
    descriptor?: FileSystemHandlePermissionDescriptor,
  ): Promise<PermissionState>;
}

interface Window {
  showOpenFilePicker(
    options?: ShowOpenFilePickerOptions,
  ): Promise<FileSystemFileHandle[]>;
  showSaveFilePicker(
    options?: ShowSaveFilePickerOptions,
  ): Promise<FileSystemFileHandle>;
}
