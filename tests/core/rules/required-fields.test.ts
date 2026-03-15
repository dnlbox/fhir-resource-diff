import { describe, expect, it } from "vitest";
import { requiredFieldsRule } from "@/core/rules/required-fields.js";
import type { FhirResource } from "@/core/types.js";
import type { FhirVersion } from "@/core/fhir-version.js";

const check = (resource: Record<string, unknown>, version?: FhirVersion) =>
  requiredFieldsRule.check(resource as FhirResource, version);

describe("requiredFieldsRule", () => {
  it("passes for Observation with status and code", () => {
    const findings = check({
      resourceType: "Observation",
      status: "final",
      code: { coding: [{ system: "http://loinc.org", code: "1234-5" }] },
    });
    expect(findings).toHaveLength(0);
  });

  it("warns for Observation missing status", () => {
    const findings = check({
      resourceType: "Observation",
      code: { coding: [{ system: "http://loinc.org", code: "1234-5" }] },
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.path).toBe("status");
    expect(findings[0]?.severity).toBe("warning");
    expect(findings[0]?.ruleId).toBe("fhir-required-fields");
    expect(findings[0]?.message).toContain("status");
    expect(findings[0]?.message).toContain("Observation");
  });

  it("warns for Observation missing code", () => {
    const findings = check({
      resourceType: "Observation",
      status: "final",
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.path).toBe("code");
    expect(findings[0]?.ruleId).toBe("fhir-required-fields");
  });

  it("warns for Observation missing both status and code", () => {
    const findings = check({ resourceType: "Observation" });
    expect(findings).toHaveLength(2);
    const paths = findings.map((f) => f.path);
    expect(paths).toContain("status");
    expect(paths).toContain("code");
  });

  it("warns for Bundle missing type", () => {
    const findings = check({ resourceType: "Bundle" });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.path).toBe("type");
    expect(findings[0]?.ruleId).toBe("fhir-required-fields");
  });

  it("passes for Bundle with type present", () => {
    const findings = check({ resourceType: "Bundle", type: "searchset" });
    expect(findings).toHaveLength(0);
  });

  it("passes for Patient with just resourceType — nothing required", () => {
    const findings = check({ resourceType: "Patient" });
    expect(findings).toHaveLength(0);
  });

  it("passes for Organization with just resourceType — nothing required", () => {
    const findings = check({ resourceType: "Organization" });
    expect(findings).toHaveLength(0);
  });

  it("returns no findings for unknown resourceType", () => {
    const findings = check({ resourceType: "CustomResource" });
    expect(findings).toHaveLength(0);
  });

  it("includes docUrl in the finding", () => {
    const findings = check({ resourceType: "Observation" }, "R4");
    const statusFinding = findings.find((f) => f.path === "status");
    expect(statusFinding?.docUrl).toBeDefined();
    expect(statusFinding?.docUrl).toContain("hl7.org");
  });

  describe("version-specific: AllergyIntolerance", () => {
    it("requires patient in R4", () => {
      const findings = check({ resourceType: "AllergyIntolerance" }, "R4");
      const paths = findings.map((f) => f.path);
      expect(paths).toContain("patient");
      expect(paths).not.toContain("subject");
    });

    it("requires subject in R5 (renamed from patient)", () => {
      const findings = check({ resourceType: "AllergyIntolerance" }, "R5");
      const paths = findings.map((f) => f.path);
      expect(paths).toContain("subject");
      expect(paths).not.toContain("patient");
    });

    it("passes R4 check when patient is present", () => {
      const findings = check(
        { resourceType: "AllergyIntolerance", patient: { reference: "Patient/1" } },
        "R4",
      );
      expect(findings).toHaveLength(0);
    });

    it("passes R5 check when subject is present", () => {
      const findings = check(
        { resourceType: "AllergyIntolerance", subject: { reference: "Patient/1" } },
        "R5",
      );
      expect(findings).toHaveLength(0);
    });
  });

  describe("version-specific: Encounter", () => {
    it("requires status and class in R4", () => {
      const findings = check({ resourceType: "Encounter" }, "R4");
      const paths = findings.map((f) => f.path);
      expect(paths).toContain("status");
      expect(paths).toContain("class");
    });

    it("skips version-specific fields when no version provided", () => {
      // All Encounter fields have versions constraints, so no warnings without version
      const findings = check({ resourceType: "Encounter" });
      expect(findings).toHaveLength(0);
    });
  });

  it("treats an empty array as missing for array fields like author", () => {
    const findings = check({
      resourceType: "Composition",
      status: "final",
      type: { coding: [] },
      date: "2024-01-01",
      author: [],
    });
    const paths = findings.map((f) => f.path);
    expect(paths).toContain("author");
  });

  it("treats a populated array as present", () => {
    const findings = check({
      resourceType: "Composition",
      status: "final",
      type: { coding: [{ system: "http://loinc.org", code: "11503-0" }] },
      date: "2024-01-01",
      author: [{ reference: "Practitioner/1" }],
    });
    expect(findings).toHaveLength(0);
  });
});
