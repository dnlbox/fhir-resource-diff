import type { FhirResource, ValidationError } from "@/core/types.js";
import type { FhirVersion } from "@/core/fhir-version.js";
import type { ValidationRule } from "@/core/rules/index.js";

const RULE_ID = "fhir-common-bindings";

/** Patient.gender — required binding to AdministrativeGender, all versions. */
const ADMINISTRATIVE_GENDER = ["male", "female", "other", "unknown"] as const;

/** telecom[].system — required binding to ContactPointSystem, all versions. */
const CONTACT_POINT_SYSTEM = ["phone", "fax", "email", "pager", "url", "sms", "other"] as const;

/** Observation.valueQuantity.system — strongly recommended to be UCUM. */
const UCUM_SYSTEM = "http://unitsofmeasure.org";

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

function validateQuantitySystem(
  vq: Record<string, unknown>,
  path: string,
  findings: ValidationError[],
): void {
  const system = vq["system"];
  if (system === undefined) return;
  if (system !== UCUM_SYSTEM) {
    findings.push({
      path: `${path}.system`,
      message:
        `Observation.${path}.system should be UCUM ('${UCUM_SYSTEM}'), got '${String(system)}'. ` +
        `FHIR recommends UCUM for all quantity values.`,
      severity: "warning",
      ruleId: RULE_ID,
      docUrl: "https://hl7.org/fhir/observation-definitions.html#Observation.value_x_",
    });
  }
}

function validateObservationUcum(resource: FhirResource, findings: ValidationError[]): void {
  if (resource.resourceType !== "Observation") return;
  const res = resource as Record<string, unknown>;

  const vq = res["valueQuantity"];
  if (vq !== null && typeof vq === "object" && !Array.isArray(vq)) {
    validateQuantitySystem(vq as Record<string, unknown>, "valueQuantity", findings);
  }

  const components = res["component"];
  if (!Array.isArray(components)) return;
  components.forEach((comp: unknown, i: number) => {
    if (comp === null || typeof comp !== "object" || Array.isArray(comp)) return;
    const compVq = (comp as Record<string, unknown>)["valueQuantity"];
    if (compVq !== null && typeof compVq === "object" && !Array.isArray(compVq)) {
      validateQuantitySystem(
        compVq as Record<string, unknown>,
        `component[${i}].valueQuantity`,
        findings,
      );
    }
  });
}

export const commonBindingsRule: ValidationRule = {
  id: RULE_ID,
  description:
    "Primitive-coded fields with required bindings must use allowed values (Patient.gender, telecom[].system, Observation.valueQuantity.system)",

  check(resource: FhirResource, version?: FhirVersion): ValidationError[] {
    const findings: ValidationError[] = [];
    validatePatientGender(resource, findings);
    validateTelecomSystems(resource, findings);
    // UCUM check is structural — only run when a version is provided
    if (version !== undefined) {
      validateObservationUcum(resource, findings);
    }
    return findings;
  },
};
