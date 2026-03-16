# Spec 32 — Pre-commit hooks

**Status:** complete

## Goal

Catch typecheck, lint, and test failures locally before they reach CI.
The last few commits needed follow-up fixes for errors that the CI pipeline
caught but local development didn't — a pre-commit hook closes that gap.

## Background

The project already has `prepublishOnly` guarding releases, but nothing prevents
a broken commit from being pushed. The three checks that have caused CI failures:

- `pnpm typecheck` — type errors (missed return-type change in `compare.ts`)
- `pnpm lint` — ESLint errors (`no-unsafe-return` in test file)
- `pnpm test` — test regressions

`build` is intentionally excluded from the pre-commit hook — it is slow,
already covered by `prepublishOnly`, and not needed to validate correctness
of a commit in progress.

## Tool choice — lefthook

[Lefthook](https://github.com/evilmartians/lefthook) over husky or simple-git-hooks:

- Runs jobs in **parallel by default** — typecheck, lint, and test can run
  concurrently, cutting wait time roughly in half
- Single binary, no Node dependency — not affected by `node_modules` state
- Config lives in `lefthook.yml` at the repo root — explicit and auditable
- Native pnpm support
- Actively maintained; used in production at Shopify, GitHub, and others

`lint-staged` is not needed here — we want to run the full suite, not
just staged-file subsets. Running typecheck on only staged files would miss
cross-file type errors like the `compare.ts` regression.

## Dependencies

None.

## Deliverables

| File | Change |
|------|--------|
| `lefthook.yml` | New — defines pre-commit hook with parallel jobs |
| `package.json` | Add `lefthook` to `devDependencies`; add `prepare` script |
| `CHANGELOG.md` | Add entry under [Unreleased] |

## Configuration

### `lefthook.yml`

```yaml
pre-commit:
  parallel: true
  jobs:
    - name: typecheck
      run: pnpm typecheck

    - name: lint
      run: pnpm lint

    - name: test
      run: pnpm test
```

### `package.json` changes

Add to `devDependencies`:
```json
"lefthook": "^1.x"
```

Add `prepare` script (runs after `pnpm install`, installs git hooks automatically):
```json
"prepare": "lefthook install"
```

## Installation

After `pnpm add -D lefthook`, the `prepare` script means any contributor
who runs `pnpm install` gets the hooks automatically. No manual step needed.

## Acceptance criteria

```bash
# Introduce a type error in any src file — commit should be blocked
pnpm typecheck  # fails
git commit -m "test"  # blocked by lefthook

# Fix the error — commit should succeed
pnpm typecheck  # passes
git commit -m "test"  # allowed

# All three jobs run in parallel and are visible in terminal output
git commit -m "real commit"
# ✔ typecheck
# ✔ lint
# ✔ test
```

## Do not do

- Do not add `build` to the pre-commit hook — it is slow and covered elsewhere
- Do not use `lint-staged` — partial-file checks would miss cross-file errors
- Do not pin lefthook to a patch version — `^1.x` is fine for a dev tool
- Do not add a pre-push hook as well — pre-commit is the right place; pre-push
  adds latency after the work is already done
