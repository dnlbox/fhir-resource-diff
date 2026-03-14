import type { FhirResource, ValidationError } from "@/core/types.js";
import type { FhirVersion } from "@/core/fhir-version.js";

/**
 * A validation rule that inspects a parsed FHIR resource and returns
 * zero or more validation findings (warnings/info).
 */
export interface ValidationRule {
  /** Unique rule identifier, e.g. "fhir-id-format". */
  id: string;
  /** Human-readable short description. */
  description: string;
  /** Run the rule against a resource. Returns findings (empty = pass). */
  check(resource: FhirResource, version?: FhirVersion): ValidationError[];
}

export { walkResource } from "@/core/rules/walk.js";

import { idFormatRule } from "@/core/rules/id-format.js";
import { dateFormatRule } from "@/core/rules/date-format.js";
import { referenceFormatRule } from "@/core/rules/reference-format.js";

/** Format and pattern rules — always run, no version required. */
export const FORMAT_RULES: readonly ValidationRule[] = [
  idFormatRule,
  dateFormatRule,
  referenceFormatRule,
];

/** Run a set of rules against a resource and collect all findings. */
export function runRules(
  resource: FhirResource,
  rules: readonly ValidationRule[],
  version?: FhirVersion,
): ValidationError[] {
  const findings: ValidationError[] = [];
  for (const rule of rules) {
    findings.push(...rule.check(resource, version));
  }
  return findings;
}
