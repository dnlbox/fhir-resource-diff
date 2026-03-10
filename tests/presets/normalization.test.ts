import { describe, it, expect } from "vitest";
import {
  NORMALIZE_CANONICAL,
  NORMALIZE_NONE,
  getNormalizationPreset,
} from "@/presets/index.js";

describe("getNormalizationPreset", () => {
  it('returns NORMALIZE_CANONICAL for "canonical"', () => {
    expect(getNormalizationPreset("canonical")).toBe(NORMALIZE_CANONICAL);
  });

  it('returns NORMALIZE_NONE for "none"', () => {
    expect(getNormalizationPreset("none")).toBe(NORMALIZE_NONE);
  });

  it("returns undefined for unknown preset name", () => {
    expect(getNormalizationPreset("unknown")).toBeUndefined();
  });

  it("is case-sensitive (uppercase returns undefined)", () => {
    expect(getNormalizationPreset("Canonical")).toBeUndefined();
    expect(getNormalizationPreset("CANONICAL")).toBeUndefined();
  });
});

describe("preset object shapes", () => {
  it("NORMALIZE_CANONICAL has required fields and correct options", () => {
    expect(NORMALIZE_CANONICAL).toHaveProperty("name", "canonical");
    expect(NORMALIZE_CANONICAL).toHaveProperty("description");
    expect(NORMALIZE_CANONICAL).toHaveProperty("options");
    expect(NORMALIZE_CANONICAL.options.sortObjectKeys).toBe(true);
    expect(NORMALIZE_CANONICAL.options.trimStrings).toBe(true);
    expect(NORMALIZE_CANONICAL.options.normalizeDates).toBe(true);
  });

  it("NORMALIZE_NONE has required fields and empty options", () => {
    expect(NORMALIZE_NONE).toHaveProperty("name", "none");
    expect(NORMALIZE_NONE).toHaveProperty("description");
    expect(NORMALIZE_NONE).toHaveProperty("options");
    expect(NORMALIZE_NONE.options).toEqual({});
  });
});
