# Spec 29 — GitHub repository settings and hygiene

**Status:** open

## Goal

Configure the GitHub repository with settings that match the maturity of the
project: a descriptive About section, protected `main` branch, a release and
changelog strategy, and status badges in the README that reflect real CI state.
These are mostly portal-side settings — this spec documents what to configure
and why, with the code changes (badges) included as deliverables.

---

## Prerequisites — things only you can do in GitHub

### 1. About section

`Settings` → (right-hand panel on the Code tab) → Edit repository details

- **Description:** `CLI and library for diffing and validating FHIR R4/R4B/R5 JSON resources`
- **Website:** `https://dnlbox.github.io/fhir-resource-diff/` (once Spec 27 ships; otherwise the GitHub repo URL)
- **Topics:** `fhir`, `hl7`, `healthcare`, `cli`, `typescript`, `diff`, `validation`, `fhir-r4`, `fhir-r5`, `json`

Topics affect GitHub search and the repository's discoverability. Use them.

### 2. Branch protection — main

`Settings` → `Branches` → `Add branch protection rule` → branch name pattern: `main`

Recommended settings for a solo maintainer who wants discipline without friction:

| Rule | Setting | Rationale |
|------|---------|-----------|
| Require a pull request before merging | ✓ enabled | Encourages intentional merges |
| Required approvals | 1 | Minimum; you approve your own PRs as admin |
| Dismiss stale pull request approvals when new commits are pushed | ✓ | Re-review after changes |
| Require status checks to pass before merging | ✓ enabled | Blocks broken builds |
| Required status checks | `typecheck`, `test`, `build` (from CI workflow) | Add CodeQL + Snyk once those are stable |
| Require branches to be up to date | ✓ | Prevents stale merges |
| Require linear history | ✓ | Squash or rebase only — cleaner `git log` |
| Allow force pushes | ✗ disabled | Prevents rewriting shared history |
| Allow deletions | ✗ disabled | Prevents accidental branch deletion |
| **Do not restrict who can bypass these rules** | ✓ — keep admin bypass | Lets you push hotfixes to main when needed |

**On self-approval:** GitHub does not allow self-review — you cannot approve
your own PR with the same account that opened it. As a repository administrator,
you can bypass the PR requirement entirely. The practical workflow is:
- For routine work: open a PR, wait for CI to pass, merge directly as admin (bypass)
- For significant changes: open a PR, review your own diff carefully, then merge

Alternatively, enable `Allow specified actors to bypass required pull requests`
and add your account there — this makes the bypass explicit and auditable.

> **Note on CI required checks:** before adding CodeQL and Snyk as required
> checks, confirm both workflows run reliably. Flaky external checks on main
> protection are worse than no checks.

### 3. Merge strategy

`Settings` → `General` → Pull Requests

- ✓ **Allow squash merging** — recommended default for feature branches
- ✓ **Allow rebase merging** — useful for linear chains of small commits
- ✗ **Disable merge commits** — keeps history linear (required for "require linear history" above)
- ✓ **Default to PR title for squash commits** — clean single-line history
- ✓ **Automatically delete head branches** — removes merged feature branches

### 4. Releases and tags

No portal configuration needed beyond the default. See the Releases strategy
section below.

### 5. Packages (GitHub Packages)

Optional: GitHub Packages lets you publish to the GitHub npm registry at
`@dnlbox/fhir-resource-diff` in addition to the public npm registry.
This is useful for private consumers and mirrors the public package.

If you want to enable GitHub Packages, the Spec 28 publish workflow needs
a second publish step targeting `https://npm.pkg.github.com`. This is
optional — the public npm registry (Spec 28) is sufficient for open source.

---

## Deliverables

### Modified files

| File | Change |
|------|--------|
| `README.md` | Replace static badges with real dynamic badges |
| `CHANGELOG.md` | Create with initial entry |

---

## Status badges

### Current state (static, inaccurate)

```markdown
![Build](https://img.shields.io/badge/build-passing-brightgreen)
![npm](https://img.shields.io/badge/npm-0.2.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
```

### Replace with dynamic badges

```markdown
[![CI](https://github.com/dnlbox/fhir-resource-diff/actions/workflows/ci.yml/badge.svg)](https://github.com/dnlbox/fhir-resource-diff/actions/workflows/ci.yml)
[![CodeQL](https://github.com/dnlbox/fhir-resource-diff/actions/workflows/codeql.yml/badge.svg)](https://github.com/dnlbox/fhir-resource-diff/actions/workflows/codeql.yml)
[![Snyk](https://snyk.io/test/github/dnlbox/fhir-resource-diff/badge.svg)](https://snyk.io/test/github/dnlbox/fhir-resource-diff)
[![npm](https://img.shields.io/npm/v/fhir-resource-diff)](https://www.npmjs.com/package/fhir-resource-diff)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://github.com/dnlbox/fhir-resource-diff/blob/main/LICENSE)
```

**Notes:**
- The CI badge requires a dedicated CI workflow (`ci.yml`) that runs
  typecheck + lint + test + build. Currently these only run as part of
  CodeQL — a dedicated CI workflow is needed so the badge has a stable URL.
  Add this as part of implementing this spec.
- The npm badge (`img.shields.io/npm/v/...`) only resolves correctly once
  the package is published (Spec 28). Until then it shows "unknown" —
  acceptable.
- The Snyk badge requires the project to be imported into Snyk Projects
  (prerequisite from Spec 24). The badge URL is from Snyk's dashboard once
  imported.

### CI workflow (new, required for the CI badge)

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  ci:
    name: Typecheck, lint, test, build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: ">=9.0.0"

      - uses: actions/setup-node@v4
        with:
          node-version: lts/*
          cache: pnpm

      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm build
```

This workflow also becomes the required status check for branch protection.

---

## Releases and CHANGELOG strategy

### CHANGELOG.md

Create `CHANGELOG.md` at the repo root. Format: a heading per release,
reverse-chronological (newest first), categorised by change type.

Initial entry:

```markdown
# Changelog

All notable changes are documented here.

## [Unreleased]

## [0.2.0] — 2026-03-15

### Added
- Format validation rules: FHIR id format, date/dateTime, reference strings
- Profile awareness: meta.profile detection and IG registry
- Showcase with real HL7 R4 CC0 examples and SHOWCASE.md
- Snyk dependency scanning GitHub Action
- `ValidationHint` field separating tool notes from validation findings

### Fixed
- Stdin pipe with network sources (curl): EAGAIN race condition in ESM context
- Prototype pollution in normalize and walkResource (CWE-915)

### Changed
- "valid (with warnings)" now only shown when actual data findings exist
- Hint about HL7 Validator moved from errors array to separate hint field
- Ecosystem comparison in README reframed to acknowledge community contributions

## [0.1.0] — 2026-02-28

### Added
- Core diff engine with path-level change tracking
- Structural validation with severity model (error/warning/info)
- CLI: compare, validate, normalize, info, list-resources
- Multi-version support: R4, R4B, R5
- Stdin/pipe support
- CI affordances: --quiet, --envelope, --exit-on-diff
- Resource type registry with HL7 documentation links
```

### Release process

Each release follows this sequence:

1. **Update `CHANGELOG.md`** — move items from `[Unreleased]` to a new
   versioned section with today's date
2. **Bump `version` in `package.json`** — follow semver
3. **Commit:** `chore: release v0.X.Y`
4. **Push to main**
5. **Create GitHub Release:**
   - Tag: `vX.Y.Z` (create new tag on this commit)
   - Title: `vX.Y.Z`
   - Body: paste the CHANGELOG section for this version
   - Click "Publish release"
6. GitHub Release triggers the npm publish workflow (Spec 28)

---

## Acceptance criteria

### Portal settings (manual — verify after configuring)
- [ ] About section has description, website URL, and topics set
- [ ] `main` branch protection is active with required CI checks
- [ ] Squash and rebase merging enabled; merge commits disabled
- [ ] Auto-delete head branches enabled

### Badges
- [ ] CI badge in README links to the `ci.yml` workflow and shows green
- [ ] CodeQL badge links to the `codeql.yml` workflow
- [ ] Snyk badge loads (requires Snyk project import from Spec 24)
- [ ] npm badge shows the correct version (requires Spec 28 publish)
- [ ] License badge links to the `LICENSE` file

### CI workflow
- [ ] `ci.yml` runs on push to main and on PRs
- [ ] `ci.yml` is listed as a required status check in branch protection

### CHANGELOG
- [ ] `CHANGELOG.md` exists at repo root
- [ ] `[Unreleased]` section is present for ongoing work
- [ ] Current version section is accurate

---

## Do not do

- Do not add a Code of Conduct file yet — adds maintenance burden; add
  if the community grows to the point where moderation is needed
- Do not enable GitHub's "Require conversation resolution before merging" —
  too much friction for solo work
- Do not enable required reviews from code owners (`CODEOWNERS` file) —
  not needed for a solo project
- Do not add the Snyk workflow as a required CI check until it has run
  cleanly a few times — external service flakiness should not block merges
- Do not create a `develop` or `release` branch — single `main` branch
  with short-lived feature branches is the right model for this project
