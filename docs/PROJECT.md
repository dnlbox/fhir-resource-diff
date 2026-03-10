You are helping me design and implement a serious open-source developer tool.

Project goal:
Build a public GitHub repository that showcases strong engineering in healthtech interoperability, TypeScript architecture, and developer tooling. The tool must be useful, credible, and independent from any employer or client IP.

Repository name:
fhir-resource-diff

Primary purpose:
A TypeScript-first CLI and reusable library for:
1. validating FHIR JSON resources
2. comparing two FHIR resources
3. producing human-readable diffs
4. optionally normalizing selected fields for comparison
5. helping developers understand changes across FHIR resource versions, profiles, or payload variants

Possible future phase:
A React/Vite web app for interactive inspection, diff visualization, and client-side validation.
Do not start with the web app. Design the architecture so the same core logic can be shared by the CLI and a future hosted app without major refactoring.

Target audience:
- healthtech engineers
- interoperability engineers
- backend and platform engineers
- developers integrating healthcare APIs
- teams working with FHIR resources and wanting better tooling for validation and diffing

High-level positioning:
This should feel like a practical engineering tool, not an academic prototype and not a toy demo.

Core idea:
Given two FHIR JSON resources, the tool should:
- validate basic resource shape
- identify resourceType
- compare fields recursively
- classify differences
- optionally ignore noise fields
- optionally normalize values before comparison
- generate readable output for developers and CI usage

Key product constraints:
- Must be open source safe and generic
- Must not depend on proprietary schemas or private health data
- Must work on sample JSON files checked into the repo
- Must prioritize clean architecture, maintainability, and developer experience
- Must be written in TypeScript
- Must avoid overengineering the first version

Recommended stack:
- TypeScript
- Node.js
- pnpm
- zod for internal config/schema validation where helpful
- commander or yargs for CLI
- vitest for tests
- eslint
- prettier
- tsup or similar for packaging
- optional chalk or picocolors for terminal output
- optional React and Vite for a future web app, but do not implement now unless explicitly added in a later phase

Architecture goals:
Design the codebase as three layers:
1. core library
   - parsing
   - validation helpers
   - normalization
   - diff engine
   - output model
   - browser-safe shared logic that can run in both Node.js and a future client app
2. CLI adapter
   - file input
   - flags
   - formatting
   - exit codes
3. future UI adapter
   - React/Vite integration point
   - client-side validation and diffing powered by the shared core library
   - no business logic inside the UI layer

Repository structure suggestion:
/src
  /core
    parse.ts
    validate.ts
    normalize.ts
    diff.ts
    classify.ts
    types.ts
  /formatters
    text.ts
    json.ts
    markdown.ts
  /cli
    index.ts
    commands/
  /presets
    ignore-fields.ts
    normalization.ts
/tests
/examples
/docs

Feature scope for v1:
1. Read two JSON files from disk
2. Parse and validate basic FHIR resource structure
3. Compare them recursively
4. Output:
   - added fields
   - removed fields
   - changed values
   - changed array items
5. Support ignore lists for noisy fields such as:
   - meta.lastUpdated
   - id
   - text
   - extension, optionally
6. Support normalization options such as:
   - sort object keys
   - trim strings
   - normalize date formatting where possible
   - sort arrays for selected known paths if explicitly configured
7. Support output formats:
   - human-readable text
   - JSON
8. Good CLI help text and examples
9. Good README
10. Good tests

Do not attempt in v1:
- full semantic understanding of every FHIR resource type
- server integration
- live API calls
- web frontend
- database
- authentication
- AI integration
- heavy standards engine trying to fully implement the entire FHIR specification

Suggested CLI UX:
Command examples:
- fhir-resource-diff compare patient-a.json patient-b.json
- fhir-resource-diff compare a.json b.json --format json
- fhir-resource-diff compare a.json b.json --ignore meta.lastUpdated,id,text
- fhir-resource-diff compare a.json b.json --preset clinical
- fhir-resource-diff validate patient.json
- fhir-resource-diff normalize patient.json

Potential commands:
- compare
- validate
- normalize
- explain, optional later

Output expectations:
For text mode, output should be clean and useful, for example:
ResourceType: Patient
Status: differences found

Changed:
- name[0].given[0]: "John" -> "Johnny"
- birthDate: "1980-01-01" -> "1980-01-02"

Added:
- telecom[1]

Removed:
- identifier[0]

For JSON mode, output should be machine-consumable and stable.

Internal data model:
Design an internal DiffResult model that can support future rendering in:
- text
- JSON
- markdown
- a React/Vite UI

The output model should not be tied to the CLI.

FHIR-specific design guidance:
Do not try to fully implement the whole FHIR standard in v1.
Instead:
- detect resourceType
- enforce basic required shape
- allow resource-type-specific adapters later
- design extension points for future resource-aware comparison logic

Good future extension points:
- Patient-specific normalizers
- Observation-specific comparators
- Bundle comparison modes
- profile-aware comparison
- FHIR version mapping helpers
- interactive web explorer

Future app idea, phase 2 only:
Design the core library so a hosted React/Vite app can later provide:
- two-pane diff view
- collapsible JSON tree
- highlighted changed nodes
- filter toggles for ignored fields
- client-side validation before rendering results
- summary panel
- share the same validation, normalization, and diffing logic as the CLI
Do not build this until the CLI and core engine are solid.

Developer experience requirements:
- clean pnpm setup
- strict TypeScript
- no use of any unless clearly unavoidable
- small focused modules
- explicit types
- tests for core diff behavior
- tests for ignore rules
- tests for normalization
- sample files in /examples
- README with practical examples
- package scripts for build, test, lint, dev

README expectations:
The README should make the repo look like a serious public engineering project.
Include:
- project purpose
- why it exists
- install instructions
- quick examples
- sample output
- architecture overview
- roadmap
- contribution guidance

Roadmap suggestion:
Phase 1:
- core diff engine
- validation helpers
- CLI compare and validate
- text and JSON output

Phase 2:
- normalization presets
- markdown formatter
- more FHIR-aware rules
- extract and harden the shared browser-safe core
- prepare integration points for a future React/Vite app

Phase 3:
- profile-aware comparison
- bundle support
- richer semantic diffing
- initial hosted React/Vite app, scope TBD

What should be visible in the repo:
- clean root README
- examples folder with sample Patient, Observation, and Bundle JSON files
- tests demonstrating real diff cases
- clear package.json scripts
- sensible repo structure
- a roadmap section showing seriousness and direction

What should not be visible:
- anything copied from private work
- proprietary data
- company-specific schemas
- vague placeholder folders with no implementation
- half-built UI experiments in v1

Important quality bar:
The repository should look like something a senior engineer would publish:
practical, focused, clean, extensible, and useful.

Your tasks:
1. Propose the final repository structure
2. Propose the CLI command surface
3. Design the main TypeScript interfaces and types
4. Design the core diff algorithm
5. Propose the ignore/normalization preset strategy
6. Write the first version of the README
7. Generate the initial package.json
8. Generate the initial tsconfig, eslint, prettier, and vitest setup
9. Generate sample example files
10. Generate a realistic phased implementation plan
11. Start implementing phase 1 in small, high-quality commits or code chunks

Additional instruction:
Whenever there is a choice between "more features" and "clearer architecture", choose clearer architecture.
Whenever there is a choice between "cleverness" and "maintainability", choose maintainability.
Whenever there is a choice between "UI polish" and "core diff correctness", choose core diff correctness.

Tone:
Write code and docs like an experienced engineer building a public utility for other engineers.
