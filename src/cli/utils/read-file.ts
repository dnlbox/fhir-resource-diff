import { readFileSync } from "node:fs";
import { readStdinSync } from "@/cli/utils/read-stdin.js";

/**
 * Reads a file synchronously and returns its contents as a string.
 * Pass "-" to read from stdin.
 * Exits with code 2 if the file cannot be read (not found, permissions, etc.).
 */
export function readFileOrExit(filePath: string): string {
  if (filePath === "-") {
    try {
      return readStdinSync();
    } catch {
      process.stderr.write(
        "Error: no input on stdin. Pipe data to stdin or provide a file path.\nUsage: cat resource.json | fhir-resource-diff validate -\n",
      );
      process.exit(2);
    }
  }
  try {
    return readFileSync(filePath, "utf-8");
  } catch (e) {
    process.stderr.write(
      `Error: Cannot read file "${filePath}": ${e instanceof Error ? e.message : String(e)}\n`,
    );
    process.exit(2);
  }
}
