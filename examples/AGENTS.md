# AGENTS.md — examples/

## Purpose

Sample FHIR JSON resource files used for documentation, README examples, and manual testing.

## Rules

- Every file must be **valid FHIR JSON** — parseable by the tool and structurally correct.
- Use **realistic but synthetic data**. No real patient data, no PHI, no proprietary schemas.
- File names should be descriptive: `patient-a.json`, `patient-b.json`, `observation-basic.json`, `bundle-example.json`.
- Include **pairs** of resources that demonstrate meaningful diffs (name changes, added telecom, removed identifiers, etc.).
- Keep files small and focused — just enough fields to demonstrate the tool's capabilities.

## Suggested starter files

| File | Purpose |
|------|---------|
| `patient-a.json` | Base Patient resource |
| `patient-b.json` | Modified Patient (changed name, birthDate, added telecom) |
| `observation-a.json` | Base Observation resource |
| `observation-b.json` | Modified Observation (changed value, status) |
| `bundle-example.json` | Simple Bundle with 2–3 entries for future bundle-diff work |

## Maintenance

- When adding a new core feature (e.g., array normalization), add or update example files that demonstrate it.
- Example files are referenced in the README — keep them in sync.
