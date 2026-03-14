import { describe, expect, it } from "vitest";
import { idFormatRule } from "@/core/rules/id-format.js";

const check = (resource: Record<string, unknown>) =>
  idFormatRule.check(resource as Parameters<typeof idFormatRule.check>[0]);

describe("idFormatRule", () => {
  it("passes for a valid simple id", () => {
    expect(check({ resourceType: "Patient", id: "abc-123" })).toHaveLength(0);
  });

  it("passes for id at exactly 64 characters", () => {
    expect(check({ resourceType: "Patient", id: "a".repeat(64) })).toHaveLength(0);
  });

  it("warns for id longer than 64 characters", () => {
    const findings = check({ resourceType: "Patient", id: "a".repeat(65) });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.path).toBe("id");
    expect(findings[0]?.ruleId).toBe("fhir-id-format");
    expect(findings[0]?.severity).toBe("warning");
  });

  it("warns for id with spaces", () => {
    const findings = check({ resourceType: "Patient", id: "has spaces" });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.path).toBe("id");
  });

  it("warns for id with special characters", () => {
    const findings = check({ resourceType: "Patient", id: "special!@#" });
    expect(findings).toHaveLength(1);
  });

  it("warns for empty string id", () => {
    const findings = check({ resourceType: "Patient", id: "" });
    expect(findings).toHaveLength(1);
  });

  it("passes for id with allowed characters: letters, digits, hyphen, dot", () => {
    expect(check({ resourceType: "Patient", id: "ABC-123.def" })).toHaveLength(0);
  });

  it("skips non-string id fields", () => {
    // e.g. an id that is a number (should be caught by schema, not this rule)
    expect(check({ resourceType: "Patient", id: 123 as unknown as string })).toHaveLength(0);
  });

  it("detects nested id fields", () => {
    const resource = {
      resourceType: "Patient",
      identifier: [{ id: "valid-id" }, { id: "invalid id!" }],
    };
    const findings = check(resource);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.path).toBe("identifier[1].id");
  });

  it("returns no findings when no id fields are present", () => {
    expect(check({ resourceType: "Patient", name: [{ family: "Doe" }] })).toHaveLength(0);
  });
});
