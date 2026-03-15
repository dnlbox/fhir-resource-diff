import { describe, expect, it } from "vitest";
import { codeableConceptRule } from "@/core/rules/codeable-concept.js";
import type { FhirResource } from "@/core/types.js";
import type { FhirVersion } from "@/core/fhir-version.js";

const check = (resource: Record<string, unknown>, version?: FhirVersion) =>
  codeableConceptRule.check(resource as FhirResource, version);

describe("codeableConceptRule", () => {
  it("passes for a valid Coding with system and code", () => {
    const findings = check({
      resourceType: "Observation",
      code: {
        coding: [{ system: "http://loinc.org", code: "1234-5" }],
      },
    });
    expect(findings).toHaveLength(0);
  });

  it("warns for Coding missing system", () => {
    const findings = check({
      resourceType: "Observation",
      code: {
        coding: [{ code: "1234-5" }],
      },
    });
    const codingFinding = findings.find((f) => f.message.includes("system"));
    expect(codingFinding).toBeDefined();
    expect(codingFinding?.severity).toBe("warning");
    expect(codingFinding?.ruleId).toBe("fhir-codeable-concept");
  });

  it("warns for Coding missing code", () => {
    const findings = check({
      resourceType: "Observation",
      code: {
        coding: [{ system: "http://loinc.org" }],
      },
    });
    const codingFinding = findings.find((f) => f.message.includes("'code'"));
    expect(codingFinding).toBeDefined();
    expect(codingFinding?.severity).toBe("warning");
    expect(codingFinding?.ruleId).toBe("fhir-codeable-concept");
  });

  it("warns for empty CodeableConcept (coding: [] and no text)", () => {
    const findings = check({
      resourceType: "Observation",
      code: {
        coding: [],
      },
    });
    const emptyFinding = findings.find((f) => f.message.includes("empty"));
    expect(emptyFinding).toBeDefined();
    expect(emptyFinding?.ruleId).toBe("fhir-codeable-concept");
  });

  it("passes for empty coding when text is present", () => {
    const findings = check({
      resourceType: "Observation",
      code: {
        coding: [],
        text: "Some observation",
      },
    });
    // No warning about empty coding when text is present
    const emptyFinding = findings.find((f) => f.message.includes("empty"));
    expect(emptyFinding).toBeUndefined();
  });

  it("warns when known CodeableConcept field is a plain string", () => {
    const findings = check({
      resourceType: "Observation",
      status: "final",
      code: "12345",
    });
    const stringFinding = findings.find((f) => f.path === "code" && f.message.includes("plain string"));
    expect(stringFinding).toBeDefined();
    expect(stringFinding?.severity).toBe("warning");
    expect(stringFinding?.ruleId).toBe("fhir-codeable-concept");
  });

  it("passes when Observation.code is a proper CodeableConcept object", () => {
    const findings = check({
      resourceType: "Observation",
      status: "final",
      code: { coding: [{ system: "http://loinc.org", code: "1234-5" }] },
    });
    // No plain-string warning
    const stringFinding = findings.find((f) => f.path === "code" && f.message.includes("plain string"));
    expect(stringFinding).toBeUndefined();
  });

  it("warns when Immunization.vaccineCode is a plain string", () => {
    const findings = check({
      resourceType: "Immunization",
      vaccineCode: "CVX-207",
    });
    const stringFinding = findings.find((f) => f.path === "vaccineCode");
    expect(stringFinding).toBeDefined();
  });

  it("warns for non-URI system in Coding", () => {
    const findings = check({
      resourceType: "Observation",
      code: {
        coding: [{ system: "LOINC", code: "1234-5" }],
      },
    });
    const sysFinding = findings.find((f) => f.message.includes("URI"));
    expect(sysFinding).toBeDefined();
    expect(sysFinding?.ruleId).toBe("fhir-codeable-concept");
  });

  it("passes for urn: system in Coding", () => {
    const findings = check({
      resourceType: "Observation",
      code: {
        coding: [{ system: "urn:oid:2.16.840.1.113883.6.1", code: "1234-5" }],
      },
    });
    const sysFinding = findings.find((f) => f.message.includes("URI"));
    expect(sysFinding).toBeUndefined();
  });

  it("warns for empty string code in Coding", () => {
    const findings = check({
      resourceType: "Observation",
      code: {
        coding: [{ system: "http://loinc.org", code: "" }],
      },
    });
    const codeFinding = findings.find((f) => f.message.includes("non-empty"));
    expect(codeFinding).toBeDefined();
  });

  it("detects nested CodeableConcepts via tree walk", () => {
    const findings = check({
      resourceType: "Observation",
      component: [
        {
          code: {
            coding: [{ code: "8480-6" }], // missing system
          },
          valueQuantity: { value: 120, unit: "mmHg" },
        },
      ],
    });
    const nestedFinding = findings.find((f) => f.message.includes("system"));
    expect(nestedFinding).toBeDefined();
    expect(nestedFinding?.path).toContain("coding");
  });

  it("does not flag resource-level objects as Codings (resourceType present)", () => {
    // Embedded resources should not be treated as Codings
    const findings = check({
      resourceType: "Bundle",
      entry: [
        {
          resource: {
            resourceType: "Patient",
            code: "some-code", // Patient doesn't have a known CodeableConcept code field
          },
        },
      ],
    });
    // Patient.code is not in KNOWN_CODEABLE_CONCEPT_FIELDS so no string warning
    const patientCodeFinding = findings.find(
      (f) => f.path === "code" && f.message.includes("plain string"),
    );
    expect(patientCodeFinding).toBeUndefined();
  });

  it("passes for a clean resource with no Coding-like fields", () => {
    const findings = check({
      resourceType: "Patient",
      name: [{ family: "Doe", given: ["John"] }],
      birthDate: "1990-01-15",
    });
    expect(findings).toHaveLength(0);
  });
});
