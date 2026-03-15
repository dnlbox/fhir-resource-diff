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
    details: Compare two FHIR resources field by field. Every added, removed, and changed value is tracked with dot-notation paths and array index tracking — including nested CodeableConcepts, extensions, and identifiers.
  - title: Structured validation
    details: Catch common FHIR mistakes before submission — id format, date patterns, reference string shape, known resource types — with severity levels (error, warning, info) and links to HL7 documentation.
  - title: CI/CD native
    details: "--exit-on-diff fails a build step when resources diverge. --quiet suppresses stdout for exit-code-only gates. --envelope wraps output in a metadata envelope for automated triage. Exit codes are severity-aware."
  - title: AI agent friendly
    details: Every command supports stdin pipes, --format json for structured output, and --envelope for metadata wrapping with tool version, FHIR version, timestamps, and HL7 doc URLs. No temp files, one pass.
---

`fhir-resource-diff` is a CLI and TypeScript library for working with FHIR JSON resources locally — no server, no Java runtime, no package downloads. It compares resources path by path, validates format and structure, normalizes for comparison, and exposes a browser-safe API for use in React, Vite, and any bundler.

Supports FHIR **R4**, **R4B**, and **R5** — auto-detected or explicit via `--fhir-version`.

```bash
# Install
npm install -g fhir-resource-diff

# Validate a resource
fhir-resource-diff validate patient.json --fhir-version R4

# Compare two resources
fhir-resource-diff compare expected.json actual.json

# Diff with JSON output for automation
fhir-resource-diff compare a.json b.json --format json --envelope
```
