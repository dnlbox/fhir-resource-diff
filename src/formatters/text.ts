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

const SEVERITY_ICON: Record<string, string> = {
  error: "✗",
  warning: "⚠",
  info: "ℹ",
};

export function formatValidationText(result: ValidationResult): string {
  if (result.valid) {
    return "valid";
  }

  const hasErrors = result.errors.some((e) => e.severity === "error");
  const header = hasErrors ? "invalid" : "valid (with warnings)";

  const lines: string[] = [header];
  for (const error of result.errors) {
    const icon = SEVERITY_ICON[error.severity] ?? "✗";
    const pathPrefix = error.path !== "" ? `${error.path}: ` : "";
    lines.push(`  ${icon} ${pathPrefix}${error.message}`);
    if (error.docUrl !== undefined) {
      lines.push(`    → ${error.docUrl}`);
    }
  }
  return lines.join("\n");
}
