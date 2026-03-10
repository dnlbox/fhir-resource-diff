# Spec 05 — Formatters

## Goal

Implement three output formatters in `src/formatters/` that render a `DiffResult` or
`ValidationResult` into a string. All formatters must be browser-safe.

## Dependencies

- Spec 01 (types): `DiffResult`, `DiffEntry`, `DiffChangeKind`, `ValidationResult`
- Spec 03 (diff): `DiffResult` shape is now concrete

## Deliverables

| File | Description |
|------|-------------|
| `src/formatters/text.ts` | Human-readable terminal-style output |
| `src/formatters/json.ts` | Stable, machine-consumable JSON output |
| `src/formatters/markdown.ts` | Markdown output for docs or PR comments |
| `src/formatters/index.ts` | Re-exports all formatters |
| `tests/formatters/text.test.ts` | Tests / snapshots for text formatter |
| `tests/formatters/json.test.ts` | Tests for JSON formatter |
| `tests/formatters/markdown.test.ts` | Tests / snapshots for markdown formatter |

## Key function signatures

Each formatter exports a single function:

```typescript
// text.ts
export function formatText(result: DiffResult): string;

// json.ts
export function formatJson(result: DiffResult): string;

// markdown.ts
export function formatMarkdown(result: DiffResult): string;
```

For validation results, add overloads or separate functions:

```typescript
// text.ts (additional)
export function formatValidationText(result: ValidationResult): string;

// json.ts (additional)
export function formatValidationJson(result: ValidationResult): string;
```

## Implementation notes

### text.ts — expected output shape

```
ResourceType: Patient
Status: 2 difference(s) found

Changed:
  name[0].given[0]: "John" → "Johnny"
  birthDate: "1980-01-01" → "1980-01-02"

Added:
  telecom[1]

Removed:
  identifier[0]
```

Rules:
- Group entries by `kind`: Changed → Added → Removed → Type-changed.
- For `changed` and `type-changed`, show `left → right`. Quote strings. Numbers and booleans unquoted.
- For `added`, show only the path (the full right-side value may be large — omit for v1).
- For `removed`, show only the path.
- If `identical: true`, output: `ResourceType: <type>\nStatus: identical`.
- No ANSI color codes in the formatter — the CLI adapter applies color if desired.

### json.ts — output shape

```json
{
  "resourceType": "Patient",
  "identical": false,
  "entries": [
    { "kind": "changed", "path": "name[0].given[0]", "left": "John", "right": "Johnny" },
    { "kind": "added",   "path": "telecom[1]" },
    { "kind": "removed", "path": "identifier[0]" }
  ]
}
```

Rules:
- Output must be deterministic: same input → same JSON string.
- Use `JSON.stringify(result, null, 2)`.
- Omit `left`/`right` when undefined (JSON.stringify handles this naturally).

### markdown.ts — output shape

```markdown
## Diff: Patient

**Status:** 2 difference(s) found

| Kind | Path | Left | Right |
|------|------|------|-------|
| changed | `name[0].given[0]` | `"John"` | `"Johnny"` |
| added | `telecom[1]` | | |
| removed | `identifier[0]` | | |
```

Rules:
- Wrap path values in backticks.
- Wrap string values in double quotes inside backticks.
- Leave left/right cells empty for added/removed entries.

### Browser safety

- No `node:*` imports.
- No `process`, no `console`. Return a string only.

## Acceptance criteria

```bash
pnpm typecheck   # passes
pnpm test        # all formatter tests pass
```

Tests must cover:

**text:**
- Identical resources → correct "identical" output
- Mixed add/remove/change/type-change → correct grouped sections
- Snapshot test for a representative DiffResult

**json:**
- Output is valid JSON (parseable)
- Round-trip: `JSON.parse(formatJson(result))` equals the result structurally
- Identical resources → `identical: true, entries: []`

**markdown:**
- Output contains a markdown table
- Snapshot test for a representative DiffResult

## Do not do

- Do not add ANSI escape codes or terminal colors in formatters.
- Do not perform any I/O or access `process.stdout` — return strings only.
- Do not truncate or paginate output in v1.
