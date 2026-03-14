import type { DiffResult, ValidationResult } from "@/core/types.js";

export function formatJson(result: DiffResult): string {
  return JSON.stringify(result, null, 2);
}

export function formatValidationJson(result: ValidationResult): string {
  // Normalise to a stable shape: always include errors array, hint if present
  const output: Record<string, unknown> = { valid: result.valid };
  if (!result.valid) {
    output["errors"] = result.errors;
  }
  if (result.hint !== undefined) {
    output["hint"] = result.hint;
  }
  return JSON.stringify(output, null, 2);
}
