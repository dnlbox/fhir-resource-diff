import { describe, expect, it } from "vitest";
import { isFhirResource, parseJson } from "../../src/core/parse.js";

describe("parseJson", () => {
  it("returns success for valid FHIR JSON", () => {
    const input = JSON.stringify({ resourceType: "Patient", id: "123" });
    const result = parseJson(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.resource.resourceType).toBe("Patient");
      expect(result.resource.id).toBe("123");
    }
  });

  it("returns failure for invalid JSON", () => {
    const result = parseJson("{ not valid json }");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeTruthy();
    }
  });

  it("returns failure when resourceType is missing", () => {
    const result = parseJson(JSON.stringify({ id: "123", name: "Alice" }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/resourceType/i);
    }
  });

  it("returns failure when resourceType is a number", () => {
    const result = parseJson(JSON.stringify({ resourceType: 42, id: "123" }));
    expect(result.success).toBe(false);
  });

  it("preserves arbitrary FHIR fields on success", () => {
    const resource = {
      resourceType: "Patient",
      name: [{ given: ["Jane"], family: "Doe" }],
    };
    const result = parseJson(JSON.stringify(resource));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.resource.name).toEqual(resource.name);
    }
  });
});

describe("isFhirResource", () => {
  it("returns true for objects with a string resourceType", () => {
    expect(isFhirResource({ resourceType: "Patient" })).toBe(true);
  });

  it("returns false for null", () => {
    expect(isFhirResource(null)).toBe(false);
  });

  it("returns false for primitives", () => {
    expect(isFhirResource("Patient")).toBe(false);
    expect(isFhirResource(42)).toBe(false);
    expect(isFhirResource(true)).toBe(false);
  });

  it("returns false when resourceType is missing", () => {
    expect(isFhirResource({ id: "123" })).toBe(false);
  });

  it("returns false when resourceType is not a string", () => {
    expect(isFhirResource({ resourceType: 42 })).toBe(false);
    expect(isFhirResource({ resourceType: null })).toBe(false);
  });
});
