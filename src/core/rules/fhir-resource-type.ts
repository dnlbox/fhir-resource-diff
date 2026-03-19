import type { FhirResource, ValidationError } from "@/core/types.js";
import type { FhirVersion } from "@/core/fhir-version.js";
import type { ValidationRule } from "@/core/rules/index.js";
import { getResourceInfo } from "@/core/resource-registry.js";

const RULE_ID = "fhir-resource-type";

export const resourceTypeRule: ValidationRule = {
  id: RULE_ID,
  description:
    "resourceType must be a known FHIR resource type; when version is specified, it must exist in that version",

  check(resource: FhirResource, version?: FhirVersion): ValidationError[] {
    const errors: ValidationError[] = [];
    const rt = resource.resourceType;

    // resourceType presence is checked at parse time — this rule focuses on known-ness
    if (!rt) return errors;

    const info = getResourceInfo(rt);
    if (!info) {
      errors.push({
        path: "resourceType",
        message: `Unknown resourceType '${rt}': not in the FHIR resource registry. Check https://hl7.org/fhir/resourcelist.html`,
        severity: "warning",
        ruleId: RULE_ID,
        docUrl: "https://hl7.org/fhir/resourcelist.html",
      });
      return errors;
    }

    if (version !== undefined && !(info.versions as readonly string[]).includes(version)) {
      errors.push({
        path: "resourceType",
        message: `resourceType '${rt}' is not available in ${version}. It exists in: ${info.versions.join(", ")}`,
        severity: "warning",
        ruleId: RULE_ID,
        docUrl: `https://hl7.org/fhir/${version}/resourcelist.html`,
      });
    }

    return errors;
  },
};
