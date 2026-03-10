import { readFileSync } from "node:fs";

/**
 * Reads all of stdin synchronously and returns it as a UTF-8 string.
 * Throws if stdin is a TTY (no piped input).
 */
export function readStdinSync(): string {
  if (process.stdin.isTTY) {
    throw new Error("No input on stdin (stdin is a TTY)");
  }
  try {
    return readFileSync(0, "utf-8");
  } catch {
    return readFileSync("/dev/stdin", "utf-8");
  }
}
