# Contributing to fhir-resource-diff

## Getting started

```bash
git clone https://github.com/<owner>/fhir-resource-diff.git
cd fhir-resource-diff
pnpm install

# Run the CLI from source — no build step needed
pnpm cli -- compare examples/patient-a.json examples/patient-b.json
pnpm cli -- validate examples/patient-a.json
```

## Code style

See `AGENTS.md` for full conventions. Key points:
- Strict TypeScript — no `any` without a comment justifying it
- Named exports only — no default exports
- `src/core/` and `src/formatters/` must be browser-safe (no Node built-ins)
- Use `@/` path aliases — no relative imports that traverse directories

## Branching and PRs

- Branch off `main`
- Keep commits small and focused; use imperative mood messages
- One PR per feature or fix

## Testing

- `pnpm test` must pass before submitting
- Add tests for any new functionality
- Test files live in `tests/` mirroring `src/` structure

## Quality checks

All four checks must pass:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## What to avoid

- Do not commit generated files (dist/, *.js in src/)
- Do not add Node.js APIs to `src/core/` or `src/formatters/`
- Do not add `tsx` or other dev tools as runtime dependencies
