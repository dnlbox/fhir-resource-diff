import type { FhirResource, ValidationError } from "@/core/types.js";
import type { FhirVersion } from "@/core/fhir-version.js";
import { fhirBaseUrl } from "@/core/fhir-version.js";
import type { ValidationRule } from "@/core/rules/index.js";
import { REQUIRED_FIELDS } from "@/core/rules/data/required-field-defs.js";

const RULE_ID = "fhir-required-fields";

/**
 * Resolves a dot-path against a resource object.
 * Returns the value at the path, or undefined if any segment is missing.
 */
function resolvePath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * Returns true if a field value is considered "present":
 * - Not null or undefined
 * - If an array, has at least one element
 */
function isPresent(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

export const requiredFieldsRule: ValidationRule = {
  id: RULE_ID,
  description:
    "Required fields for common FHIR resource types must be present (curated top ~20 types)",

  check(resource: FhirResource, version?: FhirVersion): ValidationError[] {
    const defs = REQUIRED_FIELDS[resource.resourceType];
    if (defs === undefined) return [];

    const findings: ValidationError[] = [];
    const docUrl = version
      ? `${fhirBaseUrl(version)}/${resource.resourceType.toLowerCase()}.html`
      : `https://hl7.org/fhir/${resource.resourceType.toLowerCase()}.html`;

    for (const def of defs) {
      // Skip if this field is only required for certain versions and version doesn't match
      if (def.versions !== undefined && version !== undefined) {
        if (!(def.versions as readonly string[]).includes(version)) continue;
      }
      // If versions are specified but we don't know the version, skip version-specific fields
      if (def.versions !== undefined && version === undefined) continue;

      const value = resolvePath(resource as Record<string, unknown>, def.field);
      if (!isPresent(value)) {
        findings.push({
          path: def.field,
          message: `Missing required field '${def.label}' for ${resource.resourceType}`,
          severity: "warning",
          ruleId: RULE_ID,
          docUrl,
        });
      }
    }

    return findings;
  },
};
