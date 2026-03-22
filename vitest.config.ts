import { readFileSync } from "node:fs";
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(__dirname, "package.json"), "utf-8")) as { version: string };

export default defineConfig({
  define: {
    __PACKAGE_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  test: {
    globals: false,
    passWithNoTests: true,
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/compat/**"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.d.ts"],
    },
  },
});
