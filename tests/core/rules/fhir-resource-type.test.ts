import { describe, expect, it } from "vitest";
import { resourceTypeRule } from "@/core/rules/fhir-resource-type.js";
import type { FhirResource } from "@/core/types.js";
import type { FhirVersion } from "@/core/fhir-version.js";

const check = (resource: Record<string, unknown>, version?: FhirVersion) =>
  resourceTypeRule.check(resource as FhirResource, version);

describe("resourceTypeRule", () => {
  it("passes for known resource type without version", () => {
    expect(check({ resourceType: "Patient" })).toHaveLength(0);
  });

  it("passes for known resource type with matching version", () => {
    expect(check({ resourceType: "Patient" }, "R4")).toHaveLength(0);
    expect(check({ resourceType: "Patient" }, "R4B")).toHaveLength(0);
    expect(check({ resourceType: "Patient" }, "R5")).toHaveLength(0);
  });

  it("warns for completely unknown resourceType", () => {
    const findings = check({ resourceType: "InvalidResourceXYZ" });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("warning");
    expect(findings[0]?.ruleId).toBe("fhir-resource-type");
    expect(findings[0]?.message).toContain("InvalidResourceXYZ");
    expect(findings[0]?.path).toBe("resourceType");
    expect(findings[0]?.docUrl).toBeDefined();
  });

  it("warns for unknown resourceType even with version specified", () => {
    const findings = check({ resourceType: "FakeResource" }, "R4");
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("FakeResource");
  });

  it("warns for version mismatch: MedicationStatement in R5", () => {
    const findings = check({ resourceType: "MedicationStatement" }, "R5");
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("warning");
    expect(findings[0]?.message).toContain("MedicationStatement");
    expect(findings[0]?.message).toContain("R5");
    expect(findings[0]?.message).toContain("R4");
  });

  it("passes for MedicationStatement in R4", () => {
    expect(check({ resourceType: "MedicationStatement" }, "R4")).toHaveLength(0);
  });

  it("passes for MedicationUsage in R5", () => {
    expect(check({ resourceType: "MedicationUsage" }, "R5")).toHaveLength(0);
  });

  it("warns for MedicationUsage in R4 (R5-only)", () => {
    const findings = check({ resourceType: "MedicationUsage" }, "R4");
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("MedicationUsage");
    expect(findings[0]?.message).toContain("R4");
    expect(findings[0]?.message).toContain("R5");
  });

  it("returns empty array when resourceType is absent (parse rule handles that)", () => {
    expect(check({ resourceType: "" })).toHaveLength(0);
  });
});
