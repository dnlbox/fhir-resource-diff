# Getting started

`fhir-resource-diff` is a CLI and library for comparing and validating FHIR JSON resources — fast, local, no infrastructure dependencies.

## Install

```bash
# Global install (recommended for CLI use)
npm install -g fhir-resource-diff
# or
pnpm add -g fhir-resource-diff

# Project-local (for library use or CI)
pnpm add -D fhir-resource-diff
```

## First commands

### Validate a resource

```bash
fhir-resource-diff validate patient.json
# → valid
```

With a specific FHIR version:

```bash
fhir-resource-diff validate patient.json --fhir-version R4
```

```
valid
  ℹ For full FHIR schema validation, use the official HL7 FHIR Validator
    → https://confluence.hl7.org/display/FHIR/Using+the+FHIR+Validator
```

The note about the HL7 Validator is always shown when `--fhir-version` is specified — it's a footer about scope, not a finding about your resource.

### Compare two resources

```bash
fhir-resource-diff compare expected.json actual.json
```

```
ResourceType: Patient
Status: 3 difference(s) found

Changed:
  birthDate: "1974-12-25" → "1974-12-26"
  name[0].given[0]: "Peter" → "Pete"

Added:
  telecom[2].system
```

### Look up a resource type

```bash
fhir-resource-diff info Patient
```

```
Patient (base)
FHIR versions: R4, R4B, R5
Documentation:
  R4:  https://hl7.org/fhir/R4/patient.html
  R4B: https://hl7.org/fhir/R4B/patient.html
  R5:  https://hl7.org/fhir/R5/patient.html
```

## Quick wins

**CI gate — fail a build step when resources diverge:**

```bash
fhir-resource-diff compare expected.json actual.json --exit-on-diff --quiet
```

**JSON output for automation:**

```bash
fhir-resource-diff compare a.json b.json --format json
```

**Ignore noisy metadata fields:**

```bash
fhir-resource-diff compare a.json b.json --preset metadata
```

**Pipe from a FHIR server:**

```bash
curl -s https://hapi.fhir.org/baseR4/Patient/592473 \
  | fhir-resource-diff validate - --fhir-version R4
```

## Run from source (contributors)

No build step needed during development:

```bash
git clone https://github.com/dnlbox/fhir-resource-diff.git
cd fhir-resource-diff
pnpm install

pnpm cli -- compare examples/patient-a.json examples/patient-b.json
pnpm cli -- validate examples/patient-a.json
```

The `--` separator after `pnpm cli` is required so pnpm passes flags to the script rather than consuming them.

## Next steps

- [Validate command deep-dive](/guide/validate) — what it checks, what it skips, JSON output format
- [Compare command deep-dive](/guide/compare) — diff output, --ignore, output formats
- [CI/CD integration](/guide/ci-cd) — GitHub Actions examples, exit codes, quiet mode
- [CLI reference](/reference/cli) — all flags for all commands
