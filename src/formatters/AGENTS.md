# AGENTS.md — src/formatters/

## Purpose

Render a structured `DiffResult` (or `ValidationResult`) into a human- or machine-consumable string.

## Browser-safety rule

Formatters must be **browser-safe** — they will be reused in the future React/Vite app.
Do not import Node built-ins. Do not write to stdout. Return a string; let the caller decide where it goes.

## Modules

| File | Format |
|------|--------|
| `text.ts` | Human-readable terminal-style output |
| `json.ts` | Stable, machine-consumable JSON |
| `markdown.ts` | Markdown table/list output for docs or PR comments |

## Conventions

- Each formatter exports a single function: `(result: DiffResult, options?: FormatterOptions) => string`.
- **No side effects.** Formatters are pure functions — they receive data and return a string.
- **No coloring in formatters.** ANSI color codes are a CLI concern. The CLI adapter can post-process the text formatter's output if color is desired, or a separate `colorize` wrapper can be used.
- Keep output deterministic — same input always produces the same string.

## Testing

- Formatter tests live in `tests/formatters/`.
- Use snapshot tests for output stability where appropriate.
- Test with non-trivial DiffResults that include adds, removes, changes, and nested paths.
