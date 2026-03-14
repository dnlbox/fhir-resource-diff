# Spec 09 — README

**Status:** complete

## Goal

Write `README.md` at the repo root. It should look like the README of a serious, public
open-source engineering project — not a tutorial, not a toy. A senior healthtech engineer
should read it and immediately understand what this is, why it exists, and how to use it.

## Dependencies

- All previous specs complete and working
- Example files exist in `examples/`
- CLI is functional (`pnpm build` succeeds)

## Deliverables

| File | Description |
|------|-------------|
| `README.md` | Root README |

## Required sections (in order)

### 1. Header

Project name as `h1`. One-sentence description. Badges (optional for v1, but if included: build
status, npm version, license).

### 2. Why this exists (2–3 sentences)

FHIR resources evolve — across API versions, profiles, and integration points. Diff tooling for
FHIR is sparse. This tool fills that gap for developers and CI pipelines.

### 3. Features

Bullet list. Concrete, not vague:
- Compare two FHIR JSON resources and see exactly what changed
- Validate resource shape before diffing
- Normalize resources before comparison (sort keys, trim strings, normalize dates)
- Named presets for common ignore patterns (`metadata`, `clinical`, `strict`)
- Output as human-readable text, JSON, or Markdown
- Browser-safe core library — works in Node.js and future web apps
- Written in TypeScript with full type exports

### 4. Install

```bash
npm install -g fhir-resource-diff
# or
pnpm add -g fhir-resource-diff
```

### 5. Quick start

Show the three most common commands with their expected output. Use the actual example files
from `examples/`. Show real-looking output (copy from a real run if possible):

```bash
fhir-resource-diff compare examples/patient-a.json examples/patient-b.json
fhir-resource-diff validate examples/patient-a.json
fhir-resource-diff compare a.json b.json --format json
```

Include a short block of sample text output showing the diff format.

### 6. CLI reference

A concise table or code blocks for each command (`compare`, `validate`, `normalize`).
Show all flags. Do not be exhaustive — link to `--help` for full details.

### 7. Library usage (for programmatic use)

Short example showing how to use the core library directly from TypeScript/Node:

```typescript
import { parseJson, validate, diff, formatText } from "fhir-resource-diff";

const left = parseJson(rawJsonStringA);
const right = parseJson(rawJsonStringB);

if (left.success && right.success) {
  const result = diff(left.resource, right.resource, {
    ignorePaths: ["meta.lastUpdated", "id"],
  });
  console.log(formatText(result));
}
```

Note that `parseJson`, `validate`, `diff`, and the formatters are all browser-safe and can be
used in a React/Vite app or any bundler.

### 8. Architecture overview

A brief (3–4 sentence) description of the three-layer architecture:
- **Core library** (`src/core/`): browser-safe shared logic — parsing, validation, normalization,
  diffing. No Node.js dependencies.
- **Formatters** (`src/formatters/`): pure string renderers — text, JSON, markdown. Also browser-safe.
- **CLI adapter** (`src/cli/`): thin Node.js layer — reads files, parses flags, calls core, prints output.

This separation means the same validation and diff logic can power both the CLI and a future
hosted web app.

### 9. Roadmap

Phase 1 (current): core diff engine, validation, CLI, text/JSON output.
Phase 2: normalization presets, markdown formatter, hardened browser-safe core, integration
points for a future React/Vite web app.
Phase 3: profile-aware comparison, bundle support, richer semantic diffing, initial hosted app.

### 10. Contributing

One short paragraph. Point to standard open source practices: fork, branch, PR. Mention that
`pnpm test` and `pnpm typecheck` must pass before submitting.

### 11. License

MIT.

## Tone and style

- Direct. No fluff sentences like "In today's modern healthcare ecosystem...".
- Practical. Show code; don't describe code.
- Confident. The tool exists, it works, here is how to use it.
- No emojis in section headers.
- Use code blocks for all commands and code examples.

## Acceptance criteria

- The README renders correctly in GitHub markdown (check locally with a markdown previewer).
- All code examples are syntactically correct.
- `install` instructions match what the actual package exports.
- Sample CLI output matches actual CLI output.
- No placeholder text like `[TODO]` or `[INSERT HERE]`.

## Do not do

- Do not add a long history or origin story.
- Do not include a "Motivation" section that reads like a blog post.
- Do not add contributor avatars, sponsors, or social links.
- Do not promise features that are not yet implemented.
