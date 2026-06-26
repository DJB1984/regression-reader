/**
 * Splits raw file text into a line array preserving blank lines as empty strings.
 * Maintains exact 1:1 index alignment with the source file's line numbers.
 * Navigation code skips indexes where lines[i].trim().length === 0.
 */
export function parseLines(raw: string): string[] {
  return raw.split(/\r?\n/).map(line => line.trimEnd());
}
