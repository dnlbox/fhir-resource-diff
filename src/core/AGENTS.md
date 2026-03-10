# AGENTS.md — src/core/

## Purpose

This is the **shared core library**. Everything here must work identically in Node.js and in a browser (React/Vite app).

## Browser-safety rule (critical)

- **NEVER** import from `node:*`, `fs`, `path`, `process`, `child_process`, or any Node built-in.
- **NEVER** access `process.env`, `process.argv`, `__dirname`, or `__filename`.
- **NEVER** perform I/O (file reads, network calls, stdout writes). I/O is the adapter's job.
- All functions should be **pure** — same inputs, same outputs, no side effects.

## Module responsibilities

| File | Responsibility |
|------|---------------|
| `types.ts` | All shared TypeScript types and interfaces (DiffResult, FhirResource, ValidationResult, etc.) |
| `parse.ts` | Parse a JSON value into a typed FHIR resource object |
| `validate.ts` | Validate basic FHIR resource shape (resourceType present, required fields) |
| `normalize.ts` | Apply normalization transforms (sort keys, trim strings, normalize dates) |
| `diff.ts` | Recursive deep-diff engine producing a DiffResult |
| `classify.ts` | Classify diff entries (added, removed, changed, type-changed) |

## Design principles

- **Types first.** Define the interface before writing the implementation.
- **No FHIR-version coupling.** The core should work with any resource that has a `resourceType` field. Resource-type-specific logic belongs in extension points or presets, not hardcoded here.
- **Deterministic output.** Given the same two inputs and the same options, `diff()` must always produce the same result.
- **Extension points over feature flags.** Prefer accepting a comparator/normalizer function argument over adding boolean flags.
- **No formatting logic.** The core returns a structured `DiffResult`. Rendering to text/JSON/markdown happens in `src/formatters/`.

## Testing expectations

- Every exported function must have tests in `tests/core/`.
- Test with real-shaped FHIR resource snippets, not abstract JSON.
- Cover edge cases: empty resources, missing resourceType, deeply nested arrays, identical resources.
