# AGENTS.md — src/cli/

## Purpose

Thin **Node.js-only** adapter that wires the shared core library to the command line.

## Responsibilities

- Read files from disk (`node:fs`).
- Parse CLI flags and arguments (via `commander`).
- Call core library functions (validate, diff, normalize).
- Pass structured results to a formatter.
- Print formatted output to stdout/stderr.
- Set appropriate exit codes.

## What belongs here

- Command definitions (`commands/compare.ts`, `commands/validate.ts`, etc.).
- File I/O helpers.
- CLI entry point (`index.ts`).
- Flag parsing and option mapping.

## What does NOT belong here

- **Business logic.** Validation rules, diff algorithms, normalization transforms — all of that lives in `src/core/`.
- **Formatting logic.** Rendering a DiffResult to text or JSON lives in `src/formatters/`.
- **Direct `console.log` of results.** Use the formatter, then write the string to stdout.

## Conventions

- Commands should be small: parse args → call core → format → print → exit.
- Use `picocolors` for terminal coloring; keep it optional so CI output stays clean.
- Exit code `0` = success or no differences. Exit code `1` = differences found or validation errors. Exit code `2` = usage/input error.
- CLI help text should include realistic examples matching `docs/PROJECT.md`.

## Testing

- CLI integration tests can live in `tests/cli/`.
- Prefer testing the core functions directly; CLI tests should focus on arg parsing, exit codes, and I/O wiring.
