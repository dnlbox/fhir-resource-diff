# Spec 28 — npm registry publish preparation

**Status:** complete

## Goal

Prepare the package for publication to the public npm registry so that
`npm install -g fhir-resource-diff` and `pnpm add fhir-resource-diff` work
correctly from any machine. This includes account setup, `package.json`
completeness, controlling what gets published, and an automated publish
workflow triggered by GitHub Releases.

Man page support (`man fhir-resource-diff`) is a separate spec — it requires
generating roff-format output and is non-trivial. Noted here as future work.

---

## Prerequisites — things only you can do before implementing

### 1. Create an npm account

Go to https://www.npmjs.com and sign up if you don't have an account.
Use an account name you're comfortable associating with published packages
long-term — it appears on the package page URL and in `package.json`.

### 2. Verify the package name is available

```bash
npm info fhir-resource-diff
```

If this returns `404 Not Found`, the name is available. If it returns package
metadata, the name is taken and the `name` field in `package.json` must change.

### 3. Enable two-factor authentication on npm

npm strongly recommends 2FA for publishing. Required for packages with high
download counts. Set up now before the first publish:
`npmjs.com` → account → Security → Two-Factor Authentication.

### 4. Create an npm access token for CI

`npmjs.com` → account → Access Tokens → Generate New Token →
**Automation** token type (does not require OTP — needed for CI).

Copy the token — you only see it once.

### 5. Add the token as a GitHub secret

`Settings` → `Secrets and variables` → `Actions` → `New repository secret`
- **Name:** `NPM_TOKEN`
- **Value:** the token from step 4

---

## Deliverables

### Modified files

| File | Change |
|------|--------|
| `package.json` | Add missing metadata fields, fix exports, add files allowlist |
| `.github/workflows/publish.yml` | New: automated npm publish on GitHub Release |

---

## package.json changes

### Fields to add or fix

**`version`** — currently `0.1.0`; README and dist badge say `0.2.0`. Align
before first publish. Decide on the canonical current version.

**`license`**
```json
"license": "MIT"
```

**`keywords`** — appear on the npm search page and affect discoverability:
```json
"keywords": [
  "fhir",
  "hl7",
  "healthcare",
  "diff",
  "validate",
  "r4",
  "r4b",
  "r5",
  "cli",
  "json"
]
```

**`repository`**, **`homepage`**, **`bugs`**
```json
"repository": {
  "type": "git",
  "url": "https://github.com/dnlbox/fhir-resource-diff.git"
},
"homepage": "https://dnlbox.github.io/fhir-resource-diff/",
"bugs": {
  "url": "https://github.com/dnlbox/fhir-resource-diff/issues"
}
```

`homepage` points to the future docs site (Spec 27). Until that ships,
it can point to the GitHub repo.

**`exports`** — the current export is missing the TypeScript declarations entry.
Library consumers using TypeScript need the `types` path:
```json
"exports": {
  ".": {
    "import": "./dist/core/index.js",
    "types": "./dist/core/index.d.ts"
  }
}
```

**`files`** — the most important field. Without it, npm publishes everything
in the repository (source, tests, specs, examples — all of it). The allowlist
controls exactly what lands in the registry tarball:
```json
"files": [
  "dist/",
  "README.md",
  "LICENSE",
  "CHANGELOG.md"
]
```

`package.json` is always included by npm regardless of `files`. `dist/` is
the compiled output. Everything else (src, tests, docs, examples, .github)
stays out of the published package.

### Verify with dry run before first publish

```bash
npm pack --dry-run
```

This lists exactly what would be published without actually publishing.
Review the output — if anything unexpected appears, adjust `files`.

---

## Automated publish workflow

### Trigger strategy

Publish on GitHub Release creation. This is the standard approach:

1. Bump version in `package.json`, commit, push
2. Create a GitHub Release with a tag (e.g. `v0.2.0`)
3. The workflow detects the release, runs the full quality gate, and publishes

Never publish by running `npm publish` locally — the workflow ensures the
quality gate (typecheck, lint, tests, build) always runs before publish.

### Workflow file

```yaml
# .github/workflows/publish.yml
name: Publish to npm

on:
  release:
    types: [published]

jobs:
  publish:
    name: npm publish
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: ">=9.0.0"

      - uses: actions/setup-node@v4
        with:
          node-version: lts/*
          registry-url: https://registry.npmjs.org
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Quality gate
        run: pnpm typecheck && pnpm lint && pnpm test

      - name: Build
        run: pnpm build

      - name: Publish
        run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

**Why `npm publish` instead of `pnpm publish`?**
`actions/setup-node` configures the npm registry auth for `npm`, not `pnpm`.
Using `npm publish` here avoids needing to separately configure pnpm's
registry auth.

**`--access public`** — required for scoped packages (`@scope/name`). Not
required for unscoped packages like `fhir-resource-diff`, but harmless to
include — makes intent explicit.

---

## Release and versioning conventions

### Semantic versioning

Follow semver strictly:
- **Patch** (`0.2.0` → `0.2.1`): bug fixes, no API changes
- **Minor** (`0.2.0` → `0.3.0`): new features, backwards-compatible
- **Major** (`0.x.y` → `1.0.0`): breaking changes

The project is currently `0.x.y` — pre-1.0. In this range, minor version
bumps may include breaking changes (semver allows this for pre-1.0 packages).
Call out any breaking changes explicitly in the release notes.

### Release process (each release)

1. Update `version` in `package.json`
2. Update `CHANGELOG.md` (see Spec 29)
3. Commit: `chore: release v0.3.0`
4. Push to main
5. Create GitHub Release:
   - Tag: `v0.3.0`
   - Title: `v0.3.0`
   - Use GitHub's "Generate release notes" to auto-populate from PRs/commits
   - Edit as needed
6. GitHub Release triggers the publish workflow

---

## Acceptance criteria

### Pre-publish checks
- [ ] `npm info fhir-resource-diff` returns 404 (name available)
- [ ] npm account created with 2FA enabled
- [ ] `NPM_TOKEN` secret added to GitHub repository
- [ ] `npm pack --dry-run` shows only: `dist/`, `package.json`, `README.md`, `LICENSE`, `CHANGELOG.md`
- [ ] `package.json` has all required fields: `license`, `keywords`, `repository`, `homepage`, `bugs`, `files`, `exports` with types

### Post-publish checks
- [ ] `npm info fhir-resource-diff` returns package metadata
- [ ] `npm install -g fhir-resource-diff` installs and `fhir-resource-diff --help` works
- [ ] TypeScript consumers can import and get type completion: `import { diff } from "fhir-resource-diff"`
- [ ] Package page on npmjs.com shows README correctly
- [ ] Package page shows correct license, repository link, and homepage

---

## Do not do

- Do not publish with `npm publish` from your local machine — always use
  the GitHub Release workflow
- Do not commit `NPM_TOKEN` or any token value into the repository
- Do not add a `.npmrc` with the token to the repo — the workflow injects
  auth via `NODE_AUTH_TOKEN`
- Do not publish pre-release versions to the `latest` tag — use
  `npm publish --tag next` for pre-releases (e.g. betas)
- Do not implement man page support in this spec — that is a future spec
- Do not add a `postinstall` script — it runs on every `npm install` and
  is hostile to consumers
- Do not put an email address in the `author` field — `"author": "Daniel Veronez"`
  (name only) is correct; email in `author` is baked into every published tarball
  and is public forever. Use `bugs.url` (GitHub Issues) as the contact point instead
