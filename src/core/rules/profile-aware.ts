import type { FhirResource, ValidationError } from "@/core/types.js";
import type { FhirVersion } from "@/core/fhir-version.js";
import type { ValidationRule } from "@/core/rules/index.js";
import {
  isValidCanonicalUrl,
  lookupProfile,
  lookupProfileNamespace,
} from "@/core/profile-registry.js";

const HL7_VALIDATOR_URL = "https://confluence.hl7.org/display/FHIR/Using+the+FHIR+Validator";
const RULE_ID = "fhir-profile-aware";

export const profileAwareRule: ValidationRule = {
  id: RULE_ID,
  description: "Validates meta.profile entries and identifies known IGs and profiles",

  check(resource: FhirResource, _version?: FhirVersion): ValidationError[] {
    const findings: ValidationError[] = [];

    const metaRaw = resource.meta as Record<string, unknown> | undefined;
    if (!metaRaw) return findings;

    const profileField: unknown = metaRaw["profile"];
    if (!Array.isArray(profileField) || profileField.length === 0) return findings;

    const profileArray = profileField as unknown[];
    for (let i = 0; i < profileArray.length; i++) {
      const entry: unknown = profileArray[i];
      const path = `meta.profile[${i}]`;

      if (typeof entry !== "string") {
        findings.push({
          path,
          message: "meta.profile entries must be strings",
          severity: "warning",
          ruleId: RULE_ID,
        });
        continue;
      }

      if (!isValidCanonicalUrl(entry)) {
        findings.push({
          path,
          message: `Profile URL "${entry}" is not a valid canonical URL (must be an absolute URI)`,
          severity: "warning",
          ruleId: RULE_ID,
        });
        continue;
      }

      const exactMatch = lookupProfile(entry);
      if (exactMatch !== undefined) {
        findings.push({
          path,
          message: `Declares ${exactMatch.igShort} profile "${exactMatch.name}" → ${exactMatch.docUrl}`,
          severity: "info",
          docUrl: exactMatch.docUrl,
          ruleId: RULE_ID,
        });
        continue;
      }

      const namespaceMatch = lookupProfileNamespace(entry);
      if (namespaceMatch !== undefined) {
        findings.push({
          path,
          message: `Declares ${namespaceMatch.igShort} profile (${namespaceMatch.ig}) — for conformance validation load the IG in the HL7 FHIR Validator → ${namespaceMatch.igUrl}`,
          severity: "info",
          docUrl: namespaceMatch.igUrl,
          ruleId: RULE_ID,
        });
        continue;
      }

      findings.push({
        path,
        message: `Declares profile ${entry} — for conformance validation use the HL7 FHIR Validator with the relevant IG loaded → ${HL7_VALIDATOR_URL}`,
        severity: "info",
        docUrl: HL7_VALIDATOR_URL,
        ruleId: RULE_ID,
      });
    }

    return findings;
  },
};
