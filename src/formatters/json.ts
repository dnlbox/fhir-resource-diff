import type { DiffResult, ValidationResult } from "@/core/types.js";

export function formatJson(result: DiffResult): string {
  return JSON.stringify(result, null, 2);
}

export function formatValidationJson(result: ValidationResult): string {
  return JSON.stringify(result, null, 2);
}
