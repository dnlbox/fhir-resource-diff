import { describe, expect, it } from "vitest";
import { referenceFormatRule } from "@/core/rules/reference-format.js";

const check = (resource: Record<string, unknown>, version?: "R4" | "R4B" | "R5") =>
  referenceFormatRule.check(
    resource as Parameters<typeof referenceFormatRule.check>[0],
    version,
  );

describe("referenceFormatRule — valid formats", () => {
  it("passes for relative reference ResourceType/id", () => {
    expect(
      check({ resourceType: "Observation", subject: { reference: "Patient/123" } }),
    ).toHaveLength(0);
  });

  it("passes for absolute HTTP URL", () => {
    expect(
      check({
        resourceType: "Observation",
        subject: { reference: "https://example.com/fhir/Patient/123" },
      }),
    ).toHaveLength(0);
  });

  it("passes for fragment reference", () => {
    expect(
      check({ resourceType: "Observation", subject: { reference: "#contained-1" } }),
    ).toHaveLength(0);
  });

  it("passes for urn:uuid reference", () => {
    expect(
      check({
        resourceType: "Observation",
        subject: { reference: "urn:uuid:550e8400-e29b-41d4-a716-446655440000" },
      }),
    ).toHaveLength(0);
  });

  it("passes for urn:oid reference", () => {
    expect(
      check({ resourceType: "Observation", subject: { reference: "urn:oid:2.16.840.1" } }),
    ).toHaveLength(0);
  });

  it("passes for HTTPS absolute URL", () => {
    expect(
      check({
        resourceType: "Observation",
        subject: { reference: "https://server.example.org/fhir/Patient/abc" },
      }),
    ).toHaveLength(0);
  });
});

describe("referenceFormatRule — invalid formats", () => {
  it("warns for bare numeric id", () => {
    const findings = check({ resourceType: "Observation", subject: { reference: "12345" } });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.path).toBe("subject.reference");
    expect(findings[0]?.ruleId).toBe("fhir-reference-format");
    expect(findings[0]?.severity).toBe("warning");
  });

  it("warns for resource type without id", () => {
    const findings = check({ resourceType: "Observation", subject: { reference: "Patient" } });
    expect(findings).toHaveLength(1);
  });

  it("warns for empty string reference", () => {
    const findings = check({ resourceType: "Observation", subject: { reference: "" } });
    expect(findings).toHaveLength(1);
  });

  it("warns for lowercase resource type prefix", () => {
    const findings = check({ resourceType: "Observation", subject: { reference: "patient/123" } });
    expect(findings).toHaveLength(1);
  });
});

describe("referenceFormatRule — version-aware registry check", () => {
  it("warns for unknown resource type in relative reference when version is provided", () => {
    const findings = check(
      { resourceType: "Observation", subject: { reference: "InvalidType/123" } },
      "R4",
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.ruleId).toBe("fhir-reference-format");
  });

  it("does not warn for known resource type", () => {
    const findings = check(
      { resourceType: "Observation", subject: { reference: "Patient/123" } },
      "R4",
    );
    expect(findings).toHaveLength(0);
  });

  it("skips registry check when no version provided", () => {
    // Even unknown type passes format check — registry check is version-gated
    const findings = check({
      resourceType: "Observation",
      subject: { reference: "UnknownType/123" },
    });
    expect(findings).toHaveLength(0);
  });
});

describe("referenceFormatRule — nested references", () => {
  it("detects references nested in arrays", () => {
    const resource = {
      resourceType: "DiagnosticReport",
      result: [
        { reference: "Observation/valid-1" },
        { reference: "bare-id" },
      ],
    };
    const findings = check(resource);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.path).toBe("result[1].reference");
  });

  it("skips non-string reference values", () => {
    const resource = {
      resourceType: "Patient",
      reference: 123,
    };
    expect(check(resource)).toHaveLength(0);
  });
});
