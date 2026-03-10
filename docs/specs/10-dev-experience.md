# Spec 10 — Developer experience & local CLI

## Goal

Make local development frictionless. A contributor should be able to clone, install, and run
the CLI in under 2 minutes without reading source code or running a build step first.

## Dependencies

- Specs 00–09 complete (v1 baseline)

## Deliverables

| File | Description |
|------|-------------|
| `package.json` | Add `tsx` devDependency, add `cli` and `cli:watch` scripts |
| `README.md` | Add a **Development** section with the full dev workflow |
| `CONTRIBUTING.md` | Root-level contribution guide with code style, PR, and local dev instructions |

## Key changes

### package.json — new scripts

```json
{
  "scripts": {
    "cli": "tsx src/cli/index.ts",
    "cli:watch": "tsx --watch src/cli/index.ts"
  }
}
```

Add `tsx` to `devDependencies` (latest `^4.x`). `tsx` is already a transitive dependency via
vitest, but it must be an explicit devDependency to guarantee availability.

### Usage

```bash
# Run CLI from source — no build needed
pnpm cli -- compare examples/patient-a.json examples/patient-b.json

# Run with watch mode (re-runs on source change)
pnpm cli:watch -- validate examples/patient-a.json

# Existing commands still work
pnpm build          # production build
pnpm dev            # tsup --watch (rebuilds dist/ on change)
pnpm test           # vitest
```

Note: the `--` separator after `pnpm cli` is required so pnpm passes flags to the script
rather than consuming them. Document this clearly.

### README — Development section

Add a new section after "Contributing" (or replace it). Content:

```markdown
## Development

### Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9

### Setup

git clone https://github.com/<owner>/fhir-resource-diff.git
cd fhir-resource-diff
pnpm install

### Run the CLI locally (no build needed)

pnpm cli -- compare examples/patient-a.json examples/patient-b.json
pnpm cli -- validate examples/patient-a.json
pnpm cli -- normalize examples/observation-a.json

### Common scripts

| Script | Purpose |
|--------|---------|
| pnpm cli -- <args> | Run CLI from source via tsx |
| pnpm test | Run tests |
| pnpm test:watch | Run tests in watch mode |
| pnpm typecheck | TypeScript type checking |
| pnpm lint | ESLint |
| pnpm build | Production build (tsup) |
| pnpm dev | Watch mode build (tsup --watch) |
```

### CONTRIBUTING.md

Create at project root. Include:

1. **Getting started** — clone, install, run the CLI from source
2. **Code style** — refer to AGENTS.md conventions (strict TS, no `any`, named exports, etc.)
3. **Branching and PRs** — branch off `main`, small focused commits, imperative mood messages
4. **Testing** — `pnpm test` must pass; add tests for new functionality
5. **Quality checks** — `pnpm typecheck && pnpm lint && pnpm test && pnpm build` must all pass
6. **What to avoid** — don't commit generated files, don't add Node APIs to `src/core/` or
   `src/formatters/`

Keep it concise — under 80 lines. Link to AGENTS.md for detailed architecture decisions.

## Implementation notes

- `tsx` uses esbuild under the hood and handles the `@/*` path alias if `tsconfig.json` paths
  are configured. Verify this works with the existing `@/` alias by testing the `cli` script.
- If `tsx` does not resolve `@/` aliases out of the box, use `tsx --tsconfig tsconfig.json` or
  add `tsup`-style path rewriting. The simplest fix is usually
  `"cli": "tsx --tsconfig tsconfig.json src/cli/index.ts"`.
- `cli:watch` is convenient for iterating on CLI output during development but is not essential
  if it causes issues. At minimum, `pnpm cli` must work reliably.

## Acceptance criteria

```bash
# Fresh clone workflow
pnpm install
pnpm cli -- --help
# → shows help output without prior pnpm build

pnpm cli -- compare examples/patient-a.json examples/patient-b.json
# → correct diff output

pnpm cli -- validate examples/patient-a.json
# → "valid"

# Existing commands still work
pnpm build
pnpm typecheck
pnpm lint
pnpm test
```

- `CONTRIBUTING.md` exists at project root
- README contains a Development section with working examples

## Do not do

- Do not remove or modify the existing `build`, `dev`, or `prepublishOnly` scripts.
- Do not add `tsx` as a runtime dependency — it is dev-only.
- Do not install `ts-node` — `tsx` is faster and simpler for ESM projects.
- Do not create a separate `bin/dev` shell script — the pnpm script is sufficient.
