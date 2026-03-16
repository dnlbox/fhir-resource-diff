# Changelog

All notable changes are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Changed
- `info` command and resource registry lookups are now case-insensitive — `info observation` and `info OBSERVATION` both resolve to `Observation`

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
