# Spec 26 — CONTRIBUTING.md overhaul

**Status:** open

## Goal

Rewrite CONTRIBUTING.md to reflect the actual character of this project — its
functional programming paradigm, its deliberately bounded scope, and its
spec-driven development process. The current version is a generic checklist.
The new version should make it immediately clear what kind of project this is,
what contributions are welcome, and — just as importantly — what is explicitly
out of scope so contributors don't invest effort in the wrong direction.

## Dependencies

None. Documentation only — no code changes.

## Deliverables

| File | Change |
|------|--------|
| `CONTRIBUTING.md` | Full rewrite |

## Content outline

### 1. What kind of project this is (philosophy first)

Before any setup instructions, explain the two foundational principles that
shape every decision in the codebase. Contributors who don't understand these
will pull in the wrong direction.

**Functional core, thin adapter:**

The project is split into a browser-safe functional core (`src/core/`,
`src/formatters/`) and a thin Node.js CLI adapter (`src/cli/`). The core has
no side effects, no I/O, no Node APIs. Every function takes data in and
returns data out. This isn't an accident — it's what makes the library usable
in browsers, Cloudflare Workers, test harnesses, and AI pipelines without
configuration. Any contribution that introduces side effects or Node-specific
APIs into the core will be declined regardless of functionality.

**Curated, not complete:**

This tool does not aim to be a full FHIR validator or a complete implementation
of the FHIR specification. The HL7 FHIR Validator already does that, and we
actively point users to it. What we do instead: curate high-signal checks and
data that cover the majority of real-world FHIR developer needs without
requiring StructureDefinition parsing, package downloads, or a Java runtime.

The resource registry, required field data, status value sets, and key field
descriptions are all hand-curated for the top ~20 resource types by real-world
usage. This is a deliberate design decision, not a limitation waiting to be
fixed. Contributions that attempt to add auto-generated, exhaustive field
coverage from the FHIR spec will not be accepted — they change the fundamental
character of the project.

### 2. What contributions are welcome

**Genuinely welcome:**
- New validation rules that catch real developer mistakes without needing
  StructureDefinition parsing (format, pattern, structural shape)
- Expanding the curated registry with accurate data for additional resource types
- New output formats or CLI flags that serve CI/CD or agent use cases
- Bug fixes in existing rules, diff logic, or formatters
- Improved error messages that are more actionable
- Test coverage for edge cases not currently covered

**Welcome with discussion first:**
- New commands — open an issue before building to align on scope
- Changes to the core type model — these have downstream effects
- Performance improvements — welcome, but not at the cost of readability

**Out of scope (will not be accepted):**
- StructureDefinition loading or parsing at runtime
- Bundling FHIR packages (`.tgz` files from npm.pkg.hl7.org)
- XML ↔ JSON conversion — this is a different problem; use the `fhir` package
- FHIRPath evaluation — out of scope; use `@medplum/core`
- Full terminology validation (ValueSet expansion, CodeSystem lookup)
- Profile conformance checking — we surface profile declarations and link to
  the HL7 Validator; we don't evaluate StructureDefinition constraints
- CDA, HL7v2, or any non-FHIR-JSON format

### 3. Architecture in one diagram

Reproduce the architecture overview from the README with added notes:
- What "browser-safe" means in practice (no `fs`, `path`, `process`, `os`)
- Why the core is kept free of Node APIs (testability, bundler compatibility,
  future web app use case)
- How the CLI is intentionally dumb — it reads files, calls core functions,
  formats output, exits with the right code. No business logic in the CLI.

### 4. Spec-driven development

New features are designed as spec files in `docs/specs/` before implementation.
Explain:
- Why: specs let us align on scope, interface design, and acceptance criteria
  before writing code — especially useful for async/distributed contribution
- The spec format (Goal, Dependencies, Deliverables, Key interfaces, Implementation
  notes, Acceptance criteria, Do not do)
- Where to find open specs: `grep -rL "Status.*complete" docs/specs/*.md`
- For significant features: open an issue linking to a draft spec before
  implementing — makes review faster and prevents wasted effort

### 5. Setup and workflow (the mechanics)

Keep this section, but tighten it. Current content is fine — clone, install,
`pnpm cli`, scripts table. Add:
- Note that `tsx` is used for zero-build local development (`pnpm cli` runs
  the TypeScript source directly)
- The `--` separator after `pnpm cli` (explain why it's needed)
- That `src/core/` tests should be pure unit tests with no file I/O

### 6. Code style essentials

Summarise the functional style expectations:
- **Pure functions over classes** — state is passed as parameters, not stored
  on objects. No classes in `src/core/`.
- **No mutation of inputs** — functions return new values; inputs are never
  modified. `structuredClone` before any in-place work.
- **Guard clauses over nesting** — early returns for invalid/edge cases; the
  happy path stays at the lowest indentation level.
- **Named constants for patterns** — regex, date formats, and opaque strings
  become named constants before use.
- **Explicit > implicit** — verbose but clear TypeScript over terse but
  mysterious one-liners. This is a library that others read.

Keep the existing mechanical rules (no `any`, no default exports, `@/` aliases,
browser-safe core).

### 7. The "do not do" ethos

CONTRIBUTING.md should end with a short section that is direct about the
project's identity:

> This project is intentionally bounded. The FHIR ecosystem already has tools
> that do full conformance validation. Our value is a developer-friendly
> diff and validation layer that works locally, fast, with no infrastructure
> dependency. When in doubt about whether a contribution fits, ask: "does this
> make the tool more useful for a developer who has a FHIR JSON file and
> needs to understand it quickly?" If the answer isn't clearly yes, it's
> probably out of scope.

## Acceptance criteria

- [ ] CONTRIBUTING.md reads as a document that explains the project, not just
  a process checklist
- [ ] A first-time contributor can read it and understand why the architectural
  constraints exist, not just what they are
- [ ] The "out of scope" section is specific enough that someone considering a
  StructureDefinition PR would self-select out before writing code
- [ ] The functional programming expectations are concrete with examples or
  named patterns (guard clauses, pure functions, no mutation)
- [ ] Links to `AGENTS.md`, `docs/specs/ORCHESTRATOR.md`, and the README
  ecosystem section are included where relevant

## Do not do

- Do not make CONTRIBUTING.md longer than it needs to be — if it's too long,
  contributors won't read it. Every section should earn its place.
- Do not duplicate content already in `AGENTS.md` — link to it instead
- Do not add a code of conduct here — that is a separate file if needed
