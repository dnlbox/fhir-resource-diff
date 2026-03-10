# ORCHESTRATOR.md — fhir-resource-diff build guide

## What this is

This file is the entry point for any AI session tasked with building or extending `fhir-resource-diff`.
Read this first. Then read the spec for the specific deliverable you are implementing.

## Project in one paragraph

`fhir-resource-diff` is a TypeScript CLI and reusable library for validating, comparing, and diffing
FHIR JSON resources. The core logic is **browser-safe** so it can be shared between the CLI and a
future React/Vite web app. The CLI is a thin Node.js adapter on top of that shared core.
See `docs/PROJECT.md` for the full project spec. See `AGENTS.md` for coding conventions.

## Mandatory reading before any session

1. `AGENTS.md` (root) — conventions, constraints, quality bar
2. The relevant `src/*/AGENTS.md` for the module you are working in
3. The spec file for your assigned deliverable (`docs/specs/NN-name.md`)

---

## Build order and dependency graph

Specs must be executed in order. Each spec lists its own dependencies, but the canonical order is:

```
00-project-setup        (no dependencies)
       │
01-core-types           (depends on: 00)
       │
       ├──── 02-core-parse-validate   (depends on: 01)
       │            │
       ├──── 03-core-diff-classify    (depends on: 01, 02)
       │            │
       └──── 04-core-normalize        (depends on: 01, 02)
                    │
             ┌──────┴──────┐
    05-formatters       06-presets     (both depend on: 01, 03, 04)
             │               │
             └──────┬────────┘
                 07-cli               (depends on: 02, 03, 04, 05, 06)
                    │
        ┌───────────┴──────────┐
  08-examples-fixtures     09-readme  (depend on: 07)
```

**Rule:** Do not start a spec until all specs above it in the graph are complete and verified.

---

## Spec file template

Every spec in `docs/specs/` follows this structure so sessions can parse them reliably:

- **Goal** — what this deliverable produces
- **Dependencies** — what must already exist
- **Deliverables** — exact files to create or modify
- **Key interfaces / signatures** — TypeScript types or function signatures to implement
- **Implementation notes** — constraints, design decisions, FHIR-specific guidance
- **Acceptance criteria** — verifiable checks (commands to run, output to expect)
- **Do not do** — explicit out-of-scope items

---

## Handoff protocol

### Before starting a session

1. Run `pnpm build` and `pnpm test` — confirm the baseline is clean (or note any pre-existing failures).
2. Read the spec you are implementing top to bottom.
3. Check `git status` — confirm you are starting from a clean working tree.

### During a session

- Implement one spec at a time. Do not combine multiple specs in one session unless they are trivially small.
- Write or update tests alongside the implementation, not after.
- Commit when a meaningful unit of work is complete and tests pass.
- Commit messages: imperative, concise. Example: `add core diff engine with path tracking`.

### Before ending a session

Run these checks and confirm all pass before stopping:

```bash
pnpm typecheck     # tsc --noEmit
pnpm lint          # eslint
pnpm test          # vitest
pnpm build         # tsup
```

If any check fails, fix it before ending the session. Do not leave failing checks as a known issue
unless it is genuinely blocked by an upstream dependency that hasn't been implemented yet — in that
case, document it explicitly in a `TODO` comment with the blocking spec number.

---

## What "done" means for the whole project (v1)

The project is considered v1-complete when:

- [ ] `pnpm build` succeeds and produces a working CLI binary
- [ ] `pnpm test` passes with coverage of all core modules
- [ ] `fhir-resource-diff compare examples/patient-a.json examples/patient-b.json` produces correct diff output
- [ ] `fhir-resource-diff validate examples/patient-a.json` exits 0 for valid resources
- [ ] `fhir-resource-diff compare a.json b.json --format json` produces stable JSON output
- [ ] `fhir-resource-diff compare a.json b.json --ignore meta.lastUpdated,id` respects ignore list
- [ ] README accurately describes the tool and includes working examples
- [ ] No TypeScript errors, no lint errors
- [ ] No Node-specific imports in `src/core/` or `src/formatters/`

---

## Spec index

| # | Spec | Key deliverable |
|---|------|----------------|
| 00 | `00-project-setup.md` | package.json, tsconfig, eslint, prettier, vitest |
| 01 | `01-core-types.md` | All shared TypeScript types and interfaces |
| 02 | `02-core-parse-validate.md` | `parse.ts`, `validate.ts` |
| 03 | `03-core-diff-classify.md` | `diff.ts`, `classify.ts` |
| 04 | `04-core-normalize.md` | `normalize.ts` |
| 05 | `05-formatters.md` | `text.ts`, `json.ts`, `markdown.ts` |
| 06 | `06-presets.md` | `ignore-fields.ts`, `normalization.ts` |
| 07 | `07-cli.md` | CLI commands: compare, validate, normalize |
| 08 | `08-examples-fixtures.md` | Example FHIR JSON files and test fixtures |
| 09 | `09-readme.md` | Root README.md |
