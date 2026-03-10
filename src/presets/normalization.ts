import type { NormalizationPreset } from "@/core/types.js";

export const NORMALIZE_CANONICAL: NormalizationPreset = {
  name: "canonical",
  description: "Sort keys, trim strings, normalize dates — maximally comparable form",
  options: {
    sortObjectKeys: true,
    trimStrings: true,
    normalizeDates: true,
  },
};

export const NORMALIZE_NONE: NormalizationPreset = {
  name: "none",
  description: "No normalization — compare exact values",
  options: {},
};
