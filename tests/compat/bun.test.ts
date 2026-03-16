import { test, expect } from "bun:test";
import { parseJson, diff, normalize, validate } from "../../src/core/index.ts";

test("parseJson returns a valid resource", () => {
  const result = parseJson('{"resourceType":"Patient","id":"p1"}');
  expect(result.success).toBe(true);
});

test("diff detects a changed field", () => {
  const a = { resourceType: "Patient", id: "p1", active: true };
  const b = { resourceType: "Patient", id: "p1", active: false };
  const result = diff(a, b, {});
  expect(result.identical).toBe(false);
});

test("normalize returns resource and stats", () => {
  const resource = { resourceType: "Patient", z: 1, a: 2 };
  const { resource: r, stats } = normalize(resource, { sortObjectKeys: true });
  expect(Object.keys(r)[0]).toBe("a");
  expect(stats.keysSorted).toBeGreaterThan(0);
});

test("validate returns a result", () => {
  const resource = { resourceType: "Patient", id: "p1" };
  const result = validate(resource, "R4");
  expect(typeof result.valid).toBe("boolean");
});
