import { describe, it, expect } from "vitest";
import { formatJson, formatValidationJson } from "../../src/formatters/json.js";
import type { DiffResult, ValidationResult } from "../../src/core/types.js";

const representativeResult: DiffResult = {
  resourceType: "Patient",
  identical: false,
  entries: [
    { kind: "changed", path: "name[0].given[0]", left: "John", right: "Johnny" },
    { kind: "added", path: "telecom[1]", right: { system: "phone", value: "555-1234" } },
    { kind: "removed", path: "identifier[0]", left: { system: "MRN", value: "12345" } },
  ],
};

describe("formatJson", () => {
  it("produces valid JSON parseable by JSON.parse", () => {
    const output = formatJson(representativeResult);
    expect(() => JSON.parse(output)).not.toThrow();
  });

  it("round-trip: parsed result structurally equals input", () => {
    const output = formatJson(representativeResult);
    const parsed = JSON.parse(output) as unknown;
    expect(parsed).toEqual(representativeResult);
  });

  it("identical resources produce output with identical: true and empty entries", () => {
    const result: DiffResult = {
      resourceType: "Patient",
      identical: true,
      entries: [],
    };
    const output = formatJson(result);
    const parsed = JSON.parse(output) as { identical: boolean; entries: unknown[] };
    expect(parsed.identical).toBe(true);
    expect(parsed.entries).toEqual([]);
  });

  it("omits undefined left/right fields from JSON output", () => {
    const result: DiffResult = {
      resourceType: "Patient",
      identical: false,
      entries: [
        { kind: "added", path: "telecom[1]", right: "value" },
      ],
    };
    const output = formatJson(result);
    const parsed = JSON.parse(output) as { entries: Array<{ left?: unknown }> };
    expect(parsed.entries[0]).not.toHaveProperty("left");
  });

  it("is deterministic: same input produces same output", () => {
    const first = formatJson(representativeResult);
    const second = formatJson(representativeResult);
    expect(first).toBe(second);
  });
});

describe("formatValidationJson", () => {
  it("produces valid JSON for a valid result", () => {
    const result: ValidationResult = { valid: true };
    const output = formatValidationJson(result);
    expect(() => JSON.parse(output)).not.toThrow();
    const parsed = JSON.parse(output) as { valid: boolean };
    expect(parsed.valid).toBe(true);
  });

  it("produces valid JSON for an invalid result with errors", () => {
    const result: ValidationResult = {
      valid: false,
      errors: [
        { path: "resourceType", message: "required field missing" },
      ],
    };
    const output = formatValidationJson(result);
    expect(() => JSON.parse(output)).not.toThrow();
    const parsed = JSON.parse(output) as typeof result;
    expect(parsed.valid).toBe(false);
    if (!parsed.valid) {
      expect(parsed.errors).toHaveLength(1);
    }
  });
});
