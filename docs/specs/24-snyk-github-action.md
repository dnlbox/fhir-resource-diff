# Spec 24 — Snyk security scanning GitHub Action

**Status:** complete

## Goal

Add Snyk dependency vulnerability scanning to CI so every push to `main` and every
pull request is checked against the npm advisory database. Surface results in the
GitHub Security tab alongside the existing CodeQL analysis.

CodeQL (already configured) covers SAST — code-level security issues. Snyk covers
the supply chain — known CVEs and vulnerabilities in the project's npm dependencies.
The two are complementary; this spec adds the missing half.

## Scope

| Scan type | Tool | Status after this spec |
|-----------|------|------------------------|
| SAST (code patterns) | CodeQL | Already running |
| Dependency CVEs | Snyk | Added by this spec |
| Container scanning | — | Not applicable (no Docker) |
| IaC scanning | — | Not applicable |

## Prerequisites — Snyk portal (do these before implementing)

These steps must be completed in the Snyk web portal **before** the GitHub Action
will work. Nothing in the codebase can substitute for them.

### 1. Create a Snyk account

Go to https://app.snyk.io and sign up. The free tier covers open-source projects
with unlimited tests.

### 2. Get your API token

`Account Settings` → `General` → `Auth Token` → copy the token value.

This token is what the GitHub Action uses to authenticate against Snyk's API.

### 3. Add the token as a GitHub secret

In the GitHub repository:
`Settings` → `Secrets and variables` → `Actions` → `New repository secret`

- **Name:** `SNYK_TOKEN`
- **Value:** the token copied in step 2

The GitHub Action references this secret as `${{ secrets.SNYK_TOKEN }}`. Without
it the action fails immediately.

### 4. (Optional but recommended) Import the repo into Snyk

In the Snyk portal: `Projects` → `Add project` → `GitHub` → select this repository.

This enables:
- Continuous monitoring — Snyk re-scans on a schedule and opens issues when new
  CVEs are published against your current dependency versions
- PR checks — Snyk posts a status check on pull requests directly from the portal
- Fix PRs — Snyk can open automated upgrade PRs for vulnerable dependencies

Importing is not required for the GitHub Action to run; the action works with just
the token. But without importing, you lose the monitoring and fix PR features.

### 5. (Optional) Note your Snyk Organization ID

`Settings` → `General` → copy the `Organization ID`.

Only needed if your Snyk account has multiple organizations and you want to scope
results to a specific one. The action accepts an `--org` flag for this.

---

## Deliverables

### New file

| File | Purpose |
|------|---------|
| `.github/workflows/snyk.yml` | Snyk dependency scan GitHub Action |

No source code changes. No new dependencies in `package.json`. Snyk runs as an
external action using the `SNYK_TOKEN` secret.

## GitHub Action specification

### Trigger

Run on:
- Push to `main`
- Pull requests targeting `main`

Same triggers as CodeQL. Do not add a schedule — dependency scans on push/PR are
sufficient; continuous monitoring is handled by the Snyk portal import (step 4 above).

### What the action does

1. Check out the repository
2. Set up Node.js (match `.nvmrc` or use `lts/*`)
3. Install dependencies with `pnpm install --frozen-lockfile`
4. Run `snyk test` — scans `package.json` + `pnpm-lock.yaml` against the Snyk
   vulnerability database
5. Upload results as SARIF to GitHub's Security tab

### Failure behaviour

- **Fail the workflow** when Snyk finds vulnerabilities at `high` severity or above.
- Informational/low/medium findings appear in the Security tab but do not block.
- Use `--severity-threshold=high` on the `snyk test` command.

This mirrors the approach CodeQL already uses — surface everything, block on high.

### SARIF upload

Snyk can output results as SARIF (the standard GitHub Security format). Upload via
`github/codeql-action/upload-sarif@v4` so Snyk findings appear in the same
`Security` → `Code scanning` view as CodeQL. This requires `security-events: write`
permission on the job.

### Action YAML

```yaml
name: Snyk security scan

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  snyk:
    name: Dependency vulnerability scan
    runs-on: ubuntu-latest
    permissions:
      contents: read
      security-events: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: lts/*

      - name: Set up pnpm
        uses: pnpm/action-setup@v4
        with:
          run_install: false

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run Snyk to check for vulnerabilities
        uses: snyk/actions/node@master
        continue-on-error: true        # allow SARIF upload even if scan finds issues
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high --sarif-file-output=snyk.sarif

      - name: Upload Snyk results to GitHub Security tab
        uses: github/codeql-action/upload-sarif@v4
        with:
          sarif_file: snyk.sarif
```

**Why `continue-on-error: true` on the Snyk step?**

`snyk test` exits with code 1 when vulnerabilities are found. Without
`continue-on-error: true`, the SARIF upload step would be skipped on failure —
meaning findings would never reach the Security tab. Setting `continue-on-error`
keeps the upload running, and the overall job still fails because the Snyk step's
outcome is `failure` (GitHub propagates this to the job result).

## Acceptance criteria

### Portal prerequisites
- [ ] Snyk account created
- [ ] `SNYK_TOKEN` secret added to GitHub repository secrets
- [ ] (Optional) Repository imported into Snyk Projects for continuous monitoring

### Workflow file
- [ ] `.github/workflows/snyk.yml` committed to `main`
- [ ] Action triggers on push to `main` and on PRs

### Behaviour
- [ ] `pnpm install` runs without modifying the lockfile (`--frozen-lockfile`)
- [ ] Snyk scan completes and produces `snyk.sarif`
- [ ] SARIF results appear under `Security` → `Code scanning` in GitHub
- [ ] Workflow fails if any `high` or `critical` severity vulnerability is found
- [ ] Workflow passes (with findings visible in Security tab) for `low`/`medium`

### Co-existence with CodeQL
- [ ] Both `CodeQL Advanced` and `Snyk security scan` workflows run independently
- [ ] Both report to the same `Security` → `Code scanning` view
- [ ] No conflicts between the two (they scan different surfaces)

## Do not do

- Do not add `snyk` as a `devDependency` in `package.json` — the GitHub Action
  installs it internally; no local Snyk CLI is needed
- Do not add a `.snyk` policy file unless a specific finding needs suppressing —
  create that file only when a known false positive is identified
- Do not add a scheduled cron trigger — continuous monitoring belongs in the Snyk
  portal, not in this workflow
- Do not scan for IaC or container issues — this project has neither
- Do not pin `snyk/actions/node` to a specific SHA yet — `@master` is the Snyk
  team's recommended reference for this action
