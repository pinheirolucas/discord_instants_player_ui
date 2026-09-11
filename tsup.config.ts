import { defineConfig } from "tsup";

// The main process is the second compile target. The renderer goes through
// Vite; these two files never do, because Electron requires them as
// CommonJS from build/.
export default defineConfig({
  // Named entries so the output keeps the filenames electron-builder's
  // extraMetadata.main and BrowserWindow's preload path already expect.
  entry: { electron: "electron/main.ts", preload: "electron/preload.ts" },
  outDir: "build",
  format: ["cjs"],
  platform: "node",
  target: "node22",

  // `vite build` empties build/. This runs after it and must not wipe the
  // renderer bundle that was just written there.
  clean: false,

  // Bundling is the point for preload.ts: it runs sandboxed and cannot
  // require ./discovery at runtime, so the module has to be inlined.
  bundle: true,
  splitting: false,
  sourcemap: false,

  // Provided by the runtime, never bundled.
  external: ["electron"]
});
