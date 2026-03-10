import { describe, it, expect } from "vitest";
import { classifyChange } from "@/core/classify.js";

describe("classifyChange", () => {
  it('returns "added" when left is undefined', () => {
    expect(classifyChange(undefined, "x")).toBe("added");
  });

  it('returns "removed" when right is undefined', () => {
    expect(classifyChange("x", undefined)).toBe("removed");
  });

  it('returns "changed" when both values are strings but different', () => {
    expect(classifyChange("a", "b")).toBe("changed");
  });

  it('returns "type-changed" when left is number and right is string', () => {
    expect(classifyChange(1, "1")).toBe("type-changed");
  });

  it('returns "changed" when both values are booleans but different', () => {
    expect(classifyChange(true, false)).toBe("changed");
  });
});
