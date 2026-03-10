import { describe, it, expect } from "vitest";
import {
  IGNORE_METADATA,
  IGNORE_CLINICAL,
  IGNORE_STRICT,
  getIgnorePreset,
  mergeIgnorePresets,
} from "../../src/presets/index.js";

describe("getIgnorePreset", () => {
  it('returns IGNORE_METADATA for "metadata"', () => {
    expect(getIgnorePreset("metadata")).toBe(IGNORE_METADATA);
  });

  it('returns IGNORE_CLINICAL for "clinical"', () => {
    expect(getIgnorePreset("clinical")).toBe(IGNORE_CLINICAL);
  });

  it('returns IGNORE_STRICT for "strict"', () => {
    expect(getIgnorePreset("strict")).toBe(IGNORE_STRICT);
  });

  it("returns undefined for unknown preset name", () => {
    expect(getIgnorePreset("unknown")).toBeUndefined();
  });

  it("is case-sensitive (uppercase returns undefined)", () => {
    expect(getIgnorePreset("Metadata")).toBeUndefined();
    expect(getIgnorePreset("METADATA")).toBeUndefined();
  });
});

describe("mergeIgnorePresets", () => {
  it("combines paths from multiple presets and deduplicates", () => {
    const merged = mergeIgnorePresets(IGNORE_METADATA, IGNORE_CLINICAL);
    // IGNORE_METADATA paths: ["id", "meta", "text"]
    // IGNORE_CLINICAL paths: ["id", "meta", "text", "extension", "modifierExtension"]
    // Merged and deduplicated should contain all five unique paths
    expect(merged).toHaveLength(5);
    expect(merged).toContain("id");
    expect(merged).toContain("meta");
    expect(merged).toContain("text");
    expect(merged).toContain("extension");
    expect(merged).toContain("modifierExtension");
  });

  it("returns an empty array when merging only the strict preset", () => {
    const merged = mergeIgnorePresets(IGNORE_STRICT);
    expect(merged).toEqual([]);
  });

  it("returns all paths for a single preset without modification", () => {
    const merged = mergeIgnorePresets(IGNORE_METADATA);
    expect(merged).toHaveLength(3);
    expect(merged).toContain("id");
    expect(merged).toContain("meta");
    expect(merged).toContain("text");
  });

  it("deduplicates paths that appear in both presets", () => {
    const merged = mergeIgnorePresets(IGNORE_METADATA, IGNORE_METADATA);
    // Duplicate preset — still only three unique paths
    expect(merged).toHaveLength(3);
  });
});

describe("preset object shapes", () => {
  it("IGNORE_METADATA has required fields", () => {
    expect(IGNORE_METADATA).toHaveProperty("name", "metadata");
    expect(IGNORE_METADATA).toHaveProperty("description");
    expect(IGNORE_METADATA).toHaveProperty("paths");
    expect(Array.isArray(IGNORE_METADATA.paths)).toBe(true);
  });

  it("IGNORE_CLINICAL has required fields", () => {
    expect(IGNORE_CLINICAL).toHaveProperty("name", "clinical");
    expect(IGNORE_CLINICAL).toHaveProperty("description");
    expect(IGNORE_CLINICAL).toHaveProperty("paths");
    expect(Array.isArray(IGNORE_CLINICAL.paths)).toBe(true);
  });

  it("IGNORE_STRICT has required fields", () => {
    expect(IGNORE_STRICT).toHaveProperty("name", "strict");
    expect(IGNORE_STRICT).toHaveProperty("description");
    expect(IGNORE_STRICT).toHaveProperty("paths");
    expect(Array.isArray(IGNORE_STRICT.paths)).toBe(true);
    expect(IGNORE_STRICT.paths).toHaveLength(0);
  });
});
