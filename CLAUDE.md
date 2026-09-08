# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Create React App + Electron desktop UI for browsing/playing "instants" (short mp3 clips from myinstants.com) and sending them to a Discord bot. It is the frontend for the Go backend in the sibling repository `../discord_instants_player` (see `CLAUDE.md` there) — this app has no server of its own and does nothing useful without that backend running.

## Commands

```bash
yarn start          # runs CRA dev server + Electron together (BROWSER=none via cross-env, waits on :3000)
yarn react-start     # CRA dev server only, at http://localhost:3000
yarn react-build     # production React build -> build/
yarn react-test      # CRA test runner (Jest, interactive watch mode)
yarn build           # react-build then electron-build (electron-builder)
yarn release         # react-build then electron-builder --publish=always
```

Run a single test file the same way CRA does: `yarn react-test src/SomeFile.test.js` (or pass `--watchAll=false` for a single non-watch run). There are currently no `*.test.js` files in `src/`.

## Toolchain

Node is pinned in `.tool-versions` (the asdf format, read by asdf and mise alike). Two constraints follow from the
current dependency versions, both temporary:

- **CRA 3.4 cannot build on modern Node.** Its webpack 4 asks OpenSSL for MD4, which OpenSSL 3
  refuses (`ERR_OSSL_EVP_UNSUPPORTED`). The `react-*` scripts therefore run through
  `cross-env NODE_OPTIONS=--openssl-legacy-provider`. Remove that once the build tool is
  replaced.
- **Electron 8 has no `darwin-arm64` build** — Apple Silicon support starts at Electron 11, so
  on an M-series Mac `yarn install` 404s on the Electron download. Install with
  `npm_config_arch=x64 yarn install` to get the x64 build, which runs under Rosetta. Remove
  that workaround once Electron is bumped past 11.

## Backend connection

`src/service.js` hardcodes the backend URL as `http://localhost:9001` (the Go server's default `server.address`). There is no env-based override — if the backend runs on a different host/port, `apiUrl` in `service.js` must be edited directly. (The Go backend advertises itself via mDNS/zeroconf for auto-discovery, but this UI does not currently consume that — it always talks to localhost:9001.)

## Architecture

- **Electron shell**: `public/electron.js` is the Electron main process (`package.json` `main` field). In dev (`electron-is-dev`) it loads `http://localhost:3000` with devtools open; in production it loads the built `build/index.html`. Auto-update is wired via `update-electron-app` against the `pinheirolucas/discord_instants_player_ui` GitHub repo/releases.
- **Persistence**: all app state is `localStorage`-backed via `use-persisted-state` hooks defined in `src/storage.js` — `useInstantsState` (favorited instants), `useUrlCodeMap`/`useCodeUrlMap` (instant URL ↔ keyboard-shortcut keyCode, both directions kept in sync), `useCodeKeyMap` (keyCode → display key string), `useTheme`. There is no backend persistence; `src/state.js#exportToJSON` dumps all of `localStorage` to a downloaded JSON file, and `ImportForm.js` reads a JSON file back in (with a merge/replace choice for instants) — this import/export pair is the only "backup" mechanism, so when changing what's stored under these keys, keep both in sync.
- **Two playback paths, kept as separate hooks** because they're mutually exclusive but independently stateful:
  - `useAudioPlayer` (`src/useAudioPlayer.js`) — plays a clip locally via an `HTMLAudioElement`, given the base64 data URI returned by `GET /play?url=` (`service.js#getContent`).
  - `useDiscordPlayer` (`src/useDiscordPlayer.js`) — tells the bot to play a clip via `POST /bot/play` (`service.js#playOnDiscord`), which blocks server-side until playback ends/is stopped and returns an `exitReason`; the hook only clears its "now playing" URL when `exitReason === "end"`.
  Both `FavoritesPanel` and `MyInstantsPanel` instantiate both hooks independently and disable the "play locally" button while Discord playback is active and vice versa (`areDefaultButtonsDisabled`), but each panel's playback state is separate from the other panel's.
- **Two main tabs** in `App.js`: `FavoritesPanel` (user's saved instants, each with an optional keyboard shortcut set via `KeybindingInput`, plus add/remove via `SaveForm`) and `MyInstantsPanel` (paginated/searchable browse of `GET /instant/list`, scraped server-side from myinstants.com, with a star toggle to add/remove favorites). Both duplicate a similar card layout and the play/send-to-discord/stop button set — when changing that UI, check both files.
- **Global UI chrome**: search box in the `AppBar` (`App.js`) debounces input (300ms) before updating `search` state passed down to both panels; theme toggle (light/dark, `src/theme.js`, persisted); a `SnackbarContext` (`src/SnackbarContext.js`) provider exposes `openSnackbar`/`closeSnackbar` app-wide (used e.g. to show "instant no longer exists" errors with a "REMOVE" action button).
- **Keyboard shortcuts**: `KeybindingInput` captures a single physical key (via `keyCode`) per favorited instant; the three storage maps (`urlCodeMap`, `codeUrlMap`, `codeKeyMap`) are all updated together on every binding change so lookups work in either direction. Note there's commented-out code in `FavoritesPanel.js` referencing a `window.backend.InitKeybindings` — global OS-level keybinding registration is not currently wired up.
- UI copy/strings throughout are in Portuguese.

## Notes

- Uses Material-UI v4 (`@material-ui/core`, `@material-ui/icons`) — not MUI v5+, so v4-era APIs (`makeStyles`, `fade`, etc.) apply.
- `ramda` is used for small functional helpers (`src/instantUtils.js`, `state.js`, `ImportForm.js`) — prefer it over ad-hoc loops for consistency with existing code.
