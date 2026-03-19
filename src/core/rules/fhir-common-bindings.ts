import type { FhirResource, ValidationError } from "@/core/types.js";
import type { FhirVersion } from "@/core/fhir-version.js";
import type { ValidationRule } from "@/core/rules/index.js";

const RULE_ID = "fhir-common-bindings";

/** Patient.gender — required binding to AdministrativeGender, all versions. */
const ADMINISTRATIVE_GENDER = ["male", "female", "other", "unknown"] as const;

/** telecom[].system — required binding to ContactPointSystem, all versions. */
const CONTACT_POINT_SYSTEM = ["phone", "fax", "email", "pager", "url", "sms", "other"] as const;

function validatePatientGender(resource: FhirResource, findings: ValidationError[]): void {
  if (resource.resourceType !== "Patient") return;
  const gender = (resource as Record<string, unknown>)["gender"];
  if (gender === undefined) return;
  if (typeof gender !== "string" || !(ADMINISTRATIVE_GENDER as readonly string[]).includes(gender)) {
    findings.push({
      path: "gender",
      message: `Invalid Patient.gender '${String(gender)}': must be one of ${ADMINISTRATIVE_GENDER.join(", ")}`,
      severity: "warning",
      ruleId: RULE_ID,
      docUrl: "https://hl7.org/fhir/valueset-administrative-gender.html",
    });
  }
}

function validateTelecomSystems(resource: FhirResource, findings: ValidationError[]): void {
  const telecoms = (resource as Record<string, unknown>)["telecom"];
  if (!Array.isArray(telecoms)) return;

  telecoms.forEach((t: unknown, i: number) => {
    if (t === null || typeof t !== "object") return;
    const telecom = t as Record<string, unknown>;
    const system = telecom["system"];
    if (system === undefined) return;
    if (typeof system !== "string" || !(CONTACT_POINT_SYSTEM as readonly string[]).includes(system)) {
      findings.push({
        path: `telecom[${i}].system`,
        message: `Invalid ContactPointSystem '${String(system)}': must be one of ${CONTACT_POINT_SYSTEM.join(", ")}`,
        severity: "warning",
        ruleId: RULE_ID,
        docUrl: "https://hl7.org/fhir/valueset-contact-point-system.html",
      });
    }
  });
}

export const commonBindingsRule: ValidationRule = {
  id: RULE_ID,
  description:
    "Primitive-coded fields with required bindings must use allowed values (Patient.gender, telecom[].system)",

  check(resource: FhirResource, _version?: FhirVersion): ValidationError[] {
    const findings: ValidationError[] = [];
    validatePatientGender(resource, findings);
    validateTelecomSystems(resource, findings);
    return findings;
  },
};
