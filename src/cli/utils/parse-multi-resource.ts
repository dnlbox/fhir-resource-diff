import type { FhirResource } from "@/core/types.js";
import { parseJson, isFhirResource } from "@/core/parse.js";
import { detectInputFormat, type InputFormat } from "@/cli/utils/detect-input-format.js";

export type { InputFormat };

export type ParseMultiResult =
  | { success: true; resources: FhirResource[]; format: InputFormat }
  | { success: false; error: string; format: InputFormat };

/**
 * Parse raw stdin content into an array of FHIR resource objects.
 * Auto-detects the format (single object, JSON array, or NDJSON).
 *
 * Non-object elements are skipped with a warning to stderr.
 * Returns `{ success: false }` only when the outer structure is unparseable.
 */
export function parseMultiResource(raw: string): ParseMultiResult {
  const format = detectInputFormat(raw);

  if (format === "single") {
    const result = parseJson(raw);
    if (!result.success) {
      return { success: false, error: result.error, format };
    }
    return { success: true, resources: [result.resource], format };
  }

  if (format === "array") {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch (e) {
      const message = e instanceof SyntaxError ? e.message : "Invalid JSON";
      return { success: false, error: message, format };
    }
    if (!Array.isArray(parsed)) {
      return { success: false, error: "Expected a JSON array", format };
    }

    const resources: FhirResource[] = [];
    for (const item of parsed as unknown[]) {
      if (isFhirResource(item)) {
        resources.push(item);
      } else if (typeof item !== "object" || item === null) {
        process.stderr.write("Warning: skipping non-object element in array\n");
      } else {
        process.stderr.write(
          "Warning: skipping array element with missing or invalid resourceType\n",
        );
      }
    }
    return { success: true, resources, format };
  }

  // ndjson
  const lines = raw.split("\n").filter((line) => line.trim() !== "");
  const resources: FhirResource[] = [];
  for (const line of lines) {
    const result = parseJson(line);
    if (result.success) {
      resources.push(result.resource);
    } else {
      process.stderr.write(`Warning: skipping invalid NDJSON line: ${result.error}\n`);
    }
  }
  return { success: true, resources, format };
}
