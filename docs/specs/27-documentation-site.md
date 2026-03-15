# Spec 27 — Documentation site

**Status:** complete

## Goal

A public documentation site hosted on GitHub Pages at
`https://dnlbox.github.io/fhir-resource-diff/` — no custom domain, no
third-party hosting service, fully served by GitHub. The site should serve
as the canonical reference for users, contributors, and anyone evaluating
the tool.

## Framework recommendation: VitePress

After evaluating the options (GitBook, Starlight/Astro, Docusaurus, VitePress,
Nextra):

**Recommendation: VitePress.**

| Option | Notes |
|--------|-------|
| GitBook | Sync from GitHub is available, but public hosting is at `gitbook.io` — no `github.io` URL without a paid plan. Good DX but wrong URL. |
| Starlight (Astro) | Purpose-built for docs, excellent out of the box (dark mode, search, i18n). Great option. Slightly more complex build pipeline than VitePress. |
| Docusaurus | Mature, Meta-maintained, React-based. Heavy for this use case. |
| **VitePress** | Minimal, fast, Markdown + TypeScript-native, zero config for docs. Used by Vite, Vue, Vitest, pinia — the same ecosystem this project lives in. GitHub Pages deployment is one workflow file. **Winner.** |
| Nextra | Next.js-based, good but brings a lot of Next.js complexity for what is static docs. |

VitePress gives us a `https://dnlbox.github.io/fhir-resource-diff/` URL immediately,
with a clean default theme, dark mode, full-text search (via Algolia or built-in
MiniSearch in VitePress 1.x), and TypeScript config. Deployment is one GitHub
Actions workflow.

## Dependencies

- Spec 26 (CONTRIBUTING.md overhaul) — content will be incorporated
- No code dependencies

## Deliverables

### New files

| File / Directory | Purpose |
|-----------------|---------|
| `docs/site/` | VitePress source (`.vitepress/config.ts`, pages) |
| `docs/site/.vitepress/config.ts` | Site config: nav, sidebar, theme, base URL |
| `docs/site/index.md` | Home page — hero, key features, quick start |
| `docs/site/guide/` | User-facing guides |
| `docs/site/guide/getting-started.md` | Install, first commands, quick wins |
| `docs/site/guide/validate.md` | validate command deep-dive |
| `docs/site/guide/compare.md` | compare command deep-dive |
| `docs/site/guide/normalize.md` | normalize command |
| `docs/site/guide/info.md` | info and list-resources commands |
| `docs/site/guide/ci-cd.md` | CI/CD integration guide |
| `docs/site/guide/ai-agents.md` | AI agent and automation guide |
| `docs/site/guide/fhir-versions.md` | R4/R4B/R5 differences and version flags |
| `docs/site/reference/` | Technical reference |
| `docs/site/reference/cli.md` | Full CLI flag reference |
| `docs/site/reference/library-api.md` | TypeScript library API |
| `docs/site/reference/exit-codes.md` | Exit codes and severity model |
| `docs/site/reference/output-formats.md` | text, JSON, markdown, envelope |
| `docs/site/ecosystem.md` | The FHIR TypeScript ecosystem page (from README) |
| `.github/workflows/docs.yml` | GitHub Pages deployment workflow |

### Modified files

| File | Change |
|------|--------|
| `package.json` | Add `docs:dev` and `docs:build` scripts |

## Site structure

### Navigation

```
Home
Guide
  Getting started
  Validate
  Compare
  Normalize
  Info & list-resources
  CI/CD integration
  AI agents & automation
  FHIR versions (R4/R4B/R5)
Reference
  CLI reference
  Library API
  Output formats
  Exit codes
Ecosystem           ← the "how this compares" content from README
```

### Home page (`index.md`)

VitePress supports a `layout: home` frontmatter that renders a hero section.
The home page should lead with the value proposition and get to a runnable
command within 3 seconds of landing:

```md
---
layout: home
hero:
  name: fhir-resource-diff
  tagline: Diff, validate, and inspect FHIR resources. Fast. Local. CI-ready.
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/dnlbox/fhir-resource-diff
features:
  - title: Path-level diff
    details: ...
  - title: Structured validation
    details: ...
  - title: CI/CD native
    details: ...
  - title: AI agent friendly
    details: ...
---
```

### Guide pages

Each guide page should:
- Open with a single sentence of context (what problem this solves)
- Show a real command with real output within the first screen
- Explain flags in context, not as a flat list
- Link to relevant Reference pages for the full flag inventory

Reuse content from `SHOWCASE.md` — the annotated outputs there are exactly
what guide pages need.

### Reference pages

Precise, complete, no narrative. The CLI reference should be a single page
with every flag documented. The Library API page covers the TypeScript
exports (`parseJson`, `validate`, `diff`, `normalize`, the types).

## VitePress configuration highlights

```typescript
// docs/site/.vitepress/config.ts
import { defineConfig } from "vitepress";

export default defineConfig({
  title: "fhir-resource-diff",
  description: "Diff, validate, and inspect FHIR resources",
  base: "/fhir-resource-diff/",   // required for GitHub Pages project sites
  themeConfig: {
    nav: [...],
    sidebar: {...},
    socialLinks: [
      { icon: "github", link: "https://github.com/dnlbox/fhir-resource-diff" },
      { icon: "npm", link: "https://www.npmjs.com/package/fhir-resource-diff" },
    ],
    search: { provider: "local" },  // built-in MiniSearch, no Algolia key needed
    editLink: {
      pattern: "https://github.com/dnlbox/fhir-resource-diff/edit/main/docs/site/:path",
    },
  },
});
```

Key settings:
- `base: "/fhir-resource-diff/"` — required for GitHub Pages project sites
  (as opposed to user/org sites at the root)
- `search: { provider: "local" }` — full-text search with no external service

## GitHub Pages deployment workflow

```yaml
# .github/workflows/docs.yml
name: Deploy documentation

on:
  push:
    branches: [main]
    paths:
      - "docs/site/**"
      - ".github/workflows/docs.yml"

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # needed for VitePress git-based last-updated timestamps

      - uses: pnpm/action-setup@v4
        with:
          version: ">=9.0.0"

      - uses: actions/setup-node@v4
        with:
          node-version: lts/*
          cache: pnpm

      - run: pnpm install --frozen-lockfile
      - run: pnpm docs:build

      - uses: actions/upload-pages-artifact@v3
        with:
          path: docs/site/.vitepress/dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    needs: build
    runs-on: ubuntu-latest
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

**Trigger:** only runs when files under `docs/site/` change — not on every
commit to `main`.

## GitHub repository configuration required

Before the workflow runs successfully, enable GitHub Pages in the repository:

`Settings` → `Pages` → `Source` → **GitHub Actions** (not "Deploy from a branch").

This is the modern GitHub Pages approach that works with the
`actions/deploy-pages` action.

## package.json scripts

```json
{
  "scripts": {
    "docs:dev":   "vitepress dev docs/site",
    "docs:build": "vitepress build docs/site",
    "docs:preview": "vitepress preview docs/site"
  }
}
```

`pnpm docs:dev` for local preview at `http://localhost:5173/fhir-resource-diff/`.

## devDependencies to add

```bash
pnpm add -D vitepress
```

No other dependencies. VitePress bundles Vue and its own Vite config internally.

## Acceptance criteria

### Repository setup
- [ ] GitHub Pages enabled with "GitHub Actions" as source
- [ ] `https://dnlbox.github.io/fhir-resource-diff/` loads the site

### Build
- [ ] `pnpm docs:dev` serves the site locally without errors
- [ ] `pnpm docs:build` produces a valid static site in `docs/site/.vitepress/dist/`
- [ ] `pnpm docs:preview` serves the built site correctly with the `/fhir-resource-diff/` base path

### Content
- [ ] All guide pages exist with real content (not placeholder)
- [ ] Home page hero renders correctly with correct links
- [ ] Local search works (`/` shortcut focuses search)
- [ ] Dark mode works
- [ ] GitHub and npm links in the nav bar are correct
- [ ] Edit links point to the correct GitHub file paths

### Deployment
- [ ] `docs.yml` workflow runs on push to main when docs files change
- [ ] Workflow does not run on non-docs commits
- [ ] Deployed site reflects the latest content within 2–3 minutes of push

## Do not do

- Do not use a custom domain — `github.io` is the target URL
- Do not add Algolia search — local MiniSearch is sufficient for this size
- Do not generate API docs from TypeScript (typedoc, etc.) automatically —
  the library API is small enough to document by hand and that makes it
  more readable
- Do not auto-generate CLI reference from commander — write it by hand to
  control the explanatory context around each flag
- Do not put the VitePress source in a separate branch (`gh-pages`) — the
  source lives in `docs/site/` on `main` and the workflow deploys the built
  output
- Do not version the docs yet — single version for now, add versioning when
  there is a real breaking change
