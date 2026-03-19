import { describe, expect, it } from "vitest";
import { statusValuesRule } from "@/core/rules/status-values.js";
import type { FhirResource } from "@/core/types.js";
import type { FhirVersion } from "@/core/fhir-version.js";

const check = (resource: Record<string, unknown>, version?: FhirVersion) =>
  statusValuesRule.check(resource as FhirResource, version);

describe("statusValuesRule", () => {
  it("passes for Observation.status: final", () => {
    const findings = check({ resourceType: "Observation", status: "final" });
    expect(findings).toHaveLength(0);
  });

  it("warns for Observation.status: active (not in Observation's value set)", () => {
    const findings = check({ resourceType: "Observation", status: "active" });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("warning");
    expect(findings[0]?.ruleId).toBe("fhir-status-values");
    expect(findings[0]?.message).toContain("active");
    expect(findings[0]?.message).toContain("Observation");
  });

  it("warns for Observation.status: FINAL (case-sensitive)", () => {
    const findings = check({ resourceType: "Observation", status: "FINAL" });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("FINAL");
  });

  it("skips absent status field — required-fields rule handles that", () => {
    const findings = check({ resourceType: "Observation" });
    expect(findings).toHaveLength(0);
  });

  it("passes for Bundle.type: searchset", () => {
    const findings = check({ resourceType: "Bundle", type: "searchset" });
    expect(findings).toHaveLength(0);
  });

  it("warns for Bundle.type: search (not in value set)", () => {
    const findings = check({ resourceType: "Bundle", type: "search" });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.ruleId).toBe("fhir-status-values");
    expect(findings[0]?.message).toContain("search");
  });

  it("returns no findings for unknown resource type", () => {
    const findings = check({ resourceType: "CustomResource", status: "active" });
    expect(findings).toHaveLength(0);
  });

  describe("MedicationRequest", () => {
    it("passes for valid status and intent", () => {
      const findings = check({
        resourceType: "MedicationRequest",
        status: "active",
        intent: "order",
      });
      expect(findings).toHaveLength(0);
    });

    it("warns for invalid intent", () => {
      const findings = check({
        resourceType: "MedicationRequest",
        status: "active",
        intent: "prescription",
      });
      expect(findings).toHaveLength(1);
      expect(findings[0]?.message).toContain("prescription");
    });
  });

  describe("version-gated: Encounter", () => {
    it("passes for Encounter.status: onleave in R4", () => {
      const findings = check({ resourceType: "Encounter", status: "onleave" }, "R4");
      expect(findings).toHaveLength(0);
    });

    it("warns for Encounter.status: onleave in R5 (removed in R5)", () => {
      const findings = check({ resourceType: "Encounter", status: "onleave" }, "R5");
      expect(findings).toHaveLength(1);
      expect(findings[0]?.message).toContain("onleave");
    });

    it("passes for Encounter.status: discharged in R5", () => {
      const findings = check({ resourceType: "Encounter", status: "discharged" }, "R5");
      expect(findings).toHaveLength(0);
    });

    it("warns for Encounter.status: discharged in R4 (R5-only)", () => {
      const findings = check({ resourceType: "Encounter", status: "discharged" }, "R4");
      expect(findings).toHaveLength(1);
    });
  });

  describe("CodeableConcept status fields", () => {
    it("passes for Condition.clinicalStatus with valid code", () => {
      const findings = check({
        resourceType: "Condition",
        clinicalStatus: {
          coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: "active" }],
        },
      });
      expect(findings).toHaveLength(0);
    });

    it("warns for Condition.clinicalStatus with invalid code", () => {
      const findings = check({
        resourceType: "Condition",
        clinicalStatus: {
          coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: "current" }],
        },
      });
      expect(findings).toHaveLength(1);
      expect(findings[0]?.ruleId).toBe("fhir-status-values");
      expect(findings[0]?.message).toContain("current");
    });

    it("skips Condition.clinicalStatus when absent", () => {
      const findings = check({ resourceType: "Condition", subject: { reference: "Patient/1" } });
      expect(findings).toHaveLength(0);
    });

    it("passes for AllergyIntolerance.clinicalStatus with active", () => {
      const findings = check({
        resourceType: "AllergyIntolerance",
        clinicalStatus: {
          coding: [{ system: "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical", code: "active" }],
        },
      });
      expect(findings).toHaveLength(0);
    });

    it("warns for AllergyIntolerance.clinicalStatus with invalid code", () => {
      const findings = check({
        resourceType: "AllergyIntolerance",
        clinicalStatus: {
          coding: [{ system: "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical", code: "unknown" }],
        },
      });
      expect(findings).toHaveLength(1);
    });
  });

  describe("MedicationStatement (R4/R4B)", () => {
    const validStatuses = [
      "active",
      "completed",
      "entered-in-error",
      "intended",
      "stopped",
      "on-hold",
      "unknown",
      "not-taken",
    ] as const;

    for (const status of validStatuses) {
      it(`passes for status: ${status} in R4`, () => {
        const findings = check({ resourceType: "MedicationStatement", status }, "R4");
        expect(findings).toHaveLength(0);
      });
    }

    it("warns for invalid status in R4", () => {
      const findings = check({ resourceType: "MedicationStatement", status: "GARBAGE" }, "R4");
      expect(findings).toHaveLength(1);
      expect(findings[0]?.severity).toBe("warning");
      expect(findings[0]?.ruleId).toBe("fhir-status-values");
      expect(findings[0]?.message).toContain("GARBAGE");
      expect(findings[0]?.message).toContain("MedicationStatement");
    });

    it("warns for invalid status in R4B", () => {
      const findings = check({ resourceType: "MedicationStatement", status: "GARBAGE" }, "R4B");
      expect(findings).toHaveLength(1);
      expect(findings[0]?.ruleId).toBe("fhir-status-values");
    });

    it("warns for 'recorded' (R5 MedicationUsage value) used in R4", () => {
      const findings = check({ resourceType: "MedicationStatement", status: "recorded" }, "R4");
      expect(findings).toHaveLength(1);
      expect(findings[0]?.message).toContain("recorded");
    });

    it("still warns when version is unspecified (versions filter only excludes on mismatch, not absence)", () => {
      // No version → versions filter not applied, def runs for any value
      const findings = check({ resourceType: "MedicationStatement", status: "GARBAGE" });
      expect(findings).toHaveLength(1);
      expect(findings[0]?.ruleId).toBe("fhir-status-values");
    });
  });

  describe("MedicationUsage (R5)", () => {
    it("passes for status: recorded in R5", () => {
      const findings = check({ resourceType: "MedicationUsage", status: "recorded" }, "R5");
      expect(findings).toHaveLength(0);
    });

    it("passes for status: entered-in-error in R5", () => {
      const findings = check({ resourceType: "MedicationUsage", status: "entered-in-error" }, "R5");
      expect(findings).toHaveLength(0);
    });

    it("passes for status: draft in R5", () => {
      const findings = check({ resourceType: "MedicationUsage", status: "draft" }, "R5");
      expect(findings).toHaveLength(0);
    });

    it("warns for invalid status in R5", () => {
      const findings = check({ resourceType: "MedicationUsage", status: "GARBAGE" }, "R5");
      expect(findings).toHaveLength(1);
      expect(findings[0]?.severity).toBe("warning");
      expect(findings[0]?.ruleId).toBe("fhir-status-values");
      expect(findings[0]?.message).toContain("GARBAGE");
      expect(findings[0]?.message).toContain("MedicationUsage");
    });

    it("warns for 'active' (R4 MedicationStatement value) used in R5", () => {
      const findings = check({ resourceType: "MedicationUsage", status: "active" }, "R5");
      expect(findings).toHaveLength(1);
      expect(findings[0]?.message).toContain("active");
    });
  });

  describe("ExplanationOfBenefit", () => {
    it("warns for invalid outcome value", () => {
      const findings = check({
        resourceType: "ExplanationOfBenefit",
        status: "active",
        outcome: "approved",
      });
      expect(findings).toHaveLength(1);
      expect(findings[0]?.message).toContain("approved");
    });

    it("passes for valid outcome value", () => {
      const findings = check({
        resourceType: "ExplanationOfBenefit",
        status: "active",
        outcome: "complete",
      });
      expect(findings).toHaveLength(0);
    });
  });
});
