import type { DiffResult, DiffSummary } from "@/core/types.js";

/**
 * Computes summary counts from a DiffResult.
 * Pure function — no I/O, no side effects.
 */
export function summarizeDiff(result: DiffResult): DiffSummary {
  let added = 0;
  let removed = 0;
  let changed = 0;
  let typeChanged = 0;

  for (const entry of result.entries) {
    if (entry.kind === "added") added++;
    else if (entry.kind === "removed") removed++;
    else if (entry.kind === "changed") changed++;
    else if (entry.kind === "type-changed") typeChanged++;
  }

  return {
    added,
    removed,
    changed,
    typeChanged,
    total: added + removed + changed + typeChanged,
  };
}
