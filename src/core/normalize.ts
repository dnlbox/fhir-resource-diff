import type { FhirResource, NormalizeOptions } from "@/core/types.js";
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

function trimStringsDeep(value: unknown): unknown {
  if (typeof value === "string") {
    return value.trim();
  }
  if (Array.isArray(value)) {
    return value.map(trimStringsDeep);
  }
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>)) {
      if (PROTOTYPE_KEYS.has(key)) continue;
      result[key] = trimStringsDeep(
        (value as Record<string, unknown>)[key],
      );
    }
    return result;
  }
  return value;
}

function normalizeDatesDeep(value: unknown): unknown {
  if (typeof value === "string") {
    if (DATETIME_WITH_TIME_PATTERN.test(value)) {
      return new Date(value).toISOString();
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(normalizeDatesDeep);
  }
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>)) {
      if (PROTOTYPE_KEYS.has(key)) continue;
      result[key] = normalizeDatesDeep(
        (value as Record<string, unknown>)[key],
      );
    }
    return result;
  }
  return value;
}

function sortObjectKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortObjectKeysDeep);
  }
  if (value !== null && typeof value === "object") {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      if (PROTOTYPE_KEYS.has(key)) continue;
      sorted[key] = sortObjectKeysDeep(
        (value as Record<string, unknown>)[key],
      );
    }
    return sorted;
  }
  return value;
}

function sortArrayAtPaths(
  obj: Record<string, unknown>,
  paths: string[],
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
      setPath(obj, path, sorted);
    }
  }
}

/**
 * Returns a normalized deep copy of the resource.
 * Does not mutate the input — always returns a new object.
 */
export function normalize(
  resource: FhirResource,
  options: NormalizeOptions,
): FhirResource {
  let result: unknown = structuredClone(resource);

  if (options.trimStrings === true) {
    result = trimStringsDeep(result);
  }

  if (options.normalizeDates === true) {
    result = normalizeDatesDeep(result);
  }

  if (options.sortObjectKeys === true) {
    result = sortObjectKeysDeep(result);
  }

  if (
    options.sortArrayPaths !== undefined &&
    options.sortArrayPaths.length > 0
  ) {
    sortArrayAtPaths(result as Record<string, unknown>, options.sortArrayPaths);
  }

  return result as FhirResource;
}
