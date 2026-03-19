import { describe, expect, it } from "vitest";
import { commonBindingsRule } from "@/core/rules/fhir-common-bindings.js";
import type { FhirResource } from "@/core/types.js";
import type { FhirVersion } from "@/core/fhir-version.js";

const check = (resource: Record<string, unknown>, version?: FhirVersion) =>
  commonBindingsRule.check(resource as FhirResource, version);

describe("commonBindingsRule — Patient.gender", () => {
  it("passes for valid gender: male", () => {
    expect(check({ resourceType: "Patient", gender: "male" }, "R4")).toHaveLength(0);
  });

  it("passes for all valid gender values", () => {
    for (const gender of ["male", "female", "other", "unknown"]) {
      expect(
        check({ resourceType: "Patient", gender }, "R4"),
        `gender '${gender}' should pass`,
      ).toHaveLength(0);
    }
  });

  it("warns for invalid gender value", () => {
    const findings = check({ resourceType: "Patient", gender: "INVALID_GENDER" }, "R4");
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("warning");
    expect(findings[0]?.ruleId).toBe("fhir-common-bindings");
    expect(findings[0]?.message).toContain("INVALID_GENDER");
    expect(findings[0]?.path).toBe("gender");
    expect(findings[0]?.docUrl).toBeDefined();
  });

  it("passes when gender is absent (field is optional)", () => {
    expect(check({ resourceType: "Patient" }, "R4")).toHaveLength(0);
  });

  it("warns for invalid gender in R4B", () => {
    const findings = check({ resourceType: "Patient", gender: "M" }, "R4B");
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("M");
  });

  it("warns for invalid gender in R5", () => {
    const findings = check({ resourceType: "Patient", gender: "nonbinary" }, "R5");
    expect(findings).toHaveLength(1);
  });

  it("does not check gender on non-Patient resources", () => {
    const findings = check({ resourceType: "Practitioner", gender: "INVALID" }, "R4");
    expect(findings).toHaveLength(0);
  });
});

describe("commonBindingsRule — telecom[].system", () => {
  it("passes for all valid ContactPointSystem values", () => {
    for (const system of ["phone", "fax", "email", "pager", "url", "sms", "other"]) {
      const findings = check(
        { resourceType: "Patient", telecom: [{ system, value: "555-1234" }] },
        "R4",
      );
      expect(findings, `system '${system}' should pass`).toHaveLength(0);
    }
  });

  it("warns for invalid telecom.system on Patient", () => {
    const findings = check(
      { resourceType: "Patient", telecom: [{ system: "fax-machine", value: "555-1234" }] },
      "R4",
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("warning");
    expect(findings[0]?.ruleId).toBe("fhir-common-bindings");
    expect(findings[0]?.message).toContain("fax-machine");
    expect(findings[0]?.path).toBe("telecom[0].system");
    expect(findings[0]?.docUrl).toBeDefined();
  });

  it("warns for invalid telecom.system on Organization", () => {
    const findings = check(
      { resourceType: "Organization", telecom: [{ system: "carrier-pigeon", value: "555-1234" }] },
      "R4",
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("carrier-pigeon");
  });

  it("passes when telecom[].system is absent (field is optional)", () => {
    const findings = check(
      { resourceType: "Patient", telecom: [{ value: "555-1234" }] },
      "R4",
    );
    expect(findings).toHaveLength(0);
  });

  it("flags each invalid entry with correct index", () => {
    const findings = check(
      {
        resourceType: "Patient",
        telecom: [
          { system: "phone", value: "555-1234" },
          { system: "bad-system", value: "555-5678" },
        ],
      },
      "R4",
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.path).toBe("telecom[1].system");
  });

  it("passes when telecom array is absent", () => {
    expect(check({ resourceType: "Patient" }, "R4")).toHaveLength(0);
  });
});
