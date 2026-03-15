import type { FhirResource, ValidationError } from "@/core/types.js";
import type { FhirVersion } from "@/core/fhir-version.js";
import type { ValidationRule } from "@/core/rules/index.js";
import { walkResource } from "@/core/rules/walk.js";

const RULE_ID = "fhir-codeable-concept";

const URI_PREFIXES = ["http://", "https://", "urn:"] as const;

/** Resource fields that should be CodeableConcepts (not plain strings). */
const KNOWN_CODEABLE_CONCEPT_FIELDS: Record<string, readonly string[]> = {
  Observation: ["code", "valueCodeableConcept", "category"],
  Condition: ["code", "clinicalStatus", "verificationStatus", "category", "severity"],
  Procedure: ["code", "category"],
  MedicationRequest: ["medicationCodeableConcept"],
  DiagnosticReport: ["code", "category"],
  AllergyIntolerance: ["code", "clinicalStatus", "verificationStatus", "type", "category"],
  Immunization: ["vaccineCode"],
  ServiceRequest: ["code", "category"],
};

function isValidUri(value: string): boolean {
  return URI_PREFIXES.some((prefix) => value.startsWith(prefix));
}

function checkCodingEntry(
  coding: Record<string, unknown>,
  path: string,
  findings: ValidationError[],
): void {
  const hasSystem = "system" in coding;
  const hasCode = "code" in coding;

  if (hasSystem && !hasCode) {
    findings.push({
      path,
      message: `Coding at '${path}' has 'system' but is missing 'code'`,
      severity: "warning",
      ruleId: RULE_ID,
    });
    return;
  }

  if (hasCode && !hasSystem) {
    findings.push({
      path,
      message: `Coding at '${path}' has 'code' but is missing 'system'`,
      severity: "warning",
      ruleId: RULE_ID,
    });
    return;
  }

  if (!hasSystem && !hasCode) return;

  // Both present — validate URI format and non-empty code
  const systemVal = coding["system"];
  const codeVal = coding["code"];

  if (typeof systemVal === "string" && !isValidUri(systemVal)) {
    findings.push({
      path: `${path}.system`,
      message: `Coding 'system' should be a URI starting with http://, https://, or urn: — got '${systemVal}'`,
      severity: "warning",
      ruleId: RULE_ID,
    });
  }

  if (typeof codeVal === "string" && codeVal.trim() === "") {
    findings.push({
      path: `${path}.code`,
      message: `Coding 'code' must be a non-empty string`,
      severity: "warning",
      ruleId: RULE_ID,
    });
  }
}

export const codeableConceptRule: ValidationRule = {
  id: RULE_ID,
  description:
    "Coding and CodeableConcept objects must have correct shape; known CodeableConcept fields must not be plain strings",

  check(resource: FhirResource, _version?: FhirVersion): ValidationError[] {
    const findings: ValidationError[] = [];

    // Check 1: Top-level known CodeableConcept fields must not be plain strings
    const knownFields = KNOWN_CODEABLE_CONCEPT_FIELDS[resource.resourceType];
    if (knownFields !== undefined) {
      for (const field of knownFields) {
        const value = (resource as Record<string, unknown>)[field];
        if (typeof value === "string") {
          findings.push({
            path: field,
            message: `'${field}' should be a CodeableConcept object, not a plain string`,
            severity: "warning",
            ruleId: RULE_ID,
          });
        }
      }
    }

    // Check 2 & 3: Walk the resource tree looking for "coding" array keys.
    // When found, inspect the parent (CodeableConcept) and each Coding element.
    walkResource(resource, (path, key, value, parent) => {
      if (key !== "coding") return;

      // The parent is the CodeableConcept object — path is the CC path
      // `path` here is the path to the "coding" field itself, e.g. "code.coding"
      const ccPath = path.endsWith(".coding")
        ? path.slice(0, -".coding".length)
        : path;

      if (!Array.isArray(value)) {
        findings.push({
          path,
          message: `'coding' must be an array`,
          severity: "warning",
          ruleId: RULE_ID,
        });
        return;
      }

      // Empty coding array with no text on parent
      if (value.length === 0 && typeof parent["text"] !== "string") {
        findings.push({
          path: ccPath,
          message: `CodeableConcept has empty 'coding' array and no 'text' — it carries no meaning`,
          severity: "warning",
          ruleId: RULE_ID,
        });
        return;
      }

      // Check each Coding entry
      for (let i = 0; i < value.length; i++) {
        const entry: unknown = value[i];
        if (entry === null || typeof entry !== "object" || Array.isArray(entry)) continue;
        checkCodingEntry(
          entry as Record<string, unknown>,
          `${path}[${i}]`,
          findings,
        );
      }
    });

    return findings;
  },
};
