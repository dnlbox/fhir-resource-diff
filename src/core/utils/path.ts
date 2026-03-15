/**
 * Safe nested property access for plain objects.
 *
 * Both functions only traverse own properties — they never follow inherited
 * prototype chain entries. This means a crafted path like "__proto__.polluted"
 * simply returns undefined / does nothing, because the traversal stops as soon
 * as a segment is not an own property of the current object.
 *
 * This is conceptually similar to lodash _.get / _.set, but intentionally
 * minimal and scoped to the needs of this library.
 */

/** JSON keys that, if written via bracket notation, modify Object.prototype. */
const PROTOTYPE_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/**
 * Read a value at a dot-notation path from a plain object.
 * Returns `undefined` if any segment is missing or is not an own property.
 *
 * @example
 * getPath({ meta: { lastUpdated: "2024-01-01" } }, "meta.lastUpdated")
 * // → "2024-01-01"
 */
export function getPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (
      current === null ||
      typeof current !== "object" ||
      Array.isArray(current) ||
      !Object.prototype.hasOwnProperty.call(current, part)
    ) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Write a value at a dot-notation path in a plain object.
 * Silently does nothing if any intermediate segment is missing, is not an own
 * property, or is a reserved prototype key.
 *
 * @example
 * const obj = { items: [3, 1, 2] };
 * setPath(obj, "items", [1, 2, 3]);
 */
export function setPath(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): void {
  const parts = path.split(".");
  let current: unknown = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (
      part === undefined ||
      PROTOTYPE_KEYS.has(part) ||
      current === null ||
      typeof current !== "object" ||
      Array.isArray(current) ||
      !Object.prototype.hasOwnProperty.call(current, part)
    ) {
      return;
    }
    current = (current as Record<string, unknown>)[part];
  }

  const lastPart = parts[parts.length - 1];
  if (
    lastPart !== undefined &&
    !PROTOTYPE_KEYS.has(lastPart) &&
    current !== null &&
    typeof current === "object" &&
    !Array.isArray(current)
  ) {
    (current as Record<string, unknown>)[lastPart] = value;
  }
}
