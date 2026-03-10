import { defineConfig } from "tsup";

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
});
