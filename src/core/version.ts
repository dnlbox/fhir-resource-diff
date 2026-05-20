// Injected at build time by tsup and in unit tests by vitest.config.ts define.
// In tsx subprocess tests the global is absent; the typeof guard falls back to "dev".
// See tsup.config.ts for the define configuration.
declare const __PACKAGE_VERSION__: string;

/**
 * Tool version injected at build time from package.json.
 * Stays in sync with the published package version automatically.
 */
export const TOOL_VERSION: string = typeof __PACKAGE_VERSION__ === "string" ? __PACKAGE_VERSION__ : "dev";
