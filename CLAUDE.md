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

Run a single test file with `pnpm react-test run src/SomeFile.test.jsx`. Tests live next to the code they cover, as `*.test.js`/`*.test.jsx`.

## Toolchain

Node and pnpm are both pinned in `.tool-versions` (the asdf format, read by asdf and mise alike).
pnpm blocks dependency build scripts by default; the allowlist lives in `pnpm-workspace.yaml`
(pnpm 11 no longer reads settings from the `pnpm` key in `package.json`), and Electron's postinstall
is the one entry that must stay enabled — it downloads the platform binary.

`vite.config.mjs` pins `build.target` to the Chromium version the pinned Electron ships. Raise the
two together: too new a target produces a bundle Electron cannot parse, and that failure appears
only in a packaged build, as a blank window.

## Backend connection

`src/service.js` starts at `http://localhost:9001` (the Go server's default `server.address`) and exposes `getApiUrl`/`setApiUrl`/`resetApiUrl` to swap that base at runtime. `setApiUrl` normalizes (trailing slash stripped, base path kept) and refuses anything that is not an http/https URL with a host, so a malformed address is ignored rather than adopted and can never displace a working one. There is still no env-based override.

Under Electron the main process browses for the backend's mDNS advertisement (`_myinstants._tcp` on `local.`, TXT `path=/` and `api=1`) and pushes the whole **list** of resolved servers to the renderer over the preload bridge. Discovery is an upgrade, never a precondition: it never blocks startup, multicast is lossy and is blocked outright on plenty of networks, and running as a plain web page there is no bridge and no mDNS at all — the localhost default has to stand on its own, and the absence of `window.instantsDiscovery` is a no-op.

Which server the app talks to is resolved in `App.jsx` from two inputs, in this order: an explicit choice the user made in the picker (persisted as `selectedServer` via `use-persisted-state`, and re-validated through `setApiUrl` so a stale or malformed one falls through), then the first entry of the discovered list, then `defaultApiUrl`. The list arrives already sorted by `sortServers` — servers on this machine first, then by port, then by address — so the auto-adopted server is the same one on every launch. Without that sort the adopted address follows multicast response order and flips between runs.

`src/ServerMenu.jsx` is the picker: an AppBar icon whose `Menu` lists the discovered servers, checks the current one, and switches in a single click (no confirm step — switching is cheap and reversible). It shows the current address in its own header rather than as a list row, because the current target need not be in the list at all: the app starts on `localhost:9001`, which is never discovered, and a server that dies leaves the list while still being the one in use. A server whose address is one of this machine's own (`os.networkInterfaces()` in the main process) is marked *este computador* — a bot on this machine is discovered at its LAN address, never as `localhost`.

Connection health is **passive**: `service.js` marks itself unhealthy when an axios *request* fails (`err.isAxiosError && !err.response`) and healthy again on any answer. That test matters — the backend answers most application errors with HTTP 200 and a `{label, message}` body, so `resp.data.data` comes back `undefined` and the caller throws a `TypeError`, which means "the server answered" and must not light the badge. There is no polling because there is no cheap endpoint to poll: `/instant/list` scrapes myinstants.com and the other three either download or have side effects. Two signals come out of it — `onHealthChange` (transitions, drives the error badge) and `onConnectionError` (every failure, re-shows the toast so a second failed click is never silent). While unhealthy, `openSnackbar` drops panel messages: the connection toast is the accurate one and a panel's generic "Erro desconhecido" would otherwise clobber it, since the panel's `catch` always runs after.

The Go backend reports most application errors as **HTTP 200** with a `{label, message}` body and no `data`, so axios does not reject and an absent `data` is the error signal. Every unwrapping call goes through `unwrapData`, which rejects with `body.message` when `data` is missing; the axios `.catch` alongside it rejects with `backendMessage(err)`, falling back to a generic string only when the backend supplied none. Two ordering rules make this work: for `getMyInstants` the envelope check is chained *after* the `.catch` so its throw is not rewritten into the fallback, and for `getContent`/`playOnDiscord` it sits outside the `try` so it is not caught by the handler meant for transport errors. `markHealth(true)` fires as soon as a response arrives, before the envelope is judged — an error body still means the server answered.

Both panels catch `getContent` and show `err.message`. Without that catch its rejection is an unhandled rejection inside a click handler, which is what made a failed play button do and say nothing at all.

## Architecture

- **Build tool**: Vite (`vite.config.mjs`). `index.html` lives at the project root and is the build entry, loading `/src/index.jsx` as a module. Files containing JSX use the `.jsx` extension — Vite's parser will not accept JSX from `.js`. `base: "./"` keeps built asset URLs relative so the packaged app can load them over `file://`, `build.outDir` is `build/`, and `build.target` is pinned to the Chromium version the current Electron ships (see the comment there — getting it wrong shows up only in a packaged build, as a blank window).
- **Electron shell**: `public/electron.js` is the Electron main process. `public/` is copied verbatim into `build/`, and the electron-builder config in `package.json` packages `build/` with `extraMetadata.main` pointing at `build/electron.js`. Dev is detected with `!app.isPackaged` — not `electron-is-dev`, which went ESM-only in v3 and cannot be required from this CommonJS file. In dev it loads `http://localhost:3000` with devtools open; in production the built `build/index.html`. The window sets one `webPreferences` override — `preload: path.join(__dirname, "preload.js")`, which resolves under `public/` in dev and `build/` when packaged — and keeps `contextIsolation: true` / `nodeIntegration: false`. Auto-update is wired via `update-electron-app` v3, whose config shape is `{ updateSource: { type, repo }, updateInterval }`.
- **Discovery (main process)**: `public/preload.js` exposes `window.instantsDiscovery` with `onServers(listener)` — returns an unsubscribe function and replays the last list to a late subscriber — and `refresh()`, which asks the main process to re-query (the picker's "Procurar novamente"). The main process keeps discovered services in a `Map` keyed by fqdn, adding on `up` and removing on `down`, and publishes the sorted list on every change; distinct ports on one host are distinct entries, so two bots on one machine both appear. `public/electron.js` browses with `bonjour-service` for the life of the window — not a one-shot lookup — re-querying every 30s so a backend started later still turns up, and destroys the browser and bonjour instance on `closed`. `public/discovery.js` holds the pure URL building and is what `src/discovery.test.js` covers. Do not trust the parsed `name`/`type`/`host` fields: the advertised instance name embeds a dot (macOS `os.Hostname()` already ends in `.local`), which makes bonjour-service mis-split the fqdn — `type` comes back as `local-9001` and `host` doubles its suffix. Only `port`, `addresses` and `txt` are usable, so the URL is built from the first non-link-local IPv4 in `addresses` (falling back to a bracketed routable IPv6), gated on TXT `api=1`. The preload runs sandboxed and cannot require `./discovery`, so the channel names `discovery:servers` and `discovery:refresh` are spelled out in both files. `hostnameFromService` recovers the display hostname by parsing the fqdn rather than reading `name`, for the same reason.
- **Persistence**: all app state is `localStorage`-backed via `use-persisted-state` hooks defined in `src/storage.js` — `useInstantsState` (favorited instants), `useTheme` and `useSelectedServer` (the picked backend address). There is no backend persistence; `src/state.js#exportToJSON` dumps all of `localStorage` to a downloaded JSON file, and `ImportForm.jsx` reads a JSON file back in (with a merge/replace choice for instants) — this import/export pair is the only "backup" mechanism, so when changing what's stored under these keys, keep both in sync.
- **Two playback paths, kept as separate hooks** because they're mutually exclusive but independently stateful:
  - `useAudioPlayer` (`src/useAudioPlayer.js`) — plays a clip locally via an `HTMLAudioElement`, given the base64 data URI returned by `GET /play?url=` (`service.js#getContent`).
  - `useDiscordPlayer` (`src/useDiscordPlayer.js`) — tells the bot to play a clip via `POST /bot/play` (`service.js#playOnDiscord`), which blocks server-side until playback ends/is stopped and returns an `exitReason`; the hook only clears its "now playing" URL when `exitReason === "end"`.
  Both `FavoritesPanel` and `MyInstantsPanel` instantiate both hooks independently and disable the "play locally" button while Discord playback is active and vice versa (`areDefaultButtonsDisabled`), but each panel's playback state is separate from the other panel's.
- **Two main tabs** in `App.jsx`: `FavoritesPanel` (user's saved instants, plus add/remove via `SaveForm`) and `MyInstantsPanel` (paginated/searchable browse of `GET /instant/list`, scraped server-side from myinstants.com, with a star toggle to add/remove favorites). Both render their cards through the shared `src/InstantCard.jsx`, which owns the Paper/title layout and the play/send-to-discord/stop buttons; each panel passes its own trailing action as children (remove vs. favorite). Change the card there, not in the panels.
- **Global UI chrome**: search box in the `AppBar` (`App.jsx`) debounces input (300ms) before updating `search` state passed down to both panels; theme toggle (light/dark, `src/theme.js`, persisted); a `SnackbarContext` (`src/SnackbarContext.js`) provider exposes `openSnackbar`/`closeSnackbar` app-wide (used e.g. to show "instant no longer exists" errors with a "REMOVE" action button).
- UI copy/strings throughout are in Portuguese.

## Notes

- Uses MUI v9 (`@mui/material`, `@mui/icons-material`) on React 19. Styling is `sx` props, with `styled()`
  reserved for the one genuinely reusable styled element — the AppBar search box in `App.jsx`. There is no
  `@mui/styles` and no `makeStyles`.
- Grid uses the modern API: `<Grid container>` with `<Grid size={n}>`, not the removed `item`/`xs` props.
  The pre-v7 Grid still exists upstream as `GridLegacy`; this app does not use it.
- MUI icons carry `data-testid` (e.g. `data-testid="PlayCircleFilledIcon"`) **only outside production
  builds** — `createSvgIcon` sets it to `undefined` when `NODE_ENV === "production"`. So it is available in
  Vitest but absent from anything driving `pnpm react-build` output (an Electron probe, say). MUI 5 emitted
  it unconditionally; the gate arrived with the v6/v7 line. Do not rely on it outside the test environment.
  The tests here do not use it at all, because of a second obstacle — `InstantCardAction`: it wraps its `IconButton` in a `<span>` so a
  disabled button can still host the tooltip listener, and MUI clones that span and puts the tooltip's
  title on it as `aria-label`. The button itself therefore has no accessible name, and
  `getByRole("button", { name })` finds nothing — reach the span with `getByLabelText(title)` and take the
  button inside it. MUI's `Switch` reports `role="switch"`, not `"checkbox"`.
- `ramda` is used for small functional helpers (`src/instantUtils.js`, `state.js`, `ImportForm.jsx`) — prefer it over ad-hoc loops for consistency with existing code.
