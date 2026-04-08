# fhir-resource-diff — Claude Code instructions

@./AGENTS.md

## Claude Code specifics

- Run `pnpm test` to verify changes; `pnpm typecheck` for type errors.
- lefthook pre-commit runs typecheck + lint + test — do not skip hooks.
- CHANGELOG.md: if you changed anything under `src/`, check whether a `[Unreleased]` entry is needed (see "Changelog discipline" in AGENTS.md). When in doubt, add it.
