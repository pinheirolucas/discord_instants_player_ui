# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Vite + React + Electron desktop UI for browsing/playing "instants" (short mp3 clips from myinstants.com) and sending them to a Discord bot. It is the frontend for the Go backend in the sibling repository `../discord_instants_player` (see `CLAUDE.md` there) — this app has no server of its own and does nothing useful without that backend running.

## Commands

```bash
pnpm start          # runs the Vite dev server + Electron together (waits on :3000)
pnpm react-start    # Vite dev server only, at http://localhost:3000
pnpm react-build    # production build -> build/
pnpm react-test     # Vitest (watch mode; `pnpm react-test run` for a single pass)
pnpm build          # react-build then electron-build (electron-builder)
pnpm release        # react-build then electron-builder --publish=always
```

Run a single test file with `pnpm react-test run src/SomeFile.test.jsx`. There are no test files yet, so the suite passes vacuously (`passWithNoTests` in `vite.config.mjs`).

## Toolchain

Node and pnpm are both pinned in `.tool-versions` (the asdf format, read by asdf and mise alike).
pnpm blocks dependency build scripts by default; the allowlist lives in `pnpm-workspace.yaml`
(pnpm 11 no longer reads settings from the `pnpm` key in `package.json`), and Electron's postinstall
is the one entry that must stay enabled — it downloads the platform binary.

`vite.config.mjs` pins `build.target` to the Chromium version the pinned Electron ships. Raise the
two together: too new a target produces a bundle Electron cannot parse, and that failure appears
only in a packaged build, as a blank window.

## Backend connection

`src/service.js` hardcodes the backend URL as `http://localhost:9001` (the Go server's default `server.address`). There is no env-based override — if the backend runs on a different host/port, `apiUrl` in `service.js` must be edited directly. (The Go backend advertises itself via mDNS/zeroconf for auto-discovery, but this UI does not currently consume that — it always talks to localhost:9001.)

## Architecture

- **Build tool**: Vite (`vite.config.mjs`). `index.html` lives at the project root and is the build entry, loading `/src/index.jsx` as a module. Files containing JSX use the `.jsx` extension — Vite's parser will not accept JSX from `.js`. `base: "./"` keeps built asset URLs relative so the packaged app can load them over `file://`, `build.outDir` is `build/`, and `build.target` is pinned to the Chromium version the current Electron ships (see the comment there — getting it wrong shows up only in a packaged build, as a blank window).
- **Electron shell**: `public/electron.js` is the Electron main process. `public/` is copied verbatim into `build/`, and the electron-builder config in `package.json` packages `build/` with `extraMetadata.main` pointing at `build/electron.js`. Dev is detected with `!app.isPackaged` — not `electron-is-dev`, which went ESM-only in v3 and cannot be required from this CommonJS file. In dev it loads `http://localhost:3000` with devtools open; in production the built `build/index.html`. The window takes no `webPreferences` overrides, so `contextIsolation` is on and `nodeIntegration` is off: the renderer uses only web APIs and needs no preload bridge. Auto-update is wired via `update-electron-app` v3, whose config shape is `{ updateSource: { type, repo }, updateInterval }`.
- **Persistence**: all app state is `localStorage`-backed via `use-persisted-state` hooks defined in `src/storage.js` — `useInstantsState` (favorited instants), `useUrlCodeMap`/`useCodeUrlMap` (instant URL ↔ keyboard-shortcut keyCode, both directions kept in sync), `useCodeKeyMap` (keyCode → display key string), `useTheme`. There is no backend persistence; `src/state.js#exportToJSON` dumps all of `localStorage` to a downloaded JSON file, and `ImportForm.jsx` reads a JSON file back in (with a merge/replace choice for instants) — this import/export pair is the only "backup" mechanism, so when changing what's stored under these keys, keep both in sync.
- **Two playback paths, kept as separate hooks** because they're mutually exclusive but independently stateful:
  - `useAudioPlayer` (`src/useAudioPlayer.js`) — plays a clip locally via an `HTMLAudioElement`, given the base64 data URI returned by `GET /play?url=` (`service.js#getContent`).
  - `useDiscordPlayer` (`src/useDiscordPlayer.js`) — tells the bot to play a clip via `POST /bot/play` (`service.js#playOnDiscord`), which blocks server-side until playback ends/is stopped and returns an `exitReason`; the hook only clears its "now playing" URL when `exitReason === "end"`.
  Both `FavoritesPanel` and `MyInstantsPanel` instantiate both hooks independently and disable the "play locally" button while Discord playback is active and vice versa (`areDefaultButtonsDisabled`), but each panel's playback state is separate from the other panel's.
- **Two main tabs** in `App.jsx`: `FavoritesPanel` (user's saved instants, each with an optional keyboard shortcut set via `KeybindingInput`, plus add/remove via `SaveForm`) and `MyInstantsPanel` (paginated/searchable browse of `GET /instant/list`, scraped server-side from myinstants.com, with a star toggle to add/remove favorites). Both duplicate a similar card layout and the play/send-to-discord/stop button set — when changing that UI, check both files.
- **Global UI chrome**: search box in the `AppBar` (`App.jsx`) debounces input (300ms) before updating `search` state passed down to both panels; theme toggle (light/dark, `src/theme.js`, persisted); a `SnackbarContext` (`src/SnackbarContext.js`) provider exposes `openSnackbar`/`closeSnackbar` app-wide (used e.g. to show "instant no longer exists" errors with a "REMOVE" action button).
- **Keyboard shortcuts**: `KeybindingInput` captures a single physical key (via `keyCode`) per favorited instant; the three storage maps (`urlCodeMap`, `codeUrlMap`, `codeKeyMap`) are all updated together on every binding change so lookups work in either direction. Note there's commented-out code in `FavoritesPanel.jsx` referencing a `window.backend.InitKeybindings` — global OS-level keybinding registration is not currently wired up.
- UI copy/strings throughout are in Portuguese.

## Notes

- Uses MUI v5 (`@mui/material`, `@mui/icons-material`) with the `@mui/styles` compatibility package, so the
  existing `makeStyles` call sites keep working. `@mui/styles` is deprecated and was dropped after MUI v6, so
  moving past v5 means rewriting those call sites to `sx`/`styled` first.
- `@mui/styles` resolves `makeStyles` against its own default theme, which in v5 is empty. Any component that
  calls `useStyles()` must therefore be rendered *below* `ThemeProvider`, not render it itself — this is why
  `App` is split into a provider shell and `AppContent`.
- `ramda` is used for small functional helpers (`src/instantUtils.js`, `state.js`, `ImportForm.jsx`) — prefer it over ad-hoc loops for consistency with existing code.
