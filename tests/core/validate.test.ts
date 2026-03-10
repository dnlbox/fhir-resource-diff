import { describe, expect, it } from "vitest";
import { validate } from "@/core/validate.js";

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
    const resource = { resourceType: "Patient", id: 123 } as unknown as import("@/core/types.js").FhirResource;
    const result = validate(resource);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      const idError = result.errors.find((e) => e.path === "id");
      expect(idError).toBeDefined();
    }
  });

  it("returns invalid when meta is not an object", () => {
    const resource = { resourceType: "Patient", meta: "not-an-object" } as unknown as import("@/core/types.js").FhirResource;
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
    } as unknown as import("@/core/types.js").FhirResource;
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
});
