# Changelog

All notable changes are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- `fhir-date-format` FORMAT_RULE now validates `Period.start` and `Period.end` fields as FHIR dateTime; closes the `malformed-date` fault gap for `effectivePeriod`, `onsetPeriod`, `performedPeriod`, and `period` across all resource types (Spec 42)
- `fhir-common-bindings` STRUCTURAL_RULE now validates `Observation.valueQuantity.system` and `Observation.component[].valueQuantity.system` against UCUM (`http://unitsofmeasure.org`); warnings when a non-UCUM system URI is present (Spec 43)
- `MedicationStatement.status` now validated against the R4/R4B value set (`active | completed | entered-in-error | intended | stopped | on-hold | unknown | not-taken`); arbitrary values produce a warning (Spec 41)
- `MedicationUsage` added to the R5 resource registry (renamed from `MedicationStatement` in R5); `info MedicationUsage` now works and `validate --fhir-version R5` no longer warns (Spec 35)
- `fhir-resource-type` FORMAT_RULE: unknown `resourceType` values now produce a warning on every `validate` call, even without `--fhir-version`; version-mismatched types (e.g. `MedicationStatement` in R5) also warn (Spec 39)
- `fhir-common-bindings` STRUCTURAL_RULE: validates `Patient.gender` against `AdministrativeGender` value set and `telecom[].system` against `ContactPointSystem` value set (Specs 37, 38)

### Fixed
- `validate -` now correctly handles pretty-printed single JSON objects (e.g. `generate patient --pretty | validate -`); previously every line was treated as a separate NDJSON entry (Spec 40)
- `AllergyIntolerance.type` no longer triggers a false "should be CodeableConcept" warning in R4 and R4B — it is correctly a plain string code in those versions (Spec 36)
- `MedicationStatement` registry entry updated to `R4`/`R4B` only (does not exist in R5) (Spec 35)

- `validate -` now accepts multiple FHIR resources from stdin: a JSON array, NDJSON (one resource per line), or the existing single-object format — auto-detected without a flag (Spec 34)
- Multi-resource text output: `[N/M] ResourceType/id` headers per resource, summary line (`N resources: X valid, Y invalid`) (Spec 34)
- Multi-resource JSON output: array of result objects, each with `index`, `resource`, and the existing validation fields (Spec 34)
- `--envelope` with `--format json` wraps the multi-resource array in the standard envelope (Spec 34)
- `detectInputFormat` and `parseMultiResource` utilities in `src/cli/utils/` (Spec 34)

## [0.3.0] — 2026-03-16

### Added
- `normalize` command: `--summary` flag prints a one-line change summary to stderr (`↳ normalized: 5 keys sorted, 2 dates normalized`) without contaminating stdout piping (Spec 31)
- `NormalizeStats` and `NormalizeResult` types exported from the library — `normalize()` now returns `{ resource, stats }` instead of a bare resource (Spec 31)
- Pre-commit hook via lefthook: runs `typecheck`, `lint`, and `test` in parallel before every commit (Spec 32)
- Renovate configuration for automated dependency update PRs — coupled packages grouped, no automerge (Spec 33)
- CI now tests on Node 20 (minimum) and `lts/*` to catch accidental use of newer APIs (Spec 33)
- Runtime compatibility CI jobs: Bun and Deno smoke tests in separate `compat.yml` workflow (Spec 33)

### Changed
- `info` command and resource registry lookups are now case-insensitive — `info observation` and `info OBSERVATION` both resolve to `Observation` (Spec 30)
- `normalize` command description updated to explain canonical form and when to use it (Spec 31)
- `canonical` and `none` normalization preset descriptions rewritten in plain terms (Spec 31)

## [0.2.0] — 2026-03-15

### Added
- Format validation rules: FHIR id format, date/dateTime/instant, reference strings (Spec 21)
- Structural validation rules: required fields for ~20 resource types, status value sets, CodeableConcept shape (Spec 22)
- Profile awareness: `meta.profile` detection, exact-match registry for named profiles, IG namespace registry (Spec 23)
- `ValidationHint` type — separates tool-scope notes from data findings; clean resources now show `valid` not `valid (with warnings)`
- `ValidationRule` infrastructure: `walkResource` tree walker, `runRules` runner, `ruleId` on `ValidationError`
- `getPath` / `setPath` safe path utilities in `src/core/utils/path.ts` (own-property-only traversal)
- Snyk dependency vulnerability scanning GitHub Action (Spec 24)
- Showcase: 6 real HL7 R4 CC0 examples in `examples/showcase/` with `SHOWCASE.md`
- `CONTRIBUTING.md` rewrite: functional programming paradigm, curated-not-complete philosophy, out-of-scope table (Spec 26)
- `LICENSE` file (MIT)
- Ecosystem comparison in `README.md`: positioning alongside `@types/fhir`, `@medplum/core`, `fhirclient`, HL7 Validator

### Fixed
- Stdin pipe with network sources (`curl`): EAGAIN race condition in Node.js ESM resolved with async stream reader
- Prototype pollution in `normalize` and `walkResource` (CWE-915): `PROTOTYPE_KEYS` guard on all bracket-notation writes and path traversal

### Changed
- `valid (with warnings)` only shown when actual data findings exist in the resource
- Hint about HL7 Validator moved from `errors` array to separate `hint` field on `ValidationResult`
- `UNSAFE_KEYS` renamed to `PROTOTYPE_KEYS` with explanatory comment
- Ecosystem section in `README.md` reframed to acknowledge community contributions

## [0.1.0] — 2026-02-28

### Added
- Core diff engine with path-level change tracking (added, removed, changed, type-changed)
- Structural validation with severity model (error / warning / info)
- CLI commands: `compare`, `validate`, `normalize`, `info`, `list-resources`
- Multi-version support: R4, R4B, R5 — auto-detected or explicit via `--fhir-version`
- Output formats: text, JSON, markdown
- Stdin/pipe support — compose with `curl`, `jq`, and other Unix tools
- CI affordances: `--quiet`, `--envelope`, `--exit-on-diff`
- Resource type registry with HL7 documentation links
- Named presets for common ignore patterns: `metadata`, `clinical`, `strict`
- TypeScript library API: `parseJson`, `validate`, `diff`, `normalize`
- Browser-safe core — no Node.js APIs in `src/core/` or `src/formatters/`
