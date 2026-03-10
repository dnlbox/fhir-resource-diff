import { describe, it, expect, vi, afterEach } from "vitest";
import { diff } from "@/core/diff.js";
import { parseJson } from "@/core/parse.js";
import { formatText } from "@/formatters/text.js";
import { formatJson } from "@/formatters/json.js";
import { formatMarkdown } from "@/formatters/markdown.js";
import {
  getIgnorePreset,
  mergeIgnorePresets,
} from "@/presets/index.js";
import {
  detectFhirVersion,
  resolveFhirVersion,
} from "@/core/fhir-version.js";
import { parseVersionFlag } from "@/cli/utils/resolve-version.js";
import type { FhirResource, DiffOptions } from "@/core/types.js";

// ---------------------------------------------------------------------------
// Inline test fixtures
// ---------------------------------------------------------------------------

const PATIENT_A_JSON = JSON.stringify({
  resourceType: "Patient",
  id: "patient-001",
  meta: {
    versionId: "1",
    lastUpdated: "2024-01-01T00:00:00Z",
  },
  name: [{ family: "Smith", given: ["John"] }],
  birthDate: "1980-05-15",
  active: true,
});

const PATIENT_R4_JSON = JSON.stringify({
  resourceType: "Patient",
  id: "patient-r4",
  meta: { fhirVersion: "4.0.1" },
  active: true,
});

const PATIENT_R5_JSON = JSON.stringify({
  resourceType: "Patient",
  id: "patient-r5",
  meta: { fhirVersion: "5.0.0" },
  active: true,
});

const PATIENT_B_JSON = JSON.stringify({
  resourceType: "Patient",
  id: "patient-001",
  meta: {
    versionId: "2",
    lastUpdated: "2024-06-01T00:00:00Z",
  },
  name: [{ family: "Smith", given: ["John"] }],
  birthDate: "1980-05-15",
  active: false,
});

const OBSERVATION_JSON = JSON.stringify({
  resourceType: "Observation",
  id: "obs-001",
  status: "final",
  code: { text: "Blood pressure" },
});

// ---------------------------------------------------------------------------
// Helpers that mirror compare command logic (without I/O)
// ---------------------------------------------------------------------------

function parseOrThrow(json: string): FhirResource {
  const result = parseJson(json);
  if (!result.success) {
    throw new Error(`Parse failed: ${result.error}`);
  }
  return result.resource;
}

function runCompare(
  jsonA: string,
  jsonB: string,
  options: DiffOptions = {},
): ReturnType<typeof diff> {
  const resourceA = parseOrThrow(jsonA);
  const resourceB = parseOrThrow(jsonB);
  return diff(resourceA, resourceB, options);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("compare command logic", () => {
  describe("basic diff", () => {
    it("produces identical result for two identical resources", () => {
      const result = runCompare(PATIENT_A_JSON, PATIENT_A_JSON);
      expect(result.identical).toBe(true);
      expect(result.entries).toHaveLength(0);
    });

    it("detects a changed field between two Patient resources", () => {
      const result = runCompare(PATIENT_A_JSON, PATIENT_B_JSON);
      expect(result.identical).toBe(false);

      const activeEntry = result.entries.find((e) => e.path === "active");
      expect(activeEntry).toBeDefined();
      expect(activeEntry?.kind).toBe("changed");
      expect(activeEntry?.left).toBe(true);
      expect(activeEntry?.right).toBe(false);
    });

    it("detects meta field differences", () => {
      const result = runCompare(PATIENT_A_JSON, PATIENT_B_JSON);
      const metaVersionId = result.entries.find(
        (e) => e.path === "meta.versionId",
      );
      expect(metaVersionId).toBeDefined();
      expect(metaVersionId?.kind).toBe("changed");
    });

    it("returns the correct resourceType in the result", () => {
      const result = runCompare(PATIENT_A_JSON, PATIENT_B_JSON);
      expect(result.resourceType).toBe("Patient");
    });
  });

  describe("--ignore flag (manual paths)", () => {
    it("excludes a specified field from the diff", () => {
      const options: DiffOptions = { ignorePaths: ["active"] };
      const result = runCompare(PATIENT_A_JSON, PATIENT_B_JSON, options);

      const activeEntry = result.entries.find((e) => e.path === "active");
      expect(activeEntry).toBeUndefined();
    });

    it("excludes multiple comma-separated paths (simulated)", () => {
      // Simulate CLI splitting comma-separated ignore paths
      const ignorePaths = "active,meta.versionId,meta.lastUpdated"
        .split(",")
        .map((p) => p.trim());
      const options: DiffOptions = { ignorePaths };
      const result = runCompare(PATIENT_A_JSON, PATIENT_B_JSON, options);

      expect(result.entries.find((e) => e.path === "active")).toBeUndefined();
      expect(
        result.entries.find((e) => e.path === "meta.versionId"),
      ).toBeUndefined();
      expect(
        result.entries.find((e) => e.path === "meta.lastUpdated"),
      ).toBeUndefined();
    });

    it("still reports other differences when some paths are ignored", () => {
      const options: DiffOptions = { ignorePaths: ["meta.versionId", "meta.lastUpdated"] };
      const result = runCompare(PATIENT_A_JSON, PATIENT_B_JSON, options);

      // active field difference should still be reported
      const activeEntry = result.entries.find((e) => e.path === "active");
      expect(activeEntry).toBeDefined();
    });
  });

  describe("--preset metadata", () => {
    it("ignores id, meta, and text fields when using metadata preset", () => {
      const preset = getIgnorePreset("metadata");
      expect(preset).toBeDefined();

      const options: DiffOptions = {
        ignorePaths: mergeIgnorePresets(preset!),
      };
      const result = runCompare(PATIENT_A_JSON, PATIENT_B_JSON, options);

      // meta.versionId and meta.lastUpdated should be ignored
      expect(
        result.entries.find((e) => e.path.startsWith("meta")),
      ).toBeUndefined();
    });

    it("still reports non-metadata differences with metadata preset", () => {
      const preset = getIgnorePreset("metadata");
      const options: DiffOptions = {
        ignorePaths: mergeIgnorePresets(preset!),
      };
      const result = runCompare(PATIENT_A_JSON, PATIENT_B_JSON, options);

      // active field is not in metadata preset, should still be reported
      const activeEntry = result.entries.find((e) => e.path === "active");
      expect(activeEntry).toBeDefined();
    });
  });

  describe("format output", () => {
    it("formats diff result as text", () => {
      const result = runCompare(PATIENT_A_JSON, PATIENT_B_JSON);
      const output = formatText(result);
      expect(output).toContain("ResourceType: Patient");
      expect(output).toContain("difference");
    });

    it("formats diff result as JSON", () => {
      const result = runCompare(PATIENT_A_JSON, PATIENT_B_JSON);
      const output = formatJson(result);
      const parsed = JSON.parse(output) as unknown;
      expect(typeof parsed).toBe("object");
      expect(parsed).not.toBeNull();
      expect((parsed as { resourceType?: unknown }).resourceType).toBe("Patient");
    });

    it("formats diff result as markdown", () => {
      const result = runCompare(PATIENT_A_JSON, PATIENT_B_JSON);
      const output = formatMarkdown(result);
      expect(output).toContain("## Diff: Patient");
      expect(output).toContain("|");
    });

    it("formats identical resources with 'identical' status in text", () => {
      const result = runCompare(PATIENT_A_JSON, PATIENT_A_JSON);
      const output = formatText(result);
      expect(output).toContain("Status: identical");
    });
  });

  describe("cross-resourceType comparison", () => {
    it("compares resources of different types", () => {
      const result = runCompare(PATIENT_A_JSON, OBSERVATION_JSON);
      expect(result.identical).toBe(false);
      const resourceTypeEntry = result.entries.find(
        (e) => e.path === "resourceType",
      );
      expect(resourceTypeEntry).toBeDefined();
      expect(resourceTypeEntry?.kind).toBe("changed");
    });
  });
});

// ---------------------------------------------------------------------------
// --fhir-version flag logic
// ---------------------------------------------------------------------------

describe("--fhir-version flag (parseVersionFlag)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns undefined when flag is not provided", () => {
    const result = parseVersionFlag(undefined);
    expect(result).toBeUndefined();
  });

  it("returns FhirVersion for R4", () => {
    const result = parseVersionFlag("R4");
    expect(result).toBe("R4");
  });

  it("returns FhirVersion for R4B", () => {
    const result = parseVersionFlag("R4B");
    expect(result).toBe("R4B");
  });

  it("returns FhirVersion for R5", () => {
    const result = parseVersionFlag("R5");
    expect(result).toBe("R5");
  });

  it("writes error to stderr and exits with code 2 for an invalid version", () => {
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

  it("rejects lowercase versions (case-sensitive)", () => {
    const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((_code) => {
      throw new Error("process.exit called");
    });

    expect(() => parseVersionFlag("r4")).toThrow("process.exit called");
    expect(stderrSpy).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(2);
  });
});

describe("--fhir-version flag (version detection in compare)", () => {
  it("auto-detects R4 from meta.fhirVersion 4.0.1", () => {
    const resource = parseOrThrow(PATIENT_R4_JSON);
    const detected = detectFhirVersion(resource);
    expect(detected).toBe("R4");
  });

  it("auto-detects R5 from meta.fhirVersion 5.0.0", () => {
    const resource = parseOrThrow(PATIENT_R5_JSON);
    const detected = detectFhirVersion(resource);
    expect(detected).toBe("R5");
  });

  it("falls back to R4 default when meta.fhirVersion is absent", () => {
    const resource = parseOrThrow(PATIENT_A_JSON);
    const resolved = resolveFhirVersion(undefined, resource);
    expect(resolved).toBe("R4");
  });

  it("uses explicit version even when meta.fhirVersion is present", () => {
    const resource = parseOrThrow(PATIENT_R4_JSON);
    const resolved = resolveFhirVersion("R5", resource);
    expect(resolved).toBe("R5");
  });

  it("emits a warning when two resources have different detected versions", () => {
    const resourceA = parseOrThrow(PATIENT_R4_JSON);
    const resourceB = parseOrThrow(PATIENT_R5_JSON);

    const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

    // Simulate compare command warning logic
    const explicitVersion = undefined;
    const detectedA = detectFhirVersion(resourceA);
    const detectedB = detectFhirVersion(resourceB);
    if (explicitVersion === undefined && detectedA !== undefined && detectedB !== undefined && detectedA !== detectedB) {
      process.stderr.write(
        `Warning: resources appear to be from different FHIR versions (${detectedA} vs ${detectedB})\n`,
      );
    }

    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringContaining("different FHIR versions"),
    );
    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringContaining("R4 vs R5"),
    );

    vi.restoreAllMocks();
  });

  it("does not emit a warning when both resources have the same detected version", () => {
    const resourceA = parseOrThrow(PATIENT_R4_JSON);
    const resourceB = parseOrThrow(PATIENT_R4_JSON);

    const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

    const explicitVersion = undefined;
    const detectedA = detectFhirVersion(resourceA);
    const detectedB = detectFhirVersion(resourceB);
    if (explicitVersion === undefined && detectedA !== undefined && detectedB !== undefined && detectedA !== detectedB) {
      process.stderr.write(
        `Warning: resources appear to be from different FHIR versions (${detectedA} vs ${detectedB})\n`,
      );
    }

    expect(stderrSpy).not.toHaveBeenCalled();

    vi.restoreAllMocks();
  });
});
