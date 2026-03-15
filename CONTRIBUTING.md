# Contributing to fhir-resource-diff

Thank you for your interest in contributing. This document explains what kind
of project this is, what contributions are welcome, and — equally important —
what is intentionally out of scope.

---

## What kind of project this is

Two principles shape every decision in this codebase. Understanding them will
save you time before you write a line of code.

### Functional core, thin adapter

The project is split into two distinct layers:

```
src/core/        browser-safe functional core — no I/O, no side effects
src/formatters/  output renderers — also browser-safe
src/cli/         thin Node.js adapter — file I/O, flags, exit codes only
```

The core has no Node.js APIs. Every function takes data in and returns data
out. This isn't arbitrary constraint — it's what makes the library usable in
browsers, Cloudflare Workers, test harnesses, and AI pipelines without any
configuration. A contribution that introduces `fs`, `path`, `process`, or any
Node built-in into `src/core/` will be declined regardless of how useful the
feature is, because it breaks the browser-safe guarantee.

The CLI is intentionally dumb. It reads files, calls core functions, formats
output, and exits with the right code. No business logic lives there. If you're
adding logic that reasons about FHIR data, it belongs in `src/core/`, not in
the command handler.

### Curated, not complete

This tool does not aim to be a full FHIR validator or a complete implementation
of the FHIR specification. The [HL7 FHIR Validator](https://confluence.hl7.org/display/FHIR/Using+the+FHIR+Validator)
already does that — and we actively point users to it in our output.

What we do instead: curate high-signal checks and data that cover the majority
of real-world FHIR developer needs without requiring StructureDefinition
parsing, package downloads, or a Java runtime. The resource registry, required
field data, status value sets, and key field descriptions are all hand-curated
for the ~20 resource types that cover the vast majority of real-world usage.

**This is a deliberate design decision, not a limitation waiting to be fixed.**
Contributions that attempt to add auto-generated, exhaustive coverage from the
FHIR specification will not be accepted — they change the fundamental character
of the project.

---

## What contributions are welcome

### Genuinely welcome

- New validation rules that catch real developer mistakes without StructureDefinition
  parsing (format patterns, structural shape checks, field type validation)
- Expanding the curated registry with accurate data for additional resource types
- New CLI flags or output format options that serve CI/CD or automation use cases
- Bug fixes in existing rules, diff logic, or formatters
- Improved validation messages that are more actionable
- Test coverage for edge cases not currently covered

### Welcome — but open an issue first

- **New commands** — align on scope before building; a wrong command is harder
  to remove than to never add
- **Changes to the core type model** — `ValidationError`, `DiffEntry`, etc. have
  downstream effects on library consumers
- **Performance improvements** — welcome, but not at the cost of readability

### Out of scope — will not be accepted

| Contribution | Why |
|---|---|
| StructureDefinition loading or parsing at runtime | Changes the fundamental character of the project |
| Bundling FHIR packages (`.tgz` from npm.pkg.hl7.org) | Adds download/maintenance surface |
| XML ↔ JSON conversion | Different problem; use the [`fhir`](https://www.npmjs.com/package/fhir) package |
| FHIRPath evaluation | Out of scope; use [`@medplum/core`](https://www.npmjs.com/package/@medplum/core) |
| Full terminology validation (ValueSet expansion, CodeSystem lookup) | Requires live terminology server |
| Profile conformance evaluation | We surface profile declarations; the HL7 Validator evaluates them |
| CDA, HL7v2, or any non-FHIR-JSON format | Different domain entirely |

---

## Spec-driven development

Significant features start as a spec file in `docs/specs/` before any code
is written. Specs define the goal, interface design, acceptance criteria, and
explicit out-of-scope items. This lets us align on direction before effort is
invested.

**To find open specs:**
```bash
grep -rL "Status.*complete" docs/specs/*.md
```

**Before building a significant feature:** open a GitHub issue with a draft
spec. This takes 15 minutes and prevents you from writing code that won't be
accepted. See [`docs/specs/ORCHESTRATOR.md`](docs/specs/ORCHESTRATOR.md) for
the spec format and current build order.

---

## Setup

```bash
git clone https://github.com/dnlbox/fhir-resource-diff.git
cd fhir-resource-diff
pnpm install
```

Run the CLI from source — no build step needed:

```bash
pnpm cli -- compare examples/patient-a.json examples/patient-b.json
pnpm cli -- validate examples/patient-a.json --fhir-version R4
```

The `--` separator is required so pnpm passes flags to the script rather than
consuming them itself. `tsx` runs the TypeScript source directly — no build,
no watch needed during development.

### Scripts

| Script | Purpose |
|--------|---------|
| `pnpm cli -- <args>` | Run CLI from source |
| `pnpm test` | Run all tests |
| `pnpm test:watch` | Tests in watch mode |
| `pnpm typecheck` | TypeScript type checking |
| `pnpm lint` | ESLint |
| `pnpm build` | Production build |

### Before submitting

All four checks must pass:

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

Tests in `src/core/` should be pure unit tests — no file I/O, no network,
no subprocess spawning. Pass data directly to functions.

---

## Code style

See [`AGENTS.md`](AGENTS.md) for the full conventions. The key patterns:

**Pure functions over classes.** State is passed as parameters, not stored
on objects. `src/core/` has no classes. A function that needs configuration
takes it as an argument.

```typescript
// No
class Validator {
  private version: FhirVersion;
  validate(resource: FhirResource) { ... }
}

// Yes
function validate(resource: FhirResource, version?: FhirVersion): ValidationResult { ... }
```

**No mutation of inputs.** Functions return new values. Use `structuredClone`
before any in-place transformation — the caller's data is never modified.

**Guard clauses over nesting.** Handle edge cases first and return early.
The happy path should be the last thing in the function, at the lowest
indentation level.

```typescript
// No
function process(resource: FhirResource) {
  if (resource) {
    if (resource.id) {
      // happy path buried at level 2
    }
  }
}

// Yes
function process(resource: FhirResource) {
  if (!resource) return;
  if (!resource.id) return;
  // happy path here
}
```

**Named constants for patterns.** Regex, date formats, and opaque string
literals become named constants before use. The name explains the intent;
the pattern is a detail.

**Explicit over implicit.** Verbose but clear TypeScript over terse but
mysterious one-liners. This is a library that other people read and maintain.

---

## The project's scope in one test

When in doubt about whether a contribution fits, ask:

> *Does this make the tool more useful for a developer who has a FHIR JSON
> file and needs to understand it quickly?*

If the answer isn't clearly yes — if it requires a running server, a package
download, an external service, or a Java runtime — it's probably out of scope.
The value of this tool is that it works locally, fast, with no infrastructure
dependency.
