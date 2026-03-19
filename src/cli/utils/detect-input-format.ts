/**
 * The format of raw stdin content, detected before full JSON parsing.
 * - single: one JSON object
 * - array:  a JSON array of objects
 * - ndjson: Newline-Delimited JSON — multiple objects, one per line
 */
export type InputFormat = "single" | "array" | "ndjson";

/**
 * Detect the format of raw stdin content.
 *
 * Detection rules (applied in order):
 * 1. Try JSON.parse on the full trimmed buffer:
 *    - Parsed value is an array → "array"
 *    - Parsed value is an object → "single"
 * 2. Full parse failed → "ndjson" (line-by-line parsing attempted downstream)
 *
 * Using full JSON.parse ensures pretty-printed single objects are correctly
 * distinguished from NDJSON — the heuristic of counting `{`-starting lines
 * misclassifies pretty-printed objects with nested object values.
 */
export function detectInputFormat(raw: string): InputFormat {
  const trimmed = raw.trim();
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return "array";
    if (typeof parsed === "object" && parsed !== null) return "single";
  } catch {
    // Not valid complete JSON — treat as NDJSON
  }
  return "ndjson";
}
