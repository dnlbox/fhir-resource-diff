# AGENTS.md — fhir-resource-diff

## Project overview

A TypeScript-first CLI **and** reusable library for validating, comparing, and diffing FHIR JSON resources.
The core logic is designed to be **shared** between the CLI (Node.js) and a future React/Vite web app where validation and diffing happen entirely on the client side.

## Architecture (three layers)

```
src/core/        → shared, browser-safe logic (parsing, validation, normalization, diffing, types)
src/formatters/  → output renderers (text, JSON, markdown) — also browser-safe
src/cli/         → Node-only CLI adapter (file I/O, flags, exit codes)
src/presets/     → ignore-field and normalization preset definitions
```

**Rule:** All code under `src/core/` and `src/formatters/` MUST be browser-safe.
Do not import `node:fs`, `node:path`, `node:process`, or any Node-built-in there.
The CLI adapter is the only place that may use Node-specific APIs.

## Stack

| Tool | Purpose |
|------|---------|
| TypeScript (strict) | Language |
| pnpm | Package manager |
| tsup | Build / bundling |
| vitest | Tests |
| eslint + prettier | Linting / formatting |
| zod | Config and schema validation where helpful |
| commander | CLI framework |
| picocolors | Terminal colors (CLI only) |

## Coding conventions

- **No `any`** unless clearly unavoidable and commented with a reason.
- **Explicit return types** on all exported functions.
- **Small, focused modules** — one concept per file.
- **Types-first design** — define the type/interface, then implement.
- **No side effects at import time** — a module should do nothing just by being imported.
- **Pure functions preferred** — especially in `src/core/`.
- **Named exports only** — no default exports.
- **Comments** only for non-obvious intent, trade-offs, or constraints. Never narrate what the code does.

## Quality bar

- Code should look like it was written by a senior engineer for a public open-source utility.
- Prefer **clearer architecture** over more features.
- Prefer **maintainability** over cleverness.
- Prefer **core correctness** over UI polish.
- Every exported function should have at least one corresponding test.

## Commit and PR discipline

- Small, focused commits — one logical change per commit.
- Commit messages: imperative mood, concise summary line, optional body for "why".
- Do not commit generated files, secrets, or proprietary data.

## What NOT to do

- Do not add full FHIR specification parsing in v1.
- Do not add server integration, API calls, databases, or auth.
- Do not add a web frontend until the CLI and core are solid.
- Do not create placeholder directories or files with no real implementation.
- Do not use Node-specific APIs in `src/core/` or `src/formatters/`.
