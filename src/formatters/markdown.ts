import type { DiffResult } from "@/core/types.js";

function formatCellValue(value: unknown): string {
  if (typeof value === "string") {
    return `\`"${value}"\``;
  }
  return `\`${JSON.stringify(value)}\``;
}

export function formatMarkdown(result: DiffResult): string {
  const lines: string[] = [];

  lines.push(`## Diff: ${result.resourceType}`);
  lines.push("");

  if (result.identical) {
    lines.push("**Status:** identical");
    lines.push("");
    lines.push("| Kind | Path | Left | Right |");
    lines.push("|------|------|------|-------|");
    return lines.join("\n");
  }

  const count = result.entries.length;
  lines.push(`**Status:** ${count} difference(s) found`);
  lines.push("");
  lines.push("| Kind | Path | Left | Right |");
  lines.push("|------|------|------|-------|");

  for (const entry of result.entries) {
    const path = `\`${entry.path}\``;
    let left = "";
    let right = "";

    if (entry.kind === "changed" || entry.kind === "type-changed") {
      left = formatCellValue(entry.left);
      right = formatCellValue(entry.right);
    }

    lines.push(`| ${entry.kind} | ${path} | ${left} | ${right} |`);
  }

  return lines.join("\n");
}
