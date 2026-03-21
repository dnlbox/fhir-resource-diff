---
**Status:** complete
---

# Spec 49 — Annotate pipeline interop

## Goal

When `validate -` receives a `{ resource, notes }` annotate wrapper (produced by `fhir-test-data generate --annotate`), detect it and validate the inner `resource` field instead of rejecting with "Missing or invalid resourceType".

## Detection heuristic

Input is an annotate wrapper when:
- Root object has exactly the keys `resource` and `notes`
- `resource` is an object with a `resourceType` field
- `notes` is an array

## Behaviour

When detected, emit a stderr notice:

```
Note: detected --annotate wrapper; validating inner resource
```

Then proceed to validate the inner `resource` field as a normal FHIR resource.

## Deliverables

| File | Change |
|------|--------|
| `src/cli/utils/parse-multi-resource.ts` | Add `unwrapAnnotateWrapper` helper |
| `src/cli/commands/validate.ts` | Call `unwrapAnnotateWrapper` before stdin multi-resource parsing |
| `tests/cli/validate.test.ts` | Unit and CLI integration tests |

## Acceptance criteria

```bash
# Annotate wrapper — validates inner resource
echo '{"resource":{"resourceType":"Patient","id":"p1"},"notes":[]}' | fhir-resource-diff validate -
# stderr: Note: detected --annotate wrapper; validating inner resource
# stdout: valid
# exit 0

# Plain FHIR resource — no change
echo '{"resourceType":"Patient","id":"p1"}' | fhir-resource-diff validate -
# stdout: valid
# exit 0
# no stderr notice
```
