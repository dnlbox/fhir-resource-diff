---
**Status:** complete
---

# Spec 47 — Cross-resource-type comparison warning

## Goal

`compare` accepts any two valid FHIR resources and diffs them field-by-field, even when they are
completely different resource types. Comparing a `Patient` against a `Bundle` produces 142
differences with `resourceType: "Patient" → "Bundle"` buried in the list. This is never useful
and is almost always a user error.

```bash
fhir-resource-diff compare patient.json bundle.json
# ResourceType: Patient
# Status: 142 difference(s) found
# Changed:
#   id: "..." → "..."
#   resourceType: "Patient" → "Bundle"   ← buried on line 3 of a 142-line diff
#   ...139 more lines...
```

The signal (wrong types) is hidden. A user who passes the wrong file will scroll through a wall of
noise before realising the mistake.

## Desired behaviour

When `resourceType` differs between the two resources, emit a prominent warning **before** the
diff and exit with a non-zero code unless `--force` is passed:

```
Warning: comparing resources of different types: Patient (left) vs Bundle (right)
This is almost always a mistake. Pass --force to diff anyway.
```

With `--force`:

```
Warning: comparing resources of different types: Patient (left) vs Bundle (right)
ResourceType: Patient → Bundle
Status: 142 difference(s) found
...
```

## Deliverables

| File | Change |
|------|--------|
| `src/cli/commands/compare.ts` | Detect `resourceType` mismatch; emit warning; exit 1 without `--force` |
| `src/cli/commands/compare.ts` | Add `--force` flag |
| `tests/cli/compare.test.ts` | Tests for mismatch detection and `--force` override |
| `CHANGELOG.md` | Entry under `[Unreleased]` |

## Acceptance criteria

```bash
# Default — exits 1 with a clear warning
fhir-resource-diff compare patient.json bundle.json
# stderr: Warning: comparing resources of different types: Patient (left) vs Bundle (right)
# stderr: This is almost always a mistake. Pass --force to diff anyway.
# exit 1

# With --force — proceeds with the full diff
fhir-resource-diff compare patient.json bundle.json --force
# Warning line still printed, then full diff output
# exit 0 (or 1 with --exit-on-diff if also set)

# Same types — no change, no warning
fhir-resource-diff compare patient-a.json patient-b.json
# (existing behaviour)
```

## JSON output

When `--format json` and resource types differ (without `--force`):

```json
{ "error": "resourceTypeMismatch", "left": "Patient", "right": "Bundle" }
```

## Do not do

- Do not suppress the warning when types match
- Do not default `--force` to true — the safe default is to reject mismatched types
