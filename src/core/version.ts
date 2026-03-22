// Injected at build time by tsup — see tsup.config.ts.
// The define substitution replaces __PACKAGE_VERSION__ with a string literal,
// making the typeof branch always true and the fallback unreachable (dead code).
// When running via tsx in tests/dev, the typeof guard falls through to the
// synchronous package.json read so the version resolves correctly.
declare const __PACKAGE_VERSION__: string;

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

function resolveVersion(): string {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (typeof __PACKAGE_VERSION__ !== "undefined") {
    return __PACKAGE_VERSION__;
  }
  // tsx / dev path — dead code in the built bundle
  const dir = dirname(fileURLToPath(import.meta.url));
  const pkgPath = resolve(dir, "../../package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as { version: string };
  return pkg.version;
}

/**
 * Tool version injected at build time from package.json.
 * Stays in sync with the published package version automatically.
 */
export const TOOL_VERSION = resolveVersion();
