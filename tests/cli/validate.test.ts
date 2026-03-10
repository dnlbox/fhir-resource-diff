import { describe, it, expect } from "vitest";
import { parseJson } from "../../src/core/parse.js";
import { validate } from "../../src/core/validate.js";
import { formatValidationText } from "../../src/formatters/text.js";
import { formatValidationJson } from "../../src/formatters/json.js";

// ---------------------------------------------------------------------------
// Inline test fixtures
// ---------------------------------------------------------------------------

const VALID_PATIENT_JSON = JSON.stringify({
  resourceType: "Patient",
  id: "patient-001",
  meta: {
    versionId: "1",
    lastUpdated: "2024-01-01T00:00:00Z",
  },
  name: [{ family: "Smith", given: ["John"] }],
  active: true,
});

// Missing resourceType — will fail parseJson (not isFhirResource)
const MISSING_RESOURCE_TYPE_JSON = JSON.stringify({
  id: "patient-002",
  name: [{ family: "Doe" }],
});

// Has resourceType but it's an empty string — will pass parseJson (has the key)
// but fail validate() schema check
const EMPTY_RESOURCE_TYPE_JSON = JSON.stringify({
  resourceType: "",
  id: "patient-003",
});

// Has resourceType and id, but meta has a non-string versionId — passes minimal validate
const VALID_MINIMAL_JSON = JSON.stringify({
  resourceType: "Observation",
  status: "final",
});

// ---------------------------------------------------------------------------
// Helpers mirroring validate command logic (without I/O)
// ---------------------------------------------------------------------------

function runValidate(json: string): ReturnType<typeof validate> | null {
  const parsed = parseJson(json);
  if (!parsed.success) {
    return null; // signals parse failure (exit 2 in CLI)
  }
  return validate(parsed.resource);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("validate command logic", () => {
  describe("valid resource", () => {
    it("returns valid:true for a well-formed Patient resource", () => {
      const result = runValidate(VALID_PATIENT_JSON);
      expect(result).not.toBeNull();
      expect(result?.valid).toBe(true);
    });

    it("returns valid:true for a minimal resource (only resourceType)", () => {
      const result = runValidate(VALID_MINIMAL_JSON);
      expect(result).not.toBeNull();
      expect(result?.valid).toBe(true);
    });
  });

  describe("invalid resource", () => {
    it("fails to parse when resourceType is missing (parse step)", () => {
      const result = runValidate(MISSING_RESOURCE_TYPE_JSON);
      // null signals parse failure — maps to exit(2) in CLI
      expect(result).toBeNull();
    });

    it("returns valid:false when resourceType is empty string", () => {
      const result = runValidate(EMPTY_RESOURCE_TYPE_JSON);
      expect(result).not.toBeNull();
      expect(result?.valid).toBe(false);
      if (result !== null && !result.valid) {
        expect(result.errors.length).toBeGreaterThan(0);
        const rtError = result.errors.find((e) => e.path === "resourceType");
        expect(rtError).toBeDefined();
      }
    });
  });

  describe("format output", () => {
    it("formats a valid result as text", () => {
      const parsed = parseJson(VALID_PATIENT_JSON);
      expect(parsed.success).toBe(true);
      if (!parsed.success) return;

      const result = validate(parsed.resource);
      const output = formatValidationText(result);
      expect(output).toBe("Valid");
    });

    it("formats an invalid result as text with error details", () => {
      const parsed = parseJson(EMPTY_RESOURCE_TYPE_JSON);
      expect(parsed.success).toBe(true);
      if (!parsed.success) return;

      const result = validate(parsed.resource);
      expect(result.valid).toBe(false);

      const output = formatValidationText(result);
      expect(output).toContain("resourceType");
    });

    it("formats a valid result as JSON with valid:true", () => {
      const parsed = parseJson(VALID_PATIENT_JSON);
      expect(parsed.success).toBe(true);
      if (!parsed.success) return;

      const result = validate(parsed.resource);
      const output = formatValidationJson(result);
      const json = JSON.parse(output) as unknown;
      expect((json as { valid?: unknown }).valid).toBe(true);
    });

    it("formats an invalid result as JSON with valid:false and errors array", () => {
      const parsed = parseJson(EMPTY_RESOURCE_TYPE_JSON);
      expect(parsed.success).toBe(true);
      if (!parsed.success) return;

      const result = validate(parsed.resource);
      const output = formatValidationJson(result);
      const json = JSON.parse(output) as unknown;
      expect((json as { valid?: unknown }).valid).toBe(false);
      expect(Array.isArray((json as { errors?: unknown }).errors)).toBe(true);
    });
  });

  describe("parse failures", () => {
    it("returns null (parse-failure signal) for malformed JSON", () => {
      const result = runValidate("{not valid json");
      expect(result).toBeNull();
    });

    it("returns null for JSON without resourceType", () => {
      const result = runValidate('{"id": "abc", "name": "No type"}');
      expect(result).toBeNull();
    });
  });
});
