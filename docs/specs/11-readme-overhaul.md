# Spec 11 — README overhaul

**Status:** complete

## Goal

Rewrite the README to position the tool as a credible FHIR interoperability utility used by
three audiences: **developers at a terminal**, **CI pipelines**, and **AI agents / test harnesses**.
Connect it to the HL7 ecosystem, explain supported FHIR versions, and make the development
workflow discoverable. The README is the first thing engineers evaluate — it must inspire
confidence.

## Dependencies

- Spec 10 (dev experience) — Development section content
- Spec 20 (CI and automation affordances) — `--quiet`, `--envelope` flags
- Ideally done after specs 12–15, 20 so it can reference version support, `info`,
  `list-resources`, and automation features

## Deliverables

| File | Description |
|------|-------------|
| `README.md` | Full rewrite with all sections below |

## Sections and structure

The README should contain these sections in order:

### 1. Title and tagline

```markdown
# fhir-resource-diff

Structural diff, validation, and normalization for FHIR R4 / R4B / R5 JSON resources.
```

### 2. Badges (one line)

Build status, npm version, license. Use shields.io or equivalent.
Placeholders are fine until CI is configured — the format matters more than live badges.

### 3. What is FHIR? (brief)

2–3 sentences for newcomers. Link to https://hl7.org/fhir/ as the canonical source.
Do NOT replicate the FHIR spec. Example:

> FHIR (Fast Healthcare Interoperability Resources) is the modern standard for exchanging
> healthcare data, published by HL7. This tool works with FHIR JSON resources — the building
> blocks of healthcare APIs. → [Learn more at hl7.org/fhir](https://hl7.org/fhir/)

### 4. Why this exists

Keep the existing "Why this exists" content but tighten it. Mention that FHIR tooling for
developers (outside of Java validators) is sparse, and this tool fills the gap for TypeScript,
CI pipelines, and automated tooling (including AI agents that troubleshoot FHIR payloads).

### 5. Features

Update the feature list to include version-aware and automation features:
- Multi-version support (R4, R4B, R5)
- Resource type lookup with HL7 documentation links
- Resource discovery via `list-resources`
- Stdin/pipe support for unix composability and automated tooling
- Machine-consumable JSON output with summary counts, doc URLs, and metadata envelope
- `--quiet` mode for headless CI (exit code only, no stdout)
- `--exit-on-diff` for CI gate checks
- Full TypeScript library API — import `diff()`, `validate()`, `parseJson()` directly

### 6. Supported FHIR versions

A small table:

| Version | Status | Spec URL |
|---------|--------|----------|
| R4 (4.0.1) | Default, fully supported | https://hl7.org/fhir/R4/ |
| R4B (4.3.0) | Supported | https://hl7.org/fhir/R4B/ |
| R5 (5.0.0) | Supported | https://hl7.org/fhir/R5/ |

### 7. Install

Keep existing. Add a note about global install vs project-local.

### 8. Quick start

Keep existing examples. Add one new example showing `--fhir-version`:

```bash
fhir-resource-diff validate examples/r5/patient-a.json --fhir-version R5
```

### 9. CLI reference

Keep the existing command reference. Add new commands:
- `info <resourceType>` with `--fhir-version`, `--format`
- `list-resources` with `--fhir-version`, `--category`, `--format`

For each command, add a brief one-line description and link to HL7 where relevant.

### 10. Use in CI

New section. Show how to use `fhir-resource-diff` as a CI gate. Include:

**GitHub Actions example:**

```yaml
- name: Validate FHIR resource
  run: fhir-resource-diff validate payload.json --format json --fhir-version R4

- name: Diff against expected baseline
  run: |
    fhir-resource-diff compare expected.json actual.json \
      --format json --exit-on-diff --preset metadata --quiet
```

**Key points to document:**
- `--exit-on-diff` exits 1 when differences are found → fails the CI step
- `--quiet` suppresses stdout — useful when you only need the exit code
- `--format json` produces machine-parseable output for downstream tooling
- `--format json --envelope` wraps results in a metadata envelope with summary counts,
  tool version, FHIR version, and HL7 documentation URL
- Exit codes: 0 = success, 1 = differences found / validation errors, 2 = input error

### 11. Use with AI agents and test harnesses

New section. Show how automated tools consume `fhir-resource-diff` — both as a CLI via
stdin and as a TypeScript library.

**CLI — agent validates a payload from memory (no temp file):**

```bash
echo '$FHIR_PAYLOAD' | fhir-resource-diff validate - --format json --fhir-version R4
```

**CLI — agent diffs actual vs expected and gets structured output:**

```bash
echo '$ACTUAL_PAYLOAD' | fhir-resource-diff compare - expected.json \
  --format json --envelope --preset metadata
```

The `--envelope` JSON output is designed for automated consumers:

```json
{
  "tool": "fhir-resource-diff",
  "version": "0.2.0",
  "command": "compare",
  "fhirVersion": "R4",
  "resourceType": "Patient",
  "identical": false,
  "summary": { "added": 5, "removed": 0, "changed": 3, "typeChanged": 0 },
  "entries": [...],
  "documentation": "https://hl7.org/fhir/R4/patient.html"
}
```

An agent can parse this once and know: what changed, how many changes, what FHIR version,
and where to find the HL7 docs — without a second tool call.

**TypeScript library — agent harness imports directly:**

```typescript
import { parseJson, validate, diff, formatJson } from "fhir-resource-diff";

const parsed = parseJson(responseBody);
if (!parsed.success) {
  throw new Error(`Invalid FHIR JSON: ${parsed.error}`);
}

const validation = validate(parsed.resource, "R4");
if (!validation.valid) {
  const errors = validation.errors.filter(e => e.severity === "error");
  // errors[].docUrl points to the relevant HL7 page
}

const result = diff(parsed.resource, expectedFixture, {
  ignorePaths: ["meta.lastUpdated", "id"],
});
if (!result.identical) {
  // result.entries has structured diff for programmatic inspection
}
```

### 12. Library usage (general)

Keep existing programmatic usage section. Move it after the CI and agent sections since
those are the primary programmatic audiences.

### 13. Architecture overview

Replace the current paragraph with a small ASCII diagram:

```
┌─────────────────────────────────────────────────┐
│  CLI adapter (src/cli/)                         │
│  Node.js only — file I/O, flags, exit codes     │
├─────────────────────────────────────────────────┤
│  Formatters (src/formatters/)                   │
│  Browser-safe — text, JSON, markdown renderers  │
├─────────────────────────────────────────────────┤
│  Core library (src/core/)                       │
│  Browser-safe — parse, validate, diff, version  │
├─────────────────────────────────────────────────┤
│  Presets (src/presets/)                          │
│  Browser-safe — ignore fields, normalization    │
└─────────────────────────────────────────────────┘
```

Followed by 2–3 sentences explaining the layering.

### 14. Development

From spec 10. Prerequisites, setup, `pnpm cli`, common scripts table.

### 15. Roadmap

Update to reflect Phase 2 (current) and Phase 3 (future):

- **Phase 1** (complete): core diff engine, validation, CLI, text/JSON/markdown output
- **Phase 2** (current): multi-version FHIR support, resource registry, `info` and
  `list-resources` commands, stdin/pipe support, developer experience improvements
- **Phase 3** (planned): profile-aware comparison, bundle support, richer semantic diffing,
  initial hosted web app

### 16. Related resources

Link to:
- https://hl7.org/fhir/ — FHIR specification
- https://hl7.org/fhir/resourcelist.html — resource type listing
- https://hl7.org/fhir/R4/ / R4B / R5 — version-specific specs
- https://confluence.hl7.org/display/FHIR/FHIR+Tooling — HL7 FHIR tooling ecosystem

### 17. License

Keep MIT.

## Implementation notes

- The README should be around 250–300 lines. The CI and agent sections add necessary length.
- Do not duplicate HL7 documentation. Link to it. The CLI's job is to be useful enough in the
  terminal and point users to HL7 when they need deeper info.
- Write for three audiences: developers at a terminal, CI pipeline authors, and AI agent/harness
  builders. Each should find a section that speaks directly to their use case.
- Tone: professional, direct, practical. Not academic, not marketing.

## Acceptance criteria

- README contains all 17 sections listed above
- CI section includes a working GitHub Actions snippet
- Agent section includes both CLI (stdin) and TypeScript library examples
- The `--envelope` JSON example is accurate and matches spec 20's output shape
- All links are valid
- All CLI examples in the README actually work (`pnpm cli -- <example>`)
- README renders correctly on GitHub (check markdown preview)
- No broken badge URLs (placeholders are acceptable)

## Do not do

- Do not replicate FHIR spec content — link to it.
- Do not include screenshots of terminal output — code blocks are sufficient.
- Do not add a changelog to the README — that belongs in CHANGELOG.md if needed later.
- Do not exceed 300 lines.
