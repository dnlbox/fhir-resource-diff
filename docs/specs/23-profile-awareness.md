# Spec 23 — Profile awareness

**Status:** complete

## Goal

Surface profile declarations from `meta.profile` in a useful way — validate that
profile URLs are well-formed, identify which Implementation Guide (IG) they belong to
from a curated registry, and emit targeted guidance when a declared profile requires
tools beyond this one's scope. No StructureDefinition loading, no profile constraint
evaluation — just awareness and discoverability.

## Dependencies

- Spec 01 (types: `ValidationError`, `ValidationRule`)
- Spec 02 (validate: `validate()`)
- Spec 12 (fhir-version: `FhirVersion`)
- Spec 21 (rules infrastructure: `ValidationRule`, `runRules`, `walkResource`)

## Deliverables

### New files

| File | Purpose |
|------|---------|
| `src/core/profile-registry.ts` | Curated profile namespace and exact-match registry |
| `src/core/rules/profile-aware.ts` | Validation rule for `meta.profile` entries |
| `tests/core/profile-registry.test.ts` | Registry lookup tests |
| `tests/core/rules/profile-aware.test.ts` | Rule tests |

### Modified files

| File | Change |
|------|--------|
| `src/core/rules/index.ts` | Add `profileAwareRule` to a new `PROFILE_RULES` array; update `ALL_RULES` |
| `src/core/validate.ts` | Run profile rules (always — profile detection doesn't require version) |
| `src/core/index.ts` | Re-export profile registry types and lookups |

## Key interfaces / signatures

### Profile registry types

```typescript
// src/core/profile-registry.ts

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

export function lookupProfile(canonical: string): ProfileInfo | undefined;
export function lookupProfileNamespace(canonical: string): ProfileNamespace | undefined;
export function isValidCanonicalUrl(url: string): boolean;
```

### Rule export

```typescript
// src/core/rules/profile-aware.ts
export const profileAwareRule: ValidationRule;
```

### Updated rules index

```typescript
// src/core/rules/index.ts

/** Format rules from Spec 21 — always run. */
export const FORMAT_RULES: readonly ValidationRule[];

/** Structural rules from Spec 22 — run when version is known. */
export const STRUCTURAL_RULES: readonly ValidationRule[];

/** Profile awareness rules from Spec 23 — always run. */
export const PROFILE_RULES: readonly ValidationRule[];

/** All rules combined. */
export const ALL_RULES: readonly ValidationRule[];
```

## Implementation notes

### Profile registry: two-tier lookup

**Tier 1 — Exact match** (`KNOWN_PROFILES`)

A curated list of specific, named profiles with known canonical URLs. These are
profiles common enough that naming them adds real value:

```typescript
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
```

**Tier 2 — Namespace match** (`PROFILE_NAMESPACES`)

When we don't have an exact match, we check URL prefixes to identify the IG. Ordered
from most specific to least specific (first match wins):

```typescript
export const PROFILE_NAMESPACES: readonly ProfileNamespace[] = [
  // IPS
  { prefix: "http://hl7.org/fhir/uv/ips/", igShort: "IPS", ig: "International Patient Summary", igUrl: "https://hl7.org/fhir/uv/ips/" },
  // US Core
  { prefix: "http://hl7.org/fhir/us/core/", igShort: "US Core", ig: "US Core Implementation Guide", igUrl: "https://hl7.org/fhir/us/core/" },
  // AU Base
  { prefix: "http://hl7.org.au/fhir/StructureDefinition/", igShort: "AU Base", ig: "AU Base Implementation Guide", igUrl: "https://build.fhir.org/ig/hl7au/au-fhir-base/" },
  // AU Core
  { prefix: "http://hl7.org.au/fhir/core/", igShort: "AU Core", ig: "AU Core Implementation Guide", igUrl: "https://build.fhir.org/ig/hl7au/au-fhir-core/" },
  // mCode
  { prefix: "http://hl7.org/fhir/us/mcode/", igShort: "mCode", ig: "minimal Common Oncology Data Elements", igUrl: "https://hl7.org/fhir/us/mcode/" },
  // QI Core
  { prefix: "http://hl7.org/fhir/us/qicore/", igShort: "QI Core", ig: "QI Core Implementation Guide", igUrl: "https://hl7.org/fhir/us/qicore/" },
  // CARIN Blue Button
  { prefix: "http://hl7.org/fhir/us/carin-bb/", igShort: "CARIN BB", ig: "CARIN Blue Button Implementation Guide", igUrl: "https://hl7.org/fhir/us/carin-bb/" },
  // Da Vinci
  { prefix: "http://hl7.org/fhir/us/davinci-", igShort: "Da Vinci", ig: "Da Vinci Implementation Guides", igUrl: "https://confluence.hl7.org/display/DVP" },
  // SMART App Launch
  { prefix: "http://hl7.org/fhir/smart-app-launch/", igShort: "SMART", ig: "SMART App Launch", igUrl: "https://hl7.org/fhir/smart-app-launch/" },
  // FHIR Base profiles
  { prefix: "http://hl7.org/fhir/StructureDefinition/", igShort: "FHIR Base", ig: "HL7 FHIR Base Specification", igUrl: "https://hl7.org/fhir/R4/profiling.html" },
];
```

### Canonical URL validation

A FHIR canonical URL must be an absolute URI. The minimal check:

```typescript
const CANONICAL_URL_PATTERN = /^https?:\/\/.+/;

export function isValidCanonicalUrl(url: string): boolean {
  return CANONICAL_URL_PATTERN.test(url);
}
```

Note: FHIR also allows URNs (`urn:`) and other absolute URIs as canonical URLs, but
`http(s)://` covers 99%+ of real-world usage. URNs pass as well.

### Rule: `fhir-profile-aware`

**What to check:**

1. Read `resource.meta.profile` — if absent or not an array, skip (no profile declared)
2. For each entry in the array:
   - If not a string → `warning`: "meta.profile entries must be strings"
   - If string but not a valid canonical URL → `warning`: "malformed profile URL"
   - If valid URL, exact match in `KNOWN_PROFILES` → `info`: name the profile, link docs
   - If valid URL, namespace match in `PROFILE_NAMESPACES` → `info`: name the IG, note
     that constraint validation requires the HL7 Validator with the IG loaded
   - If valid URL, no match → `info`: "declares unrecognized profile — use the HL7
     Validator with the relevant IG loaded for conformance checking"

**Severity breakdown:**
- `warning` — malformed URL or non-string entry (these are always wrong)
- `info` — all recognized/unrecognized profile messages (they're informative, not errors)

**Path:** always `"meta.profile[N]"` where N is the array index

**ruleId:** `"fhir-profile-aware"`

**Example outputs:**

```
// Exact match (FHIR base vital signs — our blood pressure example uses this)
ℹ meta.profile[0]: Declares FHIR Base profile "Vital Signs" → https://hl7.org/fhir/R4/vitalsigns.html

// Namespace match (US Core, profile not in exact list)
ℹ meta.profile[0]: Declares US Core profile (US Core Implementation Guide) — for
  conformance validation load the IG in the HL7 FHIR Validator → https://hl7.org/fhir/us/core/

// Recognized IG, exact match
ℹ meta.profile[0]: Declares IPS profile "IPS Patient" → https://hl7.org/fhir/uv/ips/StructureDefinition-Patient-uv-ips.html

// Unrecognized
ℹ meta.profile[0]: Declares profile https://example.org/profiles/custom — for conformance
  validation use the HL7 FHIR Validator with the relevant IG loaded
  → https://confluence.hl7.org/display/FHIR/Using+the+FHIR+Validator

// Malformed
⚠ meta.profile[0]: Profile URL "not-a-url" is not a valid canonical URL (must be an absolute URI)
```

### Integration with `validate()`

Profile rules always run, regardless of `--fhir-version`. Profile declarations are
independent of the FHIR version being validated against.

```typescript
// In validate.ts, after format rules:
errors.push(...runRules(resource, PROFILE_RULES, version));
```

### Relationship to the hint

Before this spec, the `hint` always said "use the HL7 FHIR Validator" as a generic
footer. After this spec, when a profile is declared, the profile rule emits a more
specific message. The generic hint remains (it's about the tool's overall scope) but
profile-specific messages appear in the findings, not the footer.

This means for a resource with `meta.profile`, the output becomes:

```
valid (with warnings)       ← or "valid" if only info-level
  ℹ meta.profile[0]: Declares US Core profile "US Core Patient"
    → https://hl7.org/fhir/us/core/StructureDefinition-us-core-patient.html

  ℹ For full FHIR schema validation, use the official HL7 FHIR Validator
    → https://confluence.hl7.org/display/FHIR/Using+the+FHIR+Validator
```

Much more useful than the previous generic-only output.

## Acceptance criteria

### Build and lint
```bash
pnpm typecheck   # no errors
pnpm lint        # no errors
pnpm build       # succeeds
```

### Tests
```bash
pnpm test        # all pass
```

**Profile registry tests:**
- `lookupProfile("http://hl7.org/fhir/StructureDefinition/vitalsigns")` → returns `ProfileInfo`
- `lookupProfile("http://unknown.org/foo")` → returns `undefined`
- `lookupProfileNamespace("http://hl7.org/fhir/us/core/StructureDefinition/us-core-encounter")` → returns US Core namespace
- `lookupProfileNamespace("http://hl7.org.au/fhir/StructureDefinition/au-patient")` → returns AU Base namespace
- `lookupProfileNamespace("http://unknown.org/foo")` → returns `undefined`
- `isValidCanonicalUrl("https://example.org/profiles/foo")` → `true`
- `isValidCanonicalUrl("not-a-url")` → `false`
- `isValidCanonicalUrl("urn:uuid:something")` → `true` (URN is valid canonical)

**Profile rule tests:**
- Resource with no `meta.profile` → no findings
- Resource with `meta.profile: []` → no findings
- Resource with exact-match profile URL → info finding naming the profile
- Resource with namespace-match profile URL (not exact) → info finding naming the IG
- Resource with unrecognized valid URL → info finding pointing to HL7 validator
- Resource with malformed URL in `meta.profile` → warning
- Resource with non-string entry in `meta.profile` → warning
- Multiple profiles → findings for each entry (correct index in path)
- `ruleId` is `"fhir-profile-aware"` on all findings

**Integration tests (via validate()):**
- The blood pressure example (`obs-blood-pressure.json`) declares `meta.profile: ["http://hl7.org/fhir/StructureDefinition/vitalsigns"]` → validate recognizes it as "Vital Signs"
- Resource with known US Core profile → named in output
- Resource with unknown-IG profile URL → generic HL7 validator pointer

### CLI smoke tests
```bash
# Our blood pressure fixture declares the vitalsigns profile — should be recognized
fhir-resource-diff validate examples/showcase/obs-blood-pressure.json --fhir-version R4
# Expected: info finding naming "Vital Signs" with link, then HL7 hint footer

# US Core patient (inline test)
echo '{"resourceType":"Patient","meta":{"profile":["http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"]},"id":"p1"}' \
  | fhir-resource-diff validate - --fhir-version R4
# Expected: info finding naming "US Core Patient" with link

# Malformed profile URL
echo '{"resourceType":"Patient","meta":{"profile":["not-a-url"]},"id":"p1"}' \
  | fhir-resource-diff validate -
# Expected: warning about malformed URL, valid: false in JSON
```

## Do not do

- Do not load or parse StructureDefinition resources — no profile constraint evaluation
- Do not download FHIR packages (`.tgz`) or reach out to the network
- Do not add a `--profile` flag for selecting a validation profile — future spec
- Do not attempt to validate that the resource actually conforms to the declared profile
- Do not add version-specific profile filtering yet — profiles in the registry are
  version-agnostic for now (most support multiple versions)
- Do not add a `profile info` or `list-profiles` CLI command yet — future spec
- Do not warn about profile absence — not declaring a profile is perfectly valid FHIR
