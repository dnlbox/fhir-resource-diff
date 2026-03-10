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
    // Should have no error-severity issues, but will have info hint
    expect(result.valid === false ? result.errors.filter((e) => e.severity === "error") : []).toHaveLength(0);
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
    expect(result.valid).toBe(false);
    if (result.valid === false) {
      const hint = result.errors.find((e) => e.path === "" && e.severity === "info");
      expect(hint).toBeDefined();
    }
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
