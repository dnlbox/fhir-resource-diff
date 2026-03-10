import { readFileSync } from "node:fs";

/**
 * Reads a file synchronously and returns its contents as a string.
 * Exits with code 2 if the file cannot be read (not found, permissions, etc.).
 */
export function readFileOrExit(filePath: string): string {
  try {
    return readFileSync(filePath, "utf-8");
  } catch (e) {
    process.stderr.write(
      `Error: Cannot read file "${filePath}": ${e instanceof Error ? e.message : String(e)}\n`,
    );
    process.exit(2);
  }
}
