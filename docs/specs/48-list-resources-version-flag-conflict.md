---
**Status:** complete
---

# Spec 48 — `list-resources --version` conflict with root `--version`

## Goal

Commander.js intercepts `--version` at the root program level before subcommand option parsing.
This means `fhir-resource-diff list-resources --version R4` prints the CLI version number
(`0.1.0`) and exits, ignoring `R4` entirely — even though `--version` is not a valid option for
`list-resources` (the correct flag is `--fhir-version`).

```bash
fhir-resource-diff list-resources --fhir-version R4   # works correctly
fhir-resource-diff list-resources --version R4        # prints "0.1.0" and exits — confusing
```

The correct flag is `--fhir-version`, not `--version`. The problem is that Commander's root
`-V, --version` fires before the subcommand sees `--version R4`, so the argument `R4` is silently
dropped.

## Why this matters

Users coming from `validate` and `compare` (both of which use `--fhir-version`) know the flag.
But users who shorthand to `--version` get a plausible-looking result (a version number) that
looks correct rather than an error — they won't know the filter was ignored.

## Fix

Two changes, both needed:

### 1. Rename root version flag to `-V` only (drop `--version` long form)

Commander.js allows `program.version(ver, flags)` to customise the flags. Change from the default
`-V, --version` to just `-V`:

```typescript
// src/cli/index.ts
program
  .name("fhir-resource-diff")
  .version(PACKAGE_VERSION, "-V")  // remove --version long form
  ...
```

This prevents `--version` from being reserved at the root, so subcommand parsers can see it.
However, `--version` as a subcommand option is still confusing UX — prefer solution 2.

### 2. Keep `--fhir-version` as the canonical name; reject `--version` in subcommands with a hint

Rather than allowing `--version` to work as a subcommand option (which is still confusing because
`--version` conventionally means "print version"), keep `--fhir-version` as the only valid name
and improve the error. When a user runs `list-resources --version R4`, they should see:

```
error: unknown option '--version'
hint: did you mean '--fhir-version'?
```

Commander.js supports `addHelpText` and custom error handlers. Use `program.configureOutput` or
`.on('option:version', ...)` hooks to emit a targeted hint.

### Preferred approach

Both together:
- Remove `--version` long form from root (`-V` only for version)
- The hint for `--fhir-version` is a nice-to-have but not required if removal alone fixes it

## Deliverables

| File | Change |
|------|--------|
| `src/cli/index.ts` | Change `.version(ver)` to `.version(ver, "-V")` to remove `--version` from root |
| `tests/cli/` | Confirm `list-resources --fhir-version R4` still works; confirm `list-resources --version R4` now errors |
| `CHANGELOG.md` | Entry under `[Unreleased]` |

## Acceptance criteria

```bash
# Short form still works
fhir-resource-diff -V
# → <version>

# Old long form now errors clearly (not silently prints version)
fhir-resource-diff list-resources --version R4
# → error: unknown option '--version'

# Correct flag still works
fhir-resource-diff list-resources --fhir-version R4
# → FHIR Resource Types — R4 (37 total) ...
```

## Do not do

- Do not silently remap `--version` to `--fhir-version` in subcommands — silent aliasing is
  worse than an error
- Do not remove `-V` (short form) from the root — that's the safe version shorthand
