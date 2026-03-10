import type { FhirResource, ParseResult } from "./types.js";

/**
 * Narrows an unknown value to FhirResource if it has a string resourceType.
 * Useful for callers that already have a parsed JS object.
 */
export function isFhirResource(value: unknown): value is FhirResource {
  return (
    typeof value === "object" &&
    value !== null &&
    "resourceType" in value &&
    typeof (value as { resourceType: unknown }).resourceType === "string"
  );
}

/**
 * Parses a raw JSON string into a FhirResource.
 * Returns a discriminated union — always check `.success` before using `.resource`.
 * Does not validate FHIR shape beyond JSON well-formedness.
 */
export function parseJson(input: string): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input) as unknown;
  } catch (e) {
    const message = e instanceof SyntaxError ? e.message : "Invalid JSON";
    return { success: false, error: message };
  }

  if (!isFhirResource(parsed)) {
    return { success: false, error: "Missing or invalid resourceType" };
  }

  return { success: true, resource: parsed };
}
