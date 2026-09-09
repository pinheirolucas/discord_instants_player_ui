import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // The packaged Electron app loads build/index.html over file://, so asset
  // URLs have to be relative. Matches the "homepage": "./" this project already
  // declared for CRA.
  base: "./",

  // JSX lives in .js files throughout src/, which esbuild will not parse on its
  // own. Widening the plugin's include lets Babel handle them, so no file has to
  // be renamed to .jsx.
  plugins: [react({ include: "**/*.{js,jsx}" })],

  // Some dependencies (file-selector, reached through react-dropzone) ship UMD
  // bundles that reference the Node `global`. webpack polyfilled it; Vite does
  // not, so without this the import dialog dies on open with
  // "ReferenceError: global is not defined" while the rest of the app is fine.
  define: {
    global: "globalThis"
  },

  build: {
    // public/electron.js resolves ../build/index.html, and the electron-builder
    // "files" globs package from build/ — keep CRA's output directory.
    outDir: "build",

    // Pinned to the Chromium that the Electron version in devDependencies
    // ships (44.2.0 -> Chromium 152). Getting this wrong is production-only and
    // silent: the dev server works, the build succeeds, and the packaged app
    // shows a blank window with a SyntaxError. Raise it in step with Electron.
    target: "chrome152"
  },

  server: {
    // The start script's wait-on target and public/electron.js both hardcode
    // :3000, so fail loudly rather than silently drifting to another port.
    port: 3000,
    strictPort: true
  },

  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/setupTests.js"
  }
});
