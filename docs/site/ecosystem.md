# The FHIR TypeScript ecosystem

The JavaScript/TypeScript FHIR community has built excellent tools across the stack — type systems, API clients, platform SDKs, auth libraries, and IG authoring tools. Each project solves a different slice of the problem, and `fhir-resource-diff` is designed to complement them, not compete.

## Where each tool shines

| Focus area | Tool | What it does best |
|---|---|---|
| Type definitions | [`@types/fhir`](https://www.npmjs.com/package/@types/fhir), [`@medplum/fhirtypes`](https://www.npmjs.com/package/@medplum/fhirtypes) | TypeScript interfaces for FHIR resources — essential for type-safe application code |
| Platform SDK | [`@medplum/core`](https://www.npmjs.com/package/@medplum/core) | Full-featured FHIR client with profile validation, FHIRPath, and the Medplum platform |
| XML/JSON serialization | [`fhir`](https://www.npmjs.com/package/fhir) (Lantana) | FHIR XML ↔ JSON conversion and JSON Schema validation — one of the earliest FHIR JS tools |
| Auth & API client | [`fhirclient`](https://www.npmjs.com/package/fhirclient) | SMART on FHIR auth flows and API calls, maintained by SMART Health IT at Boston Children's |
| Conformance validation | [HL7 FHIR Validator](https://confluence.hl7.org/display/FHIR/Using+the+FHIR+Validator) | The reference implementation for full profile, terminology, and invariant validation |
| **Diff, fast validation, CI/CD** | **`fhir-resource-diff`** | **Structural diffing, format validation, and automation-first output** |

## What this tool adds to the ecosystem

`fhir-resource-diff` focuses on three areas where we saw a gap in the existing tooling — not because other tools should have built these, but because they fall outside the scope of what type libraries, API clients, and platform SDKs are designed to solve.

### FHIR-aware structural diff

Compare two resources path by path and get a classified list of additions, removals, and changes — with dot-notation paths, array index tracking, and ignore presets for metadata noise.

Type libraries give you compile-time type safety. They don't tell you how two runtime resource instances differ. `fhir-resource-diff` closes that gap.

### AI agent and automation friendly

Every command supports `--format json` for structured output, `--envelope` for metadata wrapping (tool version, FHIR version, timestamps, HL7 doc URLs), and stdin pipes for in-memory payloads. An agent can validate and diff FHIR payloads without writing temp files, parse the output in one pass, and follow the documentation links — no second tool call needed.

### CI/CD native

`--exit-on-diff` fails the step when resources diverge. `--quiet` suppresses stdout for exit-code-only gates. Exit codes are severity-aware — warnings and info findings never produce non-zero exits. JSON envelope output includes summary counts for automated triage.

## Using them together

These tools work well in combination:

**[`@types/fhir`](https://www.npmjs.com/package/@types/fhir)** or **[`@medplum/fhirtypes`](https://www.npmjs.com/package/@medplum/fhirtypes)** for your application's TypeScript types, `fhir-resource-diff` for runtime validation and diffing.

**[`fhirclient`](https://www.npmjs.com/package/fhirclient)** for SMART auth and API transport, then pipe responses into `fhir-resource-diff` for validation and comparison:

```bash
# Fetch a resource and validate it
curl -s -H "Authorization: Bearer $TOKEN" \
  https://fhirserver.example.com/Patient/123 \
  | fhir-resource-diff validate - --fhir-version R4
```

**[HL7 FHIR Validator](https://confluence.hl7.org/display/FHIR/Using+the+FHIR+Validator)** for full profile conformance checks in staging, `fhir-resource-diff` for fast local validation and CI gates in the development loop. The two tools are complementary: fast feedback locally, thorough conformance checking before release.

## What this tool intentionally doesn't do

`fhir-resource-diff` is curated, not complete — by design. These are out of scope:

| Out of scope | Why |
|---|---|
| StructureDefinition parsing | Changes the fundamental character of the project — requires package downloads or a Java runtime |
| XML ↔ JSON conversion | Different problem; use the [`fhir`](https://www.npmjs.com/package/fhir) package |
| FHIRPath evaluation | Out of scope; use [`@medplum/core`](https://www.npmjs.com/package/@medplum/core) |
| Full terminology validation | Requires a live terminology server |
| Profile conformance | The HL7 Validator evaluates them; we surface profile declarations |

The value of this tool is that it works locally, fast, with no infrastructure dependency. Contributions that attempt to add exhaustive coverage from the FHIR specification are out of scope — they change the fundamental character of the project.

## Related resources

- [FHIR specification](https://hl7.org/fhir/)
- [FHIR resource type listing](https://hl7.org/fhir/resourcelist.html)
- [FHIR R4](https://hl7.org/fhir/R4/) / [R4B](https://hl7.org/fhir/R4B/) / [R5](https://hl7.org/fhir/R5/)
- [HL7 FHIR tooling ecosystem](https://confluence.hl7.org/display/FHIR/FHIR+Tooling)
- [Contributing to fhir-resource-diff](https://github.com/dnlbox/fhir-resource-diff/blob/main/CONTRIBUTING.md)
