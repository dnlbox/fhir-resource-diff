import { createRequire } from "node:module";

const _require = createRequire(import.meta.url);
const { version } = _require("../../package.json") as { version: string };

/**
 * Tool version read from package.json at startup via the module system.
 * Stays in sync with the published package version automatically.
 */
export const TOOL_VERSION = version;
