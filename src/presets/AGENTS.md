# AGENTS.md — src/presets/

## Purpose

Define reusable **ignore-field lists** and **normalization configurations** that users can activate by name.

## Browser-safety rule

Presets are data definitions (plain objects/arrays). They must be browser-safe — no Node imports, no I/O.

## Modules

| File | Responsibility |
|------|---------------|
| `ignore-fields.ts` | Named sets of field paths to exclude from comparison |
| `normalization.ts` | Named normalization configurations (which transforms to apply) |

## Preset design

- A preset is a plain, serializable object — not a class, not a function with closures.
- Presets should be composable: a user should be able to combine multiple presets.
- Built-in presets should cover common FHIR use cases:
  - `metadata` — ignore `id`, `meta`, `text`
  - `clinical` — ignore metadata + extensions, focus on clinically meaningful fields
  - `strict` — ignore nothing
- Custom presets can be defined by users via config; the core should accept the same shape regardless of source.

## Conventions

- Export each preset as a named constant.
- Export a registry object or map so presets can be looked up by name at runtime.
- Presets should be documented with a one-line description of what they exclude or normalize.

## Testing

- Preset tests live in `tests/presets/`.
- Verify that applying a preset to a known resource pair produces the expected filtered diff.
