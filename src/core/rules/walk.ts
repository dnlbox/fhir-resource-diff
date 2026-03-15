import type { FhirResource } from "@/core/types.js";

// JSON.parse() can produce objects with these as own enumerable keys.
// Skip them during traversal — they should never appear in real FHIR data.
const PROTOTYPE_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export type FieldVisitor = (
  path: string,
  key: string,
  value: unknown,
  parent: Record<string, unknown>,
) => void;

/** Walk every key-value pair in a FHIR resource tree, depth-first. */
export function walkResource(resource: FhirResource, visitor: FieldVisitor): void {
  walkObject(resource as Record<string, unknown>, "", visitor);
}

function walkObject(
  obj: Record<string, unknown>,
  prefix: string,
  visitor: FieldVisitor,
): void {
  for (const [key, value] of Object.entries(obj)) {
    if (PROTOTYPE_KEYS.has(key)) continue;
    if (value === null || value === undefined) continue;
    const path = prefix ? `${prefix}.${key}` : key;
    visitor(path, key, value, obj);
    if (Array.isArray(value)) {
      walkArray(value, path, visitor);
    } else if (typeof value === "object") {
      walkObject(value as Record<string, unknown>, path, visitor);
    }
  }
}

function walkArray(arr: unknown[], prefix: string, visitor: FieldVisitor): void {
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    if (item === null || item === undefined) continue;
    const path = `${prefix}[${i}]`;
    if (Array.isArray(item)) {
      walkArray(item, path, visitor);
    } else if (typeof item === "object") {
      walkObject(item as Record<string, unknown>, path, visitor);
    }
  }
}
