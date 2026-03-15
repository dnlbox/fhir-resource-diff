/**
 * A specific, named FHIR profile with a known canonical URL.
 * Used for exact-match lookups.
 */
export interface ProfileInfo {
  /** The exact canonical URL of this profile. */
  canonical: string;
  /** Human-readable name, e.g. "Vital Signs Observation". */
  name: string;
  /** Short IG identifier for display, e.g. "FHIR Base", "US Core". */
  igShort: string;
  /** Full IG name, e.g. "US Core Implementation Guide". */
  ig: string;
  /** Direct link to this profile's documentation page. */
  docUrl: string;
}

/**
 * A namespace entry for an Implementation Guide.
 * Used when we recognize the IG by URL prefix but don't have the exact profile.
 */
export interface ProfileNamespace {
  /** URL prefix that identifies this IG, e.g. "http://hl7.org/fhir/us/core/". */
  prefix: string;
  /** Short IG identifier for display. */
  igShort: string;
  /** Full IG name. */
  ig: string;
  /** IG home/documentation page. */
  igUrl: string;
}

export const KNOWN_PROFILES: readonly ProfileInfo[] = [
  // FHIR base profiles (defined in the spec itself)
  {
    canonical: "http://hl7.org/fhir/StructureDefinition/vitalsigns",
    name: "Vital Signs",
    igShort: "FHIR Base",
    ig: "HL7 FHIR Base Specification",
    docUrl: "https://hl7.org/fhir/R4/vitalsigns.html",
  },
  {
    canonical: "http://hl7.org/fhir/StructureDefinition/bodyweight",
    name: "Body Weight",
    igShort: "FHIR Base",
    ig: "HL7 FHIR Base Specification",
    docUrl: "https://hl7.org/fhir/R4/bodyweight.html",
  },
  {
    canonical: "http://hl7.org/fhir/StructureDefinition/heartrate",
    name: "Heart Rate",
    igShort: "FHIR Base",
    ig: "HL7 FHIR Base Specification",
    docUrl: "https://hl7.org/fhir/R4/heartrate.html",
  },
  {
    canonical: "http://hl7.org/fhir/StructureDefinition/bp",
    name: "Blood Pressure",
    igShort: "FHIR Base",
    ig: "HL7 FHIR Base Specification",
    docUrl: "https://hl7.org/fhir/R4/bp.html",
  },
  // IPS
  {
    canonical: "http://hl7.org/fhir/uv/ips/StructureDefinition/Bundle-uv-ips",
    name: "IPS Bundle",
    igShort: "IPS",
    ig: "International Patient Summary",
    docUrl: "https://hl7.org/fhir/uv/ips/StructureDefinition-Bundle-uv-ips.html",
  },
  {
    canonical: "http://hl7.org/fhir/uv/ips/StructureDefinition/Patient-uv-ips",
    name: "IPS Patient",
    igShort: "IPS",
    ig: "International Patient Summary",
    docUrl: "https://hl7.org/fhir/uv/ips/StructureDefinition-Patient-uv-ips.html",
  },
  {
    canonical: "http://hl7.org/fhir/uv/ips/StructureDefinition/Composition-uv-ips",
    name: "IPS Composition",
    igShort: "IPS",
    ig: "International Patient Summary",
    docUrl: "https://hl7.org/fhir/uv/ips/StructureDefinition-Composition-uv-ips.html",
  },
  // US Core (selected high-traffic profiles)
  {
    canonical: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient",
    name: "US Core Patient",
    igShort: "US Core",
    ig: "US Core Implementation Guide",
    docUrl: "https://hl7.org/fhir/us/core/StructureDefinition-us-core-patient.html",
  },
  {
    canonical: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-observation-lab",
    name: "US Core Laboratory Result Observation",
    igShort: "US Core",
    ig: "US Core Implementation Guide",
    docUrl: "https://hl7.org/fhir/us/core/StructureDefinition-us-core-observation-lab.html",
  },
  {
    canonical: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-condition",
    name: "US Core Condition",
    igShort: "US Core",
    ig: "US Core Implementation Guide",
    docUrl: "https://hl7.org/fhir/us/core/StructureDefinition-us-core-condition.html",
  },
  {
    canonical: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-medicationrequest",
    name: "US Core MedicationRequest",
    igShort: "US Core",
    ig: "US Core Implementation Guide",
    docUrl: "https://hl7.org/fhir/us/core/StructureDefinition-us-core-medicationrequest.html",
  },
];

/**
 * Namespace entries ordered from most specific to least specific.
 * First match wins during prefix lookup.
 */
export const PROFILE_NAMESPACES: readonly ProfileNamespace[] = [
  // IPS
  {
    prefix: "http://hl7.org/fhir/uv/ips/",
    igShort: "IPS",
    ig: "International Patient Summary",
    igUrl: "https://hl7.org/fhir/uv/ips/",
  },
  // US Core
  {
    prefix: "http://hl7.org/fhir/us/core/",
    igShort: "US Core",
    ig: "US Core Implementation Guide",
    igUrl: "https://hl7.org/fhir/us/core/",
  },
  // AU Base
  {
    prefix: "http://hl7.org.au/fhir/StructureDefinition/",
    igShort: "AU Base",
    ig: "AU Base Implementation Guide",
    igUrl: "https://build.fhir.org/ig/hl7au/au-fhir-base/",
  },
  // AU Core
  {
    prefix: "http://hl7.org.au/fhir/core/",
    igShort: "AU Core",
    ig: "AU Core Implementation Guide",
    igUrl: "https://build.fhir.org/ig/hl7au/au-fhir-core/",
  },
  // mCode
  {
    prefix: "http://hl7.org/fhir/us/mcode/",
    igShort: "mCode",
    ig: "minimal Common Oncology Data Elements",
    igUrl: "https://hl7.org/fhir/us/mcode/",
  },
  // QI Core
  {
    prefix: "http://hl7.org/fhir/us/qicore/",
    igShort: "QI Core",
    ig: "QI Core Implementation Guide",
    igUrl: "https://hl7.org/fhir/us/qicore/",
  },
  // CARIN Blue Button
  {
    prefix: "http://hl7.org/fhir/us/carin-bb/",
    igShort: "CARIN BB",
    ig: "CARIN Blue Button Implementation Guide",
    igUrl: "https://hl7.org/fhir/us/carin-bb/",
  },
  // Da Vinci
  {
    prefix: "http://hl7.org/fhir/us/davinci-",
    igShort: "Da Vinci",
    ig: "Da Vinci Implementation Guides",
    igUrl: "https://confluence.hl7.org/display/DVP",
  },
  // SMART App Launch
  {
    prefix: "http://hl7.org/fhir/smart-app-launch/",
    igShort: "SMART",
    ig: "SMART App Launch",
    igUrl: "https://hl7.org/fhir/smart-app-launch/",
  },
  // FHIR Base profiles
  {
    prefix: "http://hl7.org/fhir/StructureDefinition/",
    igShort: "FHIR Base",
    ig: "HL7 FHIR Base Specification",
    igUrl: "https://hl7.org/fhir/R4/profiling.html",
  },
];

const CANONICAL_URL_PATTERN = /^https?:\/\/.+/;
const URN_PATTERN = /^urn:.+/;

/**
 * Returns true if the given string is a valid FHIR canonical URL.
 * Accepts http(s):// URLs and urn: URIs.
 */
export function isValidCanonicalUrl(url: string): boolean {
  return CANONICAL_URL_PATTERN.test(url) || URN_PATTERN.test(url);
}

/**
 * Looks up an exact profile match by canonical URL.
 * Returns undefined if not found.
 */
export function lookupProfile(canonical: string): ProfileInfo | undefined {
  return KNOWN_PROFILES.find((p) => p.canonical === canonical);
}

/**
 * Looks up the first matching IG namespace for a canonical URL.
 * Returns undefined if no namespace prefix matches.
 */
export function lookupProfileNamespace(canonical: string): ProfileNamespace | undefined {
  return PROFILE_NAMESPACES.find((ns) => canonical.startsWith(ns.prefix));
}
