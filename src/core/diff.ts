import type { FhirResource, DiffEntry, DiffResult, DiffOptions } from "./types.js";
import { classifyChange } from "./classify.js";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function shouldIgnorePath(path: string, ignorePaths: string[]): boolean {
  for (const ignorePath of ignorePaths) {
    if (ignorePath === path) {
      return true;
    }
    if (ignorePath.endsWith(".*")) {
      const prefix = ignorePath.slice(0, -2);
      // Match direct children: path starts with prefix + "." and has no further "." or "[" after
      if (path.startsWith(prefix + ".")) {
        const rest = path.slice(prefix.length + 1);
        if (!rest.includes(".") && !rest.includes("[")) {
          return true;
        }
      }
    }
  }
  return false;
}

function walkNodes(
  left: unknown,
  right: unknown,
  path: string,
  ignorePaths: string[],
  entries: DiffEntry[],
): void {
  if (shouldIgnorePath(path, ignorePaths)) {
    return;
  }

  // Normalise: treat undefined as {} or [] when the other side is an object/array,
  // so that we recurse into the present side and emit leaf-level entries.
  const leftObj: unknown = left === undefined && isPlainObject(right) ? {} : left;
  const rightObj: unknown = right === undefined && isPlainObject(left) ? {} : right;
  const leftArr: unknown = left === undefined && Array.isArray(right) ? [] : leftObj;
  const rightArr: unknown = right === undefined && Array.isArray(left) ? [] : rightObj;

  if (isPlainObject(leftArr) && isPlainObject(rightArr)) {
    const allKeys = Array.from(
      new Set([...Object.keys(leftArr), ...Object.keys(rightArr)]),
    ).sort();

    for (const key of allKeys) {
      const childPath = path === "" ? key : `${path}.${key}`;
      walkNodes(leftArr[key], rightArr[key], childPath, ignorePaths, entries);
    }
    return;
  }

  if (Array.isArray(leftArr) && Array.isArray(rightArr)) {
    const maxLen = Math.max(leftArr.length, rightArr.length);
    for (let i = 0; i < maxLen; i++) {
      const childPath = `${path}[${i}]`;
      walkNodes(leftArr[i], rightArr[i], childPath, ignorePaths, entries);
    }
    return;
  }

  // At least one side is a primitive, undefined, or mismatched type
  if (left === undefined && right === undefined) {
    return;
  }

  if (left === right) {
    return;
  }

  // Types differ between object/array/primitive — emit type-changed without recursing
  const kind = classifyChange(left, right);
  const entry: DiffEntry = { kind, path };
  if (left !== undefined) {
    entry.left = left;
  }
  if (right !== undefined) {
    entry.right = right;
  }
  entries.push(entry);
}

/**
 * Compares two FHIR resources and returns a structured DiffResult.
 * Pure function — no I/O, no side effects.
 */
export function diff(
  left: FhirResource,
  right: FhirResource,
  options?: DiffOptions,
): DiffResult {
  const ignorePaths = options?.ignorePaths ?? [];
  const entries: DiffEntry[] = [];

  const allKeys = Array.from(
    new Set([...Object.keys(left), ...Object.keys(right)]),
  ).sort();

  for (const key of allKeys) {
    walkNodes(
      left[key as keyof FhirResource],
      right[key as keyof FhirResource],
      key,
      ignorePaths,
      entries,
    );
  }

  return {
    resourceType: left.resourceType,
    identical: entries.length === 0,
    entries,
  };
}
