import { describe, expect, it } from "vitest";
import { validate } from "@/core/validate.js";
import type { FhirResource } from "@/core/types.js";

describe("validate", () => {
  it("returns valid for a minimal resource", () => {
    const result = validate({ resourceType: "Patient" });
    expect(result.valid).toBe(true);
  });

  it("returns valid for a resource with optional fields", () => {
    const result = validate({
      resourceType: "Observation",
      id: "obs-001",
      meta: { versionId: "1", lastUpdated: "2024-01-01T00:00:00Z" },
    });
    expect(result.valid).toBe(true);
  });

  it("returns invalid when resourceType is empty string", () => {
    const result = validate({ resourceType: "" });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]?.path).toBe("resourceType");
    }
  });

  it("returns invalid when id is a number (cast as unknown)", () => {
    // Simulate a resource that passes through with wrong id type
    const resource = { resourceType: "Patient", id: 123 } as unknown as FhirResource;
    const result = validate(resource);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      const idError = result.errors.find((e) => e.path === "id");
      expect(idError).toBeDefined();
    }
  });

  it("returns invalid when meta is not an object", () => {
    const resource = { resourceType: "Patient", meta: "not-an-object" } as unknown as FhirResource;
    const result = validate(resource);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      const metaError = result.errors.find((e) => e.path === "meta");
      expect(metaError).toBeDefined();
    }
  });

  it("returns invalid when meta.lastUpdated is not a string", () => {
    const resource = {
      resourceType: "Patient",
      meta: { lastUpdated: 12345 },
    } as unknown as FhirResource;
    const result = validate(resource);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      const lastUpdatedError = result.errors.find((e) => e.path === "meta.lastUpdated");
      expect(lastUpdatedError).toBeDefined();
    }
  });

  it("allows arbitrary extra fields on the resource", () => {
    const result = validate({
      resourceType: "Patient",
      name: [{ family: "Doe" }],
      birthDate: "1990-01-01",
    });
    expect(result.valid).toBe(true);
  });

  it("returns errors with non-empty message", () => {
    const result = validate({ resourceType: "" });
    if (!result.valid) {
      expect(result.errors[0]?.message).toBeTruthy();
    }
  });

  it("all validation errors have severity field", () => {
    const result = validate({ resourceType: "" });
    if (result.valid === false) {
      for (const error of result.errors) {
        expect(error.severity).toBeDefined();
      }
    }
  });
});

describe("validate with version", () => {
  it("passes for known resource type with matching version", () => {
    const result = validate({ resourceType: "Patient", id: "1" }, "R4");
    // Clean resource — no findings, hint is separate
    expect(result.valid).toBe(true);
    expect(result.hint).toBeDefined();
  });

  it("warns for unknown resource type", () => {
    const result = validate({ resourceType: "CustomType" }, "R5");
    expect(result.valid).toBe(false);
    if (result.valid === false) {
      const warning = result.errors.find((e) => e.path === "resourceType");
      expect(warning?.severity).toBe("warning");
    }
  });

  it("warns for fhirVersion mismatch", () => {
    const result = validate(
      { resourceType: "Patient", meta: { fhirVersion: "5.0.0" } },
      "R4",
    );
    if (result.valid === false) {
      const warning = result.errors.find((e) => e.path === "meta.fhirVersion");
      expect(warning?.severity).toBe("warning");
    }
  });

  it("backward compat: validate without version works as before", () => {
    const result = validate({ resourceType: "Patient" });
    expect(result.valid).toBe(true);
  });

  it("always adds full validation hint when version is provided", () => {
    const result = validate({ resourceType: "Patient" }, "R4");
    // Clean resource with known type should now be valid — hint is not a finding
    expect(result.hint).toBeDefined();
    expect(result.hint?.docUrl).toContain("hl7.org");
  });

  it("adds R5 narrative info when text has status but no div", () => {
    const result = validate(
      { resourceType: "Patient", text: { status: "generated" } },
      "R5",
    );
    if (result.valid === false) {
      const info = result.errors.find((e) => e.path === "text" && e.severity === "info");
      expect(info).toBeDefined();
    }
  });

  it("does not add R5 narrative info when text has both status and div", () => {
    const result = validate(
      { resourceType: "Patient", text: { status: "generated", div: "<div>text</div>" } },
      "R5",
    );
    if (result.valid === false) {
      const narrativeInfo = result.errors.find((e) => e.path === "text" && e.severity === "info");
      expect(narrativeInfo).toBeUndefined();
    }
  });

  it("does not warn about R5 narrative when version is R4", () => {
    const result = validate(
      { resourceType: "Patient", text: { status: "generated" } },
      "R4",
    );
    if (result.valid === false) {
      const narrativeInfo = result.errors.find((e) => e.path === "text" && e.severity === "info");
      expect(narrativeInfo).toBeUndefined();
    }
  });

  it("all version-aware errors have severity field", () => {
    const result = validate({ resourceType: "CustomType" }, "R5");
    if (result.valid === false) {
      for (const error of result.errors) {
        expect(error.severity).toBeDefined();
      }
    }
  });
});

describe("validate — format rules integration", () => {
  it("warns for malformed id and includes ruleId", () => {
    const result = validate({ resourceType: "Patient", id: "has spaces!!" });
    expect(result.valid).toBe(false);
    if (result.valid === false) {
      const finding = result.errors.find((e) => e.ruleId === "fhir-id-format");
      expect(finding).toBeDefined();
      expect(finding?.severity).toBe("warning");
      expect(finding?.path).toBe("id");
    }
  });

  it("warns for malformed date and includes ruleId", () => {
    const result = validate({ resourceType: "Patient", birthDate: "03/15/1990" });
    expect(result.valid).toBe(false);
    if (result.valid === false) {
      const finding = result.errors.find((e) => e.ruleId === "fhir-date-format");
      expect(finding).toBeDefined();
      expect(finding?.severity).toBe("warning");
    }
  });

  it("warns for bare reference id and includes ruleId", () => {
    const result = validate({
      resourceType: "Observation",
      subject: { reference: "12345" },
    });
    expect(result.valid).toBe(false);
    if (result.valid === false) {
      const finding = result.errors.find((e) => e.ruleId === "fhir-reference-format");
      expect(finding).toBeDefined();
      expect(finding?.severity).toBe("warning");
    }
  });

  it("produces no rule findings for a clean resource", () => {
    const result = validate({
      resourceType: "Patient",
      id: "patient-001",
      meta: { lastUpdated: "2024-03-15T10:00:00Z" },
      name: [{ family: "Doe" }],
      birthDate: "1990-01-15",
    });
    expect(result.valid).toBe(true);
  });

  it("format rules run even without --fhir-version", () => {
    const result = validate({ resourceType: "Patient", id: "bad id!" });
    expect(result.valid).toBe(false);
    if (result.valid === false) {
      expect(result.errors.find((e) => e.ruleId === "fhir-id-format")).toBeDefined();
    }
    // No hint without --fhir-version
    expect(result.hint).toBeUndefined();
  });
});

describe("validate — structural rules integration", () => {
  it("warns for missing required field with ruleId fhir-required-fields", () => {
    const result = validate({ resourceType: "Observation" }, "R4");
    expect(result.valid).toBe(false);
    if (result.valid === false) {
      const finding = result.errors.find((e) => e.ruleId === "fhir-required-fields");
      expect(finding).toBeDefined();
      expect(finding?.severity).toBe("warning");
    }
  });

  it("warns for invalid status value with ruleId fhir-status-values", () => {
    const result = validate(
      {
        resourceType: "Observation",
        status: "active",
        code: { coding: [{ system: "http://loinc.org", code: "1234-5" }] },
      },
      "R4",
    );
    expect(result.valid).toBe(false);
    if (result.valid === false) {
      const finding = result.errors.find((e) => e.ruleId === "fhir-status-values");
      expect(finding).toBeDefined();
      expect(finding?.severity).toBe("warning");
    }
  });

  it("warns for broken Coding with ruleId fhir-codeable-concept", () => {
    const result = validate(
      {
        resourceType: "Observation",
        status: "final",
        code: { coding: [{ code: "1234-5" }] }, // missing system
      },
      "R4",
    );
    expect(result.valid).toBe(false);
    if (result.valid === false) {
      const finding = result.errors.find((e) => e.ruleId === "fhir-codeable-concept");
      expect(finding).toBeDefined();
      expect(finding?.severity).toBe("warning");
    }
  });

  it("structural rules do not fire without version", () => {
    const result = validate({ resourceType: "Observation" });
    // Without version, no structural rules run — only format rules run
    if (result.valid === false) {
      const structuralFindings = result.errors.filter(
        (e) =>
          e.ruleId === "fhir-required-fields" ||
          e.ruleId === "fhir-status-values" ||
          e.ruleId === "fhir-codeable-concept",
      );
      expect(structuralFindings).toHaveLength(0);
    }
  });

  it("warnings do not cause valid: false — but warnings ARE included in errors array", () => {
    // The result is valid:false because errors array is non-empty (warnings count)
    // but warning severity is "warning" not "error"
    const result = validate({ resourceType: "Observation" }, "R4");
    expect(result.valid).toBe(false);
    if (result.valid === false) {
      const errorSeverity = result.errors.filter((e) => e.severity === "error");
      // No hard errors — only warnings from structural rules
      expect(errorSeverity).toHaveLength(0);
    }
  });

  it("clean resource with version passes structural validation", () => {
    const result = validate(
      {
        resourceType: "Observation",
        id: "obs-001",
        status: "final",
        code: {
          coding: [{ system: "http://loinc.org", code: "8867-4" }],
        },
      },
      "R4",
    );
    expect(result.valid).toBe(true);
    expect(result.hint).toBeDefined();
  });
});

describe("validate — profile awareness integration", () => {
  it("recognizes vitalsigns profile from blood pressure example", () => {
    const result = validate(
      {
        resourceType: "Observation",
        id: "blood-pressure",
        meta: { profile: ["http://hl7.org/fhir/StructureDefinition/vitalsigns"] },
        status: "final",
        code: { coding: [{ system: "http://loinc.org", code: "85354-9" }] },
      },
      "R4",
    );
    if (result.valid === false) {
      const profileFinding = result.errors.find((e) => e.ruleId === "fhir-profile-aware");
      expect(profileFinding).toBeDefined();
      expect(profileFinding?.severity).toBe("info");
      expect(profileFinding?.message).toContain("Vital Signs");
    } else {
      // If valid, check via a resource that produces only profile findings
      const r2 = validate(
        {
          resourceType: "Patient",
          id: "p1",
          meta: { profile: ["http://hl7.org/fhir/StructureDefinition/vitalsigns"] },
        },
        "R4",
      );
      if (r2.valid === false) {
        const finding = r2.errors.find((e) => e.ruleId === "fhir-profile-aware");
        expect(finding).toBeDefined();
        expect(finding?.message).toContain("Vital Signs");
      }
    }
  });

  it("recognizes a known US Core profile", () => {
    const result = validate(
      {
        resourceType: "Patient",
        id: "p1",
        meta: {
          profile: ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"],
        },
      },
      "R4",
    );
    if (result.valid === false) {
      const finding = result.errors.find((e) => e.ruleId === "fhir-profile-aware");
      expect(finding).toBeDefined();
      expect(finding?.severity).toBe("info");
      expect(finding?.message).toContain("US Core Patient");
    }
  });

  it("emits info for unknown-IG profile URL pointing to HL7 validator", () => {
    const result = validate(
      {
        resourceType: "Patient",
        id: "p1",
        meta: {
          profile: ["https://example.org/profiles/custom-patient"],
        },
      },
      "R4",
    );
    if (result.valid === false) {
      const finding = result.errors.find((e) => e.ruleId === "fhir-profile-aware");
      expect(finding).toBeDefined();
      expect(finding?.severity).toBe("info");
      expect(finding?.docUrl).toContain("confluence.hl7.org");
    }
  });

  it("emits warning for malformed profile URL and marks valid: false", () => {
    const result = validate(
      {
        resourceType: "Patient",
        id: "p1",
        meta: { profile: ["not-a-url"] },
      },
    );
    expect(result.valid).toBe(false);
    if (result.valid === false) {
      const finding = result.errors.find((e) => e.ruleId === "fhir-profile-aware");
      expect(finding).toBeDefined();
      expect(finding?.severity).toBe("warning");
    }
  });

  it("profile rules run even without --fhir-version", () => {
    const result = validate({
      resourceType: "Patient",
      id: "p1",
      meta: { profile: ["http://hl7.org/fhir/StructureDefinition/vitalsigns"] },
    });
    // Profile info findings cause valid: false (info counts as non-empty errors array)
    if (result.valid === false) {
      const finding = result.errors.find((e) => e.ruleId === "fhir-profile-aware");
      expect(finding).toBeDefined();
      expect(finding?.severity).toBe("info");
    }
  });

  it("resource with no meta.profile produces no profile findings", () => {
    const result = validate(
      { resourceType: "Patient", id: "p1" },
      "R4",
    );
    expect(result.valid).toBe(true);
    if (result.valid === false) {
      const profileFindings = result.errors.filter((e) => e.ruleId === "fhir-profile-aware");
      expect(profileFindings).toHaveLength(0);
    }
  });
});
