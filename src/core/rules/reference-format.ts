import type { FhirResource, ValidationError } from "@/core/types.js";
import type { FhirVersion } from "@/core/fhir-version.js";
import type { ValidationRule } from "@/core/rules/index.js";
import { walkResource } from "@/core/rules/walk.js";
import { isKnownResourceType } from "@/core/resource-registry.js";

const RELATIVE_REF_PATTERN = /^[A-Z][A-Za-z]+\/[A-Za-z0-9\-.]{1,64}$/;
const FRAGMENT_REF_PATTERN = /^#.+$/;
const ABSOLUTE_REF_PATTERN = /^https?:\/\/.+/;
const URN_REF_PATTERN = /^urn:(uuid|oid):.+$/;

function isValidReference(ref: string): boolean {
  return (
    RELATIVE_REF_PATTERN.test(ref) ||
    FRAGMENT_REF_PATTERN.test(ref) ||
    ABSOLUTE_REF_PATTERN.test(ref) ||
    URN_REF_PATTERN.test(ref)
  );
}

export const referenceFormatRule: ValidationRule = {
  id: "fhir-reference-format",
  description:
    "FHIR reference values must be relative (ResourceType/id), absolute URL, fragment (#id), or URN",

  check(resource: FhirResource, version?: FhirVersion): ValidationError[] {
    const findings: ValidationError[] = [];

    walkResource(resource, (path, key, value) => {
      if (key !== "reference") return;
      if (typeof value !== "string") return;

      if (!isValidReference(value)) {
        findings.push({
          path,
          message: `Invalid FHIR reference '${value}' at '${path}': expected ResourceType/id, absolute URL, #fragment, or urn:uuid:/urn:oid:`,
          severity: "warning",
          ruleId: "fhir-reference-format",
        });
        return;
      }

      // Extra check: if relative reference and version is known, validate resource type
      if (version !== undefined && RELATIVE_REF_PATTERN.test(value)) {
        const refResourceType = value.split("/")[0];
        if (refResourceType && !isKnownResourceType(refResourceType, version)) {
          findings.push({
            path,
            message: `Unknown resource type '${refResourceType}' in reference '${value}' for ${version}`,
            severity: "warning",
            ruleId: "fhir-reference-format",
          });
        }
      }
    });

    return findings;
  },
};
