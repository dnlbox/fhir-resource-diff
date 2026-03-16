import type { FhirResource, NormalizeOptions, NormalizeResult, NormalizeStats } from "@/core/types.js";
import { getPath, setPath } from "@/core/utils/path.js";

// structuredClone is available in Node 17+ and modern browsers.
// Declared here because the project's tsconfig lib target (ES2022) does not
// include it — adding the declaration keeps the code browser-safe and avoids
// modifying shared project configuration.
declare function structuredClone<T>(value: T): T;

/**
 * Matches ISO 8601 datetime strings that include a time component and a timezone offset.
 * Examples: "2024-01-01T00:00:00+05:00", "2024-01-01T12:30:00-08:00", "2024-01-01T00:00:00Z"
 * Does NOT match plain date strings like "2024-01-01".
 */
const DATETIME_WITH_TIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

/**
 * Keys that JSON.parse() can produce as own enumerable properties but that,
 * when written via bracket notation to a plain object, modify Object.prototype.
 * Unlike regular object traversal (where hasOwnProperty guards are sufficient),
 * deep-copy functions build new objects via `result[key] = ...` where `result`
 * is freshly created — so every key from the source must be checked.
 */
const PROTOTYPE_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function trimStringsDeep(value: unknown, stats: NormalizeStats): unknown {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed !== value) stats.stringsTrimmed++;
    return trimmed;
  }
  if (Array.isArray(value)) {
    return value.map((item) => trimStringsDeep(item, stats));
  }
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>)) {
      if (PROTOTYPE_KEYS.has(key)) continue;
      result[key] = trimStringsDeep(
        (value as Record<string, unknown>)[key],
        stats,
      );
    }
    return result;
  }
  return value;
}

function normalizeDatesDeep(value: unknown, stats: NormalizeStats): unknown {
  if (typeof value === "string") {
    if (DATETIME_WITH_TIME_PATTERN.test(value)) {
      const normalized = new Date(value).toISOString();
      if (normalized !== value) stats.datesNormalized++;
      return normalized;
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => normalizeDatesDeep(item, stats));
  }
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>)) {
      if (PROTOTYPE_KEYS.has(key)) continue;
      result[key] = normalizeDatesDeep(
        (value as Record<string, unknown>)[key],
        stats,
      );
    }
    return result;
  }
  return value;
}

function sortObjectKeysDeep(value: unknown, stats: NormalizeStats): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortObjectKeysDeep(item, stats));
  }
  if (value !== null && typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>);
    const sortedKeys = [...keys].sort();
    const sorted: Record<string, unknown> = {};
    for (let i = 0; i < keys.length; i++) {
      if (keys[i] !== sortedKeys[i]) stats.keysSorted++;
    }
    for (const key of sortedKeys) {
      if (PROTOTYPE_KEYS.has(key)) continue;
      sorted[key] = sortObjectKeysDeep(
        (value as Record<string, unknown>)[key],
        stats,
      );
    }
    return sorted;
  }
  return value;
}

function sortArrayAtPaths(
  obj: Record<string, unknown>,
  paths: string[],
  stats: NormalizeStats,
): void {
  for (const path of paths) {
    const arr = getPath(obj, path);
    if (Array.isArray(arr)) {
      const sorted = [...(arr as unknown[])].sort((a, b) => {
        const aStr = JSON.stringify(a);
        const bStr = JSON.stringify(b);
        if (aStr < bStr) return -1;
        if (aStr > bStr) return 1;
        return 0;
      });
      const changed = (arr as unknown[]).some(
        (item, i) => JSON.stringify(item) !== JSON.stringify(sorted[i]),
      );
      if (changed) stats.arraysSorted++;
      setPath(obj, path, sorted);
    }
  }
}

/**
 * Returns a normalized deep copy of the resource alongside normalization stats.
 * Does not mutate the input — always returns a new object.
 */
export function normalize(
  resource: FhirResource,
  options: NormalizeOptions,
): NormalizeResult {
  let result: unknown = structuredClone(resource);
  const stats: NormalizeStats = {
    keysSorted: 0,
    stringsTrimmed: 0,
    datesNormalized: 0,
    arraysSorted: 0,
  };

  if (options.trimStrings === true) {
    result = trimStringsDeep(result, stats);
  }

  if (options.normalizeDates === true) {
    result = normalizeDatesDeep(result, stats);
  }

  if (options.sortObjectKeys === true) {
    result = sortObjectKeysDeep(result, stats);
  }

  if (
    options.sortArrayPaths !== undefined &&
    options.sortArrayPaths.length > 0
  ) {
    sortArrayAtPaths(result as Record<string, unknown>, options.sortArrayPaths, stats);
  }

  return { resource: result as FhirResource, stats };
}
