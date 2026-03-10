import type { IgnorePreset, NormalizationPreset } from "../core/types.js";
export { IGNORE_METADATA, IGNORE_CLINICAL, IGNORE_STRICT } from "./ignore-fields.js";
export { NORMALIZE_CANONICAL, NORMALIZE_NONE } from "./normalization.js";

import { IGNORE_METADATA, IGNORE_CLINICAL, IGNORE_STRICT } from "./ignore-fields.js";
import { NORMALIZE_CANONICAL, NORMALIZE_NONE } from "./normalization.js";

const IGNORE_PRESETS: Record<string, IgnorePreset> = {
  [IGNORE_METADATA.name]: IGNORE_METADATA,
  [IGNORE_CLINICAL.name]: IGNORE_CLINICAL,
  [IGNORE_STRICT.name]: IGNORE_STRICT,
};

const NORMALIZATION_PRESETS: Record<string, NormalizationPreset> = {
  [NORMALIZE_CANONICAL.name]: NORMALIZE_CANONICAL,
  [NORMALIZE_NONE.name]: NORMALIZE_NONE,
};

/**
 * Look up an ignore preset by name. Returns undefined if not found.
 */
export function getIgnorePreset(name: string): IgnorePreset | undefined {
  return IGNORE_PRESETS[name];
}

/**
 * Look up a normalization preset by name. Returns undefined if not found.
 */
export function getNormalizationPreset(name: string): NormalizationPreset | undefined {
  return NORMALIZATION_PRESETS[name];
}

/**
 * Merge multiple ignore presets into a single deduplicated path list.
 */
export function mergeIgnorePresets(...presets: IgnorePreset[]): string[] {
  const seen = new Set<string>();
  for (const preset of presets) {
    for (const path of preset.paths) {
      seen.add(path);
    }
  }
  return Array.from(seen);
}
