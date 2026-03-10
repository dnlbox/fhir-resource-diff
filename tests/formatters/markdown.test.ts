import { describe, it, expect } from "vitest";
import { formatMarkdown } from "../../src/formatters/markdown.js";
import type { DiffResult } from "../../src/core/types.js";

const representativeResult: DiffResult = {
  resourceType: "Patient",
  identical: false,
  entries: [
    { kind: "changed", path: "name[0].given[0]", left: "John", right: "Johnny" },
    { kind: "added", path: "telecom[1]", right: { system: "phone" } },
    { kind: "removed", path: "identifier[0]", left: { system: "MRN" } },
  ],
};

describe("formatMarkdown", () => {
  it("output contains a markdown table with '| Kind |' header", () => {
    const output = formatMarkdown(representativeResult);
    expect(output).toContain("| Kind |");
    expect(output).toContain("|------|");
  });

  it("wraps paths in backticks", () => {
    const output = formatMarkdown(representativeResult);
    expect(output).toContain("`name[0].given[0]`");
    expect(output).toContain("`telecom[1]`");
    expect(output).toContain("`identifier[0]`");
  });

  it("wraps string values in double quotes inside backticks", () => {
    const output = formatMarkdown(representativeResult);
    expect(output).toContain('`"John"`');
    expect(output).toContain('`"Johnny"`');
  });

  it("leaves left/right cells empty for added entries", () => {
    const result: DiffResult = {
      resourceType: "Patient",
      identical: false,
      entries: [{ kind: "added", path: "telecom[1]", right: "val" }],
    };
    const output = formatMarkdown(result);
    expect(output).toContain("| added | `telecom[1]` |  |  |");
  });

  it("leaves left/right cells empty for removed entries", () => {
    const result: DiffResult = {
      resourceType: "Patient",
      identical: false,
      entries: [{ kind: "removed", path: "identifier[0]", left: "val" }],
    };
    const output = formatMarkdown(result);
    expect(output).toContain("| removed | `identifier[0]` |  |  |");
  });

  it("shows status line with difference count", () => {
    const output = formatMarkdown(representativeResult);
    expect(output).toContain("**Status:** 3 difference(s) found");
  });

  it("shows identical status and empty table for identical resources", () => {
    const result: DiffResult = {
      resourceType: "Patient",
      identical: true,
      entries: [],
    };
    const output = formatMarkdown(result);
    expect(output).toContain("**Status:** identical");
    expect(output).toContain("| Kind |");
    // No data rows beyond the header
    const lines = output.split("\n");
    const tableLines = lines.filter((l) => l.startsWith("|"));
    expect(tableLines).toHaveLength(2); // header + separator only
  });

  it("includes the resource type in the heading", () => {
    const output = formatMarkdown(representativeResult);
    expect(output).toContain("## Diff: Patient");
  });

  it("snapshot: representative DiffResult", () => {
    expect(formatMarkdown(representativeResult)).toMatchSnapshot();
  });
});
