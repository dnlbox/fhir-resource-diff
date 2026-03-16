import type { NormalizationPreset } from "@/core/types.js";

export const NORMALIZE_CANONICAL: NormalizationPreset = {
  name: "canonical",
  description:
    "Canonical form: alphabetically sort all object keys, trim string whitespace, normalize dates and datetimes to UTC ISO 8601. Use before comparing resources from different systems.",
  options: {
    sortObjectKeys: true,
    trimStrings: true,
    normalizeDates: true,
  },
};

export const NORMALIZE_NONE: NormalizationPreset = {
  name: "none",
  description:
    "Re-serialize only: parse the resource and output clean JSON without any transformations. Useful for pretty-printing or validating that a file is valid FHIR JSON.",
  options: {},
};
