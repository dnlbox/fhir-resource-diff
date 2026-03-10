import { describe, it, expect } from "vitest";
import { formatText, formatValidationText } from "@/formatters/text.js";
import type { DiffResult, ValidationResult } from "@/core/types.js";

describe("formatText", () => {
  it("outputs identical status when resources are identical", () => {
    const result: DiffResult = {
      resourceType: "Patient",
      identical: true,
      entries: [],
    };
    const output = formatText(result);
    expect(output).toBe("ResourceType: Patient\nStatus: identical");
  });

  it("shows changed section with left and right values", () => {
    const result: DiffResult = {
      resourceType: "Patient",
      identical: false,
      entries: [
        {
          kind: "changed",
          path: "name[0].given[0]",
          left: "John",
          right: "Johnny",
        },
      ],
    };
    const output = formatText(result);
    expect(output).toContain("Changed:");
    expect(output).toContain(`  name[0].given[0]: "John" → "Johnny"`);
  });

  it("shows added section with path only", () => {
    const result: DiffResult = {
      resourceType: "Patient",
      identical: false,
      entries: [
        {
          kind: "added",
          path: "telecom[1]",
          right: { system: "phone", value: "555-1234" },
        },
      ],
    };
    const output = formatText(result);
    expect(output).toContain("Added:");
    expect(output).toContain("  telecom[1]");
    expect(output).not.toContain("phone");
  });

  it("shows removed section with path only", () => {
    const result: DiffResult = {
      resourceType: "Patient",
      identical: false,
      entries: [
        {
          kind: "removed",
          path: "identifier[0]",
          left: { system: "MRN", value: "12345" },
        },
      ],
    };
    const output = formatText(result);
    expect(output).toContain("Removed:");
    expect(output).toContain("  identifier[0]");
    expect(output).not.toContain("MRN");
  });

  it("shows type-changed section with left and right values", () => {
    const result: DiffResult = {
      resourceType: "Observation",
      identical: false,
      entries: [
        {
          kind: "type-changed",
          path: "value",
          left: "high",
          right: 42,
        },
      ],
    };
    const output = formatText(result);
    expect(output).toContain("Type-changed:");
    expect(output).toContain(`  value: "high" → 42`);
  });

  it("omits sections that have no entries", () => {
    const result: DiffResult = {
      resourceType: "Patient",
      identical: false,
      entries: [
        {
          kind: "changed",
          path: "birthDate",
          left: "1980-01-01",
          right: "1980-01-02",
        },
      ],
    };
    const output = formatText(result);
    expect(output).not.toContain("Added:");
    expect(output).not.toContain("Removed:");
    expect(output).not.toContain("Type-changed:");
  });

  it("groups entries by kind: changed, added, removed, type-changed", () => {
    const result: DiffResult = {
      resourceType: "Patient",
      identical: false,
      entries: [
        { kind: "added", path: "telecom[1]", right: "555" },
        { kind: "removed", path: "identifier[0]", left: "MRN" },
        { kind: "changed", path: "birthDate", left: "1980-01-01", right: "1980-01-02" },
        { kind: "type-changed", path: "active", left: "true", right: true },
      ],
    };
    const output = formatText(result);
    const changedIdx = output.indexOf("Changed:");
    const addedIdx = output.indexOf("Added:");
    const removedIdx = output.indexOf("Removed:");
    const typeChangedIdx = output.indexOf("Type-changed:");
    expect(changedIdx).toBeGreaterThan(-1);
    expect(addedIdx).toBeGreaterThan(-1);
    expect(removedIdx).toBeGreaterThan(-1);
    expect(typeChangedIdx).toBeGreaterThan(-1);
    expect(changedIdx).toBeLessThan(addedIdx);
    expect(addedIdx).toBeLessThan(removedIdx);
    expect(removedIdx).toBeLessThan(typeChangedIdx);
  });

  it("quotes strings but leaves numbers and booleans unquoted", () => {
    const result: DiffResult = {
      resourceType: "Observation",
      identical: false,
      entries: [
        { kind: "changed", path: "valueInteger", left: 1, right: 2 },
        { kind: "changed", path: "active", left: false, right: true },
        { kind: "changed", path: "status", left: "draft", right: "final" },
      ],
    };
    const output = formatText(result);
    expect(output).toContain("  valueInteger: 1 → 2");
    expect(output).toContain("  active: false → true");
    expect(output).toContain(`  status: "draft" → "final"`);
  });

  it("snapshot: representative DiffResult with mixed changes", () => {
    const result: DiffResult = {
      resourceType: "Patient",
      identical: false,
      entries: [
        { kind: "changed", path: "name[0].given[0]", left: "John", right: "Johnny" },
        { kind: "changed", path: "birthDate", left: "1980-01-01", right: "1980-01-02" },
        { kind: "added", path: "telecom[1]", right: { system: "phone" } },
        { kind: "removed", path: "identifier[0]", left: { system: "MRN" } },
        { kind: "type-changed", path: "active", left: "true", right: true },
      ],
    };
    expect(formatText(result)).toMatchSnapshot();
  });
});

describe("formatValidationText", () => {
  it("returns 'Valid' for a valid result", () => {
    const result: ValidationResult = { valid: true };
    expect(formatValidationText(result)).toBe("Valid");
  });

  it("lists errors one per line with path and message", () => {
    const result: ValidationResult = {
      valid: false,
      errors: [
        { path: "resourceType", message: "required field missing" },
        { path: "name[0].use", message: "invalid value" },
      ],
    };
    const output = formatValidationText(result);
    expect(output).toContain("  resourceType: required field missing");
    expect(output).toContain("  name[0].use: invalid value");
  });
});
