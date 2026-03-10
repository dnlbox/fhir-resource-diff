# AGENTS.md — tests/

## Purpose

All automated tests for the project. Uses **vitest**.

## Directory structure

```
tests/
  core/          → unit tests for src/core/ modules
  formatters/    → unit/snapshot tests for src/formatters/
  presets/       → tests for preset definitions and composition
  cli/           → integration tests for CLI arg parsing, exit codes, I/O wiring
  fixtures/      → shared test FHIR resource fixtures
```

## Conventions

- **File naming:** `<module>.test.ts` — mirrors the source file it tests (e.g., `tests/core/diff.test.ts` tests `src/core/diff.ts`).
- **Test naming:** use `describe` blocks for the function/module and `it` blocks with clear behavior descriptions (`it("returns empty diff for identical resources")`).
- **Real FHIR shapes.** Use realistic FHIR resource snippets, not abstract `{ a: 1 }` objects. Shared fixtures go in `tests/fixtures/`.
- **No mocking unless necessary.** The core is pure functions — call them directly. Reserve mocks for CLI I/O tests.
- **Edge cases matter.** Always cover: empty input, missing resourceType, identical resources, deeply nested arrays, single-field differences.
- **Snapshot tests** are acceptable for formatter output stability, but keep them small and review diffs carefully.

## Running tests

```bash
pnpm test          # run all tests
pnpm test:watch    # watch mode during development
pnpm test:coverage # with coverage report
```

## Quality expectations

- Every exported function in `src/core/` must have at least one test.
- New features or bug fixes should include a regression test.
- Tests should run fast — no network calls, no disk I/O outside of CLI integration tests.
