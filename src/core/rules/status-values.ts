import type { FhirResource, ValidationError } from "@/core/types.js";
import type { FhirVersion } from "@/core/fhir-version.js";
import type { ValidationRule } from "@/core/rules/index.js";
import { STATUS_VALUES } from "@/core/rules/data/status-value-defs.js";

const RULE_ID = "fhir-status-values";

/**
 * Reads the value(s) at a field path that may include the `[].code` suffix
 * pattern (used for CodeableConcept coding arrays).
 *
 * Supported path forms:
 *   - "status"                          → resource.status
 *   - "clinicalStatus.coding[].code"    → resource.clinicalStatus.coding[*].code
 */
function readFieldValues(
  resource: Record<string, unknown>,
  field: string,
): string[] {
  const CODING_ARRAY_PATTERN = /^(.+)\.coding\[\]\.code$/;
  const match = CODING_ARRAY_PATTERN.exec(field);

  if (match !== null) {
    const parentPath = match[1];
    if (parentPath === undefined) return [];
    const parent = resource[parentPath];
    if (parent === null || parent === undefined || typeof parent !== "object") {
      return [];
    }
    const codingArray = (parent as Record<string, unknown>)["coding"];
    if (!Array.isArray(codingArray)) return [];
    const codes: string[] = [];
    for (const entry of codingArray) {
      if (entry !== null && typeof entry === "object") {
        const code = (entry as Record<string, unknown>)["code"];
        if (typeof code === "string") codes.push(code);
      }
    }
    return codes;
  }

  // Simple field path (no dots for now — all our status fields are top-level)
  const value = resource[field];
  if (typeof value === "string") return [value];
  return [];
}

export const statusValuesRule: ValidationRule = {
  id: RULE_ID,
  description:
    "Status field values must match the FHIR-required value set for each resource type",

  check(resource: FhirResource, version?: FhirVersion): ValidationError[] {
    const defs = STATUS_VALUES[resource.resourceType];
    if (defs === undefined) return [];

    const findings: ValidationError[] = [];

    for (const def of defs) {
      // Select the applicable def for this version
      if (def.versions !== undefined && version !== undefined) {
        if (!(def.versions as readonly string[]).includes(version)) continue;
      }

      const values = readFieldValues(resource as Record<string, unknown>, def.field);

      // If field is absent, skip — required-fields rule handles that
      if (values.length === 0) continue;

      for (const actual of values) {
        if (!def.values.includes(actual)) {
          findings.push({
            path: def.field.replace(".coding[].code", ""),
            message: `Invalid value '${actual}' for ${resource.resourceType}.${def.field}. Expected one of: ${def.values.join(", ")}`,
            severity: "warning",
            ruleId: RULE_ID,
          });
        }
      }
    }

    return findings;
  },
};
