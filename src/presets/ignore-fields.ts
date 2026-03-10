import type { IgnorePreset } from "@/core/types.js";

export const IGNORE_METADATA: IgnorePreset = {
  name: "metadata",
  description: "Ignore id, meta, and text fields — focus on clinical content",
  paths: ["id", "meta", "text"],
};

export const IGNORE_CLINICAL: IgnorePreset = {
  name: "clinical",
  description: "Ignore metadata and extensions — compare core clinical fields only",
  paths: ["id", "meta", "text", "extension", "modifierExtension"],
};

export const IGNORE_STRICT: IgnorePreset = {
  name: "strict",
  description: "Ignore nothing — compare all fields",
  paths: [],
};
