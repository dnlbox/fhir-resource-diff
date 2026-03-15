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

### Phase 2 — from toy to tool (specs 10–19)

```
10-dev-experience         (depends on: 00–09 complete)
       │
12-fhir-version-model     (depends on: 01)
       │
13-resource-type-registry  (depends on: 12)
       │
       ├──── 14-info-command         (depends on: 12, 13)
       ├──── 15-list-resources       (depends on: 12, 13)
       │
16-version-flag-existing   (depends on: 12)
       │
17-version-aware-validation (depends on: 12, 13, 16)
       │
18-multi-version-fixtures  (depends on: 12, 13)
       │
19-stdin-pipe-support      (depends on: 00–09; parallelizable with 12–18)
       │
20-ci-automation-affordances (depends on: 12, 13, 16)
       │
11-readme-overhaul        (depends on: 10, 12–15, 20; do last)
```

**Parallelization guide:**
- Specs 10 and 19 have no Phase 2 dependencies — can run in parallel from the start.
- Spec 12 is the Phase 2 foundation — start it as soon as v1 is verified.
- Specs 13 depends on 12. Specs 14 and 15 depend on 13 and can run in parallel with each other.
- Spec 16 depends only on 12 and can run in parallel with 13–15.
- Spec 17 depends on 12, 13, and 16.
- Spec 18 depends on 12 and 13.
- Spec 20 depends on 12, 13, and 16 — can run in parallel with 14, 15, 17, 18.
- Spec 11 should be done last so it can reference all new features including spec 20.

### Phase 3 — validation rules (specs 21–23)

```
21-format-validation-rules       (depends on: 01, 02, 12, 13)
       │
       ├──── 22-structural-validation-rules   (depends on: 21)
       │
       └──── 23-profile-awareness             (depends on: 21)
```

**Parallelization guide:**
- Spec 21 must be done first — it creates the rules infrastructure (ValidationRule type, walkResource, runRules).
- Specs 22 and 23 both depend on 21 and can run in parallel with each other.

### Phase 4 — security and ops (spec 24)

```
24-snyk-github-action   (no code dependencies — requires Snyk portal setup first)
```

**Note:** Spec 24 has no source code dependencies. It only requires the Snyk portal
prerequisites (account, token, GitHub secret) before the workflow file is committed.

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

- [x] `pnpm build` succeeds and produces a working CLI binary
- [x] `pnpm test` passes with coverage of all core modules
- [x] `fhir-resource-diff compare examples/patient-a.json examples/patient-b.json` produces correct diff output
- [x] `fhir-resource-diff validate examples/patient-a.json` exits 0 for valid resources
- [x] `fhir-resource-diff compare a.json b.json --format json` produces stable JSON output
- [x] `fhir-resource-diff compare a.json b.json --ignore meta.lastUpdated,id` respects ignore list
- [x] README accurately describes the tool and includes working examples
- [x] No TypeScript errors, no lint errors
- [x] No Node-specific imports in `src/core/` or `src/formatters/`

---

## Spec index

| # | Spec | Key deliverable | Status |
|---|------|----------------|--------|
| 00 | `00-project-setup.md` | package.json, tsconfig, eslint, prettier, vitest | ✓ complete |
| 01 | `01-core-types.md` | All shared TypeScript types and interfaces | ✓ complete |
| 02 | `02-core-parse-validate.md` | `parse.ts`, `validate.ts` | ✓ complete |
| 03 | `03-core-diff-classify.md` | `diff.ts`, `classify.ts` | ✓ complete |
| 04 | `04-core-normalize.md` | `normalize.ts` | ✓ complete |
| 05 | `05-formatters.md` | `text.ts`, `json.ts`, `markdown.ts` | ✓ complete |
| 06 | `06-presets.md` | `ignore-fields.ts`, `normalization.ts` | ✓ complete |
| 07 | `07-cli.md` | CLI commands: compare, validate, normalize | ✓ complete |
| 08 | `08-examples-fixtures.md` | Example FHIR JSON files and test fixtures | ✓ complete |
| 09 | `09-readme.md` | Root README.md | ✓ complete |

### Phase 2

| # | Spec | Key deliverable | Status |
|---|------|-----------------|--------|
| 10 | `10-dev-experience.md` | tsx, `pnpm cli` script, CONTRIBUTING.md | ✓ complete |
| 11 | `11-readme-overhaul.md` | README rewrite with HL7 links and FHIR version context | ✓ complete |
| 12 | `12-fhir-version-model.md` | `FhirVersion` type, detection, URL helpers | ✓ complete |
| 13 | `13-resource-type-registry.md` | Curated resource type registry with HL7 doc URLs | ✓ complete |
| 14 | `14-info-command.md` | `info <resourceType>` CLI command | ✓ complete |
| 15 | `15-list-resources.md` | `list-resources` CLI command | ✓ complete |
| 16 | `16-version-flag-existing.md` | `--fhir-version` flag on compare, validate, normalize | ✓ complete |
| 17 | `17-version-aware-validation.md` | Severity model, version-aware structural validation | ✓ complete |
| 18 | `18-multi-version-fixtures.md` | R4B and R5 example resources | ✓ complete |
| 19 | `19-stdin-pipe-support.md` | Stdin/pipe support (`-` as file argument) | ✓ complete |
| 20 | `20-ci-automation-affordances.md` | `--quiet`, `--envelope`, summary counts for CI/agents | ✓ complete |

### Phase 3

| # | Spec | Key deliverable | Status |
|---|------|-----------------|--------|
| 21 | `21-format-validation-rules.md` | FHIR id, date, reference format checks | ✓ complete |
| 22 | `22-structural-validation-rules.md` | Required fields, status value sets, CodeableConcept shape | open |
| 23 | `23-profile-awareness.md` | Profile URL validation, IG registry, named profile recognition | open |

### Phase 4

| # | Spec | Key deliverable | Status |
|---|------|-----------------|--------|
| 24 | `24-snyk-github-action.md` | Snyk dependency scan GitHub Action + portal setup guide | open |
| 25 | `25-info-command-enrichment.md` | Maturity level, use cases, key fields, version notes in `info` | open |
