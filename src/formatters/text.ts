import type { DiffResult, ValidationResult } from "@/core/types.js";

function formatValue(value: unknown): string {
  if (typeof value === "string") {
    return `"${value}"`;
  }
  return JSON.stringify(value);
}

export function formatText(result: DiffResult): string {
  const lines: string[] = [];

  lines.push(`ResourceType: ${result.resourceType}`);

  if (result.identical) {
    lines.push("Status: identical");
    return lines.join("\n");
  }

  const count = result.entries.length;
  lines.push(`Status: ${count} difference(s) found`);

  const changed = result.entries.filter((e) => e.kind === "changed");
  const added = result.entries.filter((e) => e.kind === "added");
  const removed = result.entries.filter((e) => e.kind === "removed");
  const typeChanged = result.entries.filter((e) => e.kind === "type-changed");

  if (changed.length > 0) {
    lines.push("");
    lines.push("Changed:");
    for (const entry of changed) {
      lines.push(
        `  ${entry.path}: ${formatValue(entry.left)} → ${formatValue(entry.right)}`,
      );
    }
  }

  if (added.length > 0) {
    lines.push("");
    lines.push("Added:");
    for (const entry of added) {
      lines.push(`  ${entry.path}`);
    }
  }

  if (removed.length > 0) {
    lines.push("");
    lines.push("Removed:");
    for (const entry of removed) {
      lines.push(`  ${entry.path}`);
    }
  }

  if (typeChanged.length > 0) {
    lines.push("");
    lines.push("Type-changed:");
    for (const entry of typeChanged) {
      lines.push(
        `  ${entry.path}: ${formatValue(entry.left)} → ${formatValue(entry.right)}`,
      );
    }
  }

  return lines.join("\n");
}

export function formatValidationText(result: ValidationResult): string {
  if (result.valid) {
    return "Valid";
  }

  const lines: string[] = [];
  for (const error of result.errors) {
    lines.push(`  ${error.path}: ${error.message}`);
  }
  return lines.join("\n");
}
