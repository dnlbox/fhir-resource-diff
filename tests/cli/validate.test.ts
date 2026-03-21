import { describe, it, expect, vi, afterEach } from "vitest";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { parseJson } from "@/core/parse.js";
import { validate } from "@/core/validate.js";
import { formatValidationText } from "@/formatters/text.js";
import { formatValidationJson } from "@/formatters/json.js";
import { parseVersionFlag } from "@/cli/utils/resolve-version.js";
import { unwrapAnnotateWrapper } from "@/cli/utils/parse-multi-resource.js";

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
      expect(output).toBe("valid");
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

// ---------------------------------------------------------------------------
// Spec 46 — validate multi-resource file path support (CLI integration)
// ---------------------------------------------------------------------------

describe("validate — multi-resource file path support (spec 46)", () => {
  const fixturesDir = join(import.meta.dirname, "../fixtures");

  it("validates a JSON array file by path", () => {
    const result = runCli(["validate", join(fixturesDir, "patients-array.json")]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("[1/3]");
    expect(result.stdout).toContain("[2/3]");
    expect(result.stdout).toContain("[3/3]");
    expect(result.stdout).toContain("3 resources: 3 valid, 0 invalid");
  });

  it("validates an NDJSON file by path", () => {
    const result = runCli(["validate", join(fixturesDir, "patients.ndjson")]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("[1/3]");
    expect(result.stdout).toContain("[3/3]");
    expect(result.stdout).toContain("3 resources: 3 valid, 0 invalid");
  });

  it("validates a single resource file by path unchanged", () => {
    const result = runCli(["validate", join(fixturesDir, "patient-minimal.json")]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("valid");
    expect(result.stdout).not.toContain("[1/");
  });

  it("produces JSON output for array file with --format json", () => {
    const result = runCli(["validate", join(fixturesDir, "patients-array.json"), "--format", "json"]);
    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout) as unknown[];
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// Spec 30 — annotate wrapper detection (unit tests)
// ---------------------------------------------------------------------------

describe("unwrapAnnotateWrapper", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null for a plain FHIR resource", () => {
    const raw = JSON.stringify({ resourceType: "Patient", id: "p1" });
    const result = unwrapAnnotateWrapper(raw);
    expect(result).toBeNull();
  });

  it("returns null for a JSON array", () => {
    const raw = JSON.stringify([{ resourceType: "Patient", id: "p1" }]);
    const result = unwrapAnnotateWrapper(raw);
    expect(result).toBeNull();
  });

  it("returns null for an object that is not a wrapper (extra keys)", () => {
    const raw = JSON.stringify({
      resource: { resourceType: "Patient", id: "p1" },
      notes: [],
      extra: true,
    });
    const result = unwrapAnnotateWrapper(raw);
    expect(result).toBeNull();
  });

  it("returns null when notes is not an array", () => {
    const raw = JSON.stringify({
      resource: { resourceType: "Patient", id: "p1" },
      notes: "not-an-array",
    });
    const result = unwrapAnnotateWrapper(raw);
    expect(result).toBeNull();
  });

  it("detects a valid annotate wrapper and emits a stderr notice", () => {
    const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const raw = JSON.stringify({
      resource: { resourceType: "Patient", id: "p1" },
      notes: [],
    });
    const result = unwrapAnnotateWrapper(raw);
    expect(result).not.toBeNull();
    expect(result?.resourceType).toBe("Patient");
    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringContaining("detected --annotate wrapper"),
    );
  });

  it("returns the inner resource from the wrapper", () => {
    vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const raw = JSON.stringify({
      resource: { resourceType: "Observation", id: "obs-1", status: "final" },
      notes: [{ key: "test" }],
    });
    const result = unwrapAnnotateWrapper(raw);
    expect(result?.resourceType).toBe("Observation");
    expect(result?.id).toBe("obs-1");
  });
});

// ---------------------------------------------------------------------------
// Spec 30 — annotate wrapper detection (CLI integration)
// ---------------------------------------------------------------------------

const cwd = join(import.meta.dirname, "../..");

function runCli(args: string[], input?: string) {
  return spawnSync("node", ["--import", "tsx/esm", "src/cli/index.ts", ...args], {
    cwd,
    input,
    encoding: "utf-8",
    env: { ...process.env },
  });
}

describe("validate - annotate wrapper detection (spec 30)", () => {
  it("validates the inner resource from an annotate wrapper via stdin", () => {
    const input = JSON.stringify({
      resource: { resourceType: "Patient", id: "p1" },
      notes: [],
    });
    const result = runCli(["validate", "-"], input);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("valid");
    expect(result.stderr).toContain("detected --annotate wrapper");
  });

  it("validates the inner resource even with notes present", () => {
    const input = JSON.stringify({
      resource: { resourceType: "Observation", id: "obs-1", status: "final" },
      notes: [{ generatedAt: "2025-01-01", tags: ["fhir"] }],
    });
    const result = runCli(["validate", "-"], input);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("valid");
    expect(result.stderr).toContain("detected --annotate wrapper");
  });

  it("does NOT treat a plain FHIR resource as an annotate wrapper", () => {
    const input = JSON.stringify({ resourceType: "Patient", id: "p1" });
    const result = runCli(["validate", "-"], input);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("valid");
    expect(result.stderr).not.toContain("detected --annotate wrapper");
  });
});

// ---------------------------------------------------------------------------
// --fhir-version flag logic (validate command)
// ---------------------------------------------------------------------------

describe("--fhir-version flag (validate command)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("accepts R4 without error", () => {
    const result = parseVersionFlag("R4");
    expect(result).toBe("R4");
  });

  it("accepts R4B without error", () => {
    const result = parseVersionFlag("R4B");
    expect(result).toBe("R4B");
  });

  it("accepts R5 without error", () => {
    const result = parseVersionFlag("R5");
    expect(result).toBe("R5");
  });

  it("writes error to stderr and exits with code 2 for INVALID version", () => {
    const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((_code) => {
      throw new Error("process.exit called");
    });

    expect(() => parseVersionFlag("INVALID")).toThrow("process.exit called");
    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringContaining('Unknown FHIR version "INVALID"'),
    );
    expect(exitSpy).toHaveBeenCalledWith(2);
  });
});
