import { readFileSync } from "node:fs";
import { defineConfig } from "tsup";

const pkg = JSON.parse(readFileSync("./package.json", "utf-8")) as { version: string };

export default defineConfig({
  entry: {
    "core/index": "src/core/index.ts",
    "cli/index": "src/cli/index.ts",
  },
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  esbuildOptions(options) {
    options.alias = {
      "@": "./src",
    };
  },
  define: {
    __PACKAGE_VERSION__: JSON.stringify(pkg.version),
  },
});
