import { describe, it, expect } from "vitest";
import { diff } from "../../src/core/diff.js";
import { parseJson } from "../../src/core/parse.js";
import { formatText } from "../../src/formatters/text.js";
import { formatJson } from "../../src/formatters/json.js";
import { formatMarkdown } from "../../src/formatters/markdown.js";
import {
  getIgnorePreset,
  mergeIgnorePresets,
} from "../../src/presets/index.js";
import type { FhirResource, DiffOptions } from "../../src/core/types.js";

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
