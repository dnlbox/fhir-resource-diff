import { readFileSync } from "node:fs";
import { defineConfig } from "tsup";

const pkg = JSON.parse(readFileSync("./package.json", "utf-8")) as { version: string };

const NODE_BUILTINS = [
  "assert", "async_hooks", "buffer", "child_process", "cluster", "console",
  "crypto", "dgram", "diagnostics_channel", "dns", "domain", "events", "fs",
  "http", "http2", "https", "inspector", "module", "net", "os", "path",
  "perf_hooks", "process", "punycode", "querystring", "readline", "repl",
  "stream", "string_decoder", "timers", "tls", "trace_events", "tty", "url",
  "util", "v8", "vm", "wasi", "worker_threads", "zlib",
];

// Intercept both bare ("fs") and node:-prefixed ("node:fs") imports so the
// dist always emits node:* external references that Deno accepts.
const nodeBuiltinPlugin = {
  name: "node-builtin-prefix",
  setup(build: { onResolve: (opts: { filter: RegExp }, cb: (args: { path: string }) => { path: string; external: boolean }) => void }) {
    const names = NODE_BUILTINS.join("|");
    const filter = new RegExp(`^(node:)?(${names})$`);
    build.onResolve({ filter }, (args: { path: string }) => ({
      path: args.path.startsWith("node:") ? args.path : `node:${args.path}`,
      external: true,
    }));
  },
};

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
    options.alias = { "@": "./src" };
    options.plugins = [...(options.plugins ?? []), nodeBuiltinPlugin];
  },
  define: {
    __PACKAGE_VERSION__: JSON.stringify(pkg.version),
  },
});
