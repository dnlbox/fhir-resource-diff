import type { DiffChangeKind } from "./types.js";

/**
 * Determines the kind of change between two values at a given path.
 * Pure function — does not recurse; the diff engine calls it per leaf node.
 */
export function classifyChange(left: unknown, right: unknown): DiffChangeKind {
  if (left === undefined) {
    return "added";
  }
  if (right === undefined) {
    return "removed";
  }
  if (typeof left !== typeof right) {
    return "type-changed";
  }
  return "changed";
}
