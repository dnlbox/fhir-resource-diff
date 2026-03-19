/**
 * The format of raw stdin content, detected before full JSON parsing.
 * - single: one JSON object
 * - array:  a JSON array of objects
 * - ndjson: Newline-Delimited JSON — multiple objects, one per line
 */
export type InputFormat = "single" | "array" | "ndjson";

/**
 * Detect the format of raw stdin content without full JSON parsing.
 *
 * Detection rules (applied in order):
 * 1. First non-whitespace character is `[` → array
 * 2. More than one line whose first non-whitespace character is `{` → ndjson
 * 3. Otherwise → single
 *
 * Intentionally cheap — full parsing happens downstream.
 */
export function detectInputFormat(raw: string): InputFormat {
  const trimmed = raw.trimStart();
  if (trimmed.startsWith("[")) return "array";

  const curlBraceLineCount = raw
    .split("\n")
    .filter((line) => line.trimStart().startsWith("{")).length;

  return curlBraceLineCount > 1 ? "ndjson" : "single";
}
