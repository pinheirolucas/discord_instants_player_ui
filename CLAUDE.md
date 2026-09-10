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
pnpm typecheck      # tsc --noEmit (the ONLY thing that type-checks)
pnpm electron-compile # tsup: electron/*.ts -> build/electron.js + build/preload.js
pnpm build          # react-build, then electron-compile, then electron-build
pnpm release        # react-build, electron-compile, then electron-builder --publish=always
```

Run a single test file with `pnpm react-test run src/SomeFile.test.jsx`. Tests live next to the code they cover, as `*.test.js`/`*.test.jsx`.

## Toolchain

TypeScript is migrating in incrementally: `allowJs` is on, so `.jsx` files still compile and
ship, they are just not type-checked. `tsc --noEmit` (`pnpm typecheck`) is the only thing that
type-checks anything — Vite and tsup both emit through esbuild, which strips types without
checking them, so a build succeeds happily on code that does not compile. Flipping `allowJs`
to `false` is the completion signal.

Node and pnpm are both pinned in `.tool-versions` (the asdf format, read by asdf and mise alike).
pnpm blocks dependency build scripts by default; the allowlist lives in `pnpm-workspace.yaml`
(pnpm 11 no longer reads settings from the `pnpm` key in `package.json`). Every entry there is
currently `false` and the file explains each one — Electron needs no entry at all (from v44 it
ships no install script and fetches its binary lazily on first `electron .`), and esbuild's is a
verification pass that both Vite and tsup work fine without. Naming them explicitly is what keeps
`pnpm install` from ending in `ERR_PNPM_IGNORED_BUILDS`.

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
- **Two compile targets**: the renderer goes through Vite; `electron/main.ts` and `electron/preload.ts` do not, because Electron requires them as CommonJS. `tsup` (see `tsup.config.ts`) compiles those two to `build/electron.js` and `build/preload.js`. Order matters in `pnpm build`: `vite build` **empties** `build/`, so tsup runs after it and is configured `clean: false` — otherwise whichever ran second would delete the other's output. `public/` still exists and is still copied verbatim, but now holds only `favicon.ico`.
- **Electron shell**: `electron/main.ts` is the Electron main process, compiled to `build/electron.js`; the electron-builder config in `package.json` packages `build/` with `extraMetadata.main` pointing at it. Dev is detected with `!app.isPackaged` — not `electron-is-dev`, which went ESM-only in v3 and cannot be required from this CommonJS file. In dev it loads `http://localhost:3000` with devtools open; in production the built `build/index.html`. The window sets one `webPreferences` override — `preload: path.join(__dirname, "preload.js")`, which now always resolves inside `build/` because both files are tsup output — and keeps `contextIsolation: true` / `nodeIntegration: false`. Auto-update is wired via `update-electron-app` v3, whose config shape is `{ updateSource: { type, repo }, updateInterval }`.
- **Discovery (main process)**: `electron/preload.ts` exposes `window.instantsDiscovery` with `onServers(listener)` — returns an unsubscribe function and replays the last list to a late subscriber — and `refresh()`, which asks the main process to re-query (the picker's "Procurar novamente"). The main process keeps discovered services in a `Map` keyed by fqdn, adding on `up` and removing on `down`, and publishes the sorted list on every change; distinct ports on one host are distinct entries, so two bots on one machine both appear. `electron/main.ts` browses with `bonjour-service` for the life of the window — not a one-shot lookup — re-querying every 30s so a backend started later still turns up, and destroys the browser and bonjour instance on `closed`. `electron/discovery.ts` holds the pure URL building and is what `src/discovery.test.js` covers. Do not trust the parsed `name`/`type`/`host` fields: the advertised instance name embeds a dot (macOS `os.Hostname()` already ends in `.local`), which makes bonjour-service mis-split the fqdn — `type` comes back as `local-9001` and `host` doubles its suffix. Only `port`, `addresses` and `txt` are usable, so the URL is built from the first non-link-local IPv4 in `addresses` (falling back to a bracketed routable IPv6), gated on TXT `api=1`. The preload runs sandboxed and cannot `require` a sibling module at runtime — which is why the channel names used to be spelled out in both files. tsup **inlines** `./discovery` into `build/preload.js` at build time, so there is now one definition and no runtime require; the built preload requires nothing but `electron`. `hostnameFromService` recovers the display hostname by parsing the fqdn rather than reading `name`, for the same reason.
- **Persistence**: all app state is `localStorage`-backed via hooks defined in `src/storage.ts` — `useInstantsState` (favorited instants), `useThemeState` (the palette), `useColorModeState` (auto/light/dark) and `useSelectedServer` (the picked backend address). These sit on `src/lib/persisted.ts`, a ~70-line typed replacement for `use-persisted-state` (unmaintained, untyped): same `[value, setValue]` shape, same JSON encoding so old backups stay readable, and the same `storage`-event sync so a second window does not show stale favourites. **The `theme` key changed meaning** — it held `"light"`/`"dark"` and now holds the palette id, with light/dark living in `colorMode`. `index.html`'s boot guard migrates the old shape, and `migrateStoredShape` in `storage.ts` does the same for an imported backup. There is no backend persistence; `src/state.js#exportToJSON` dumps all of `localStorage` to a downloaded JSON file, and `ImportForm.jsx` reads a JSON file back in (with a merge/replace choice for instants) — this import/export pair is the only "backup" mechanism, so when changing what's stored under these keys, keep both in sync.
- **Two playback paths, kept as separate hooks** because they're mutually exclusive but independently stateful:
  - `useAudioPlayer` (`src/useAudioPlayer.js`) — plays a clip locally via an `HTMLAudioElement`, given the base64 data URI returned by `GET /play?url=` (`service.js#getContent`).
  - `useDiscordPlayer` (`src/useDiscordPlayer.js`) — tells the bot to play a clip via `POST /bot/play` (`service.js#playOnDiscord`), which blocks server-side until playback ends/is stopped and returns an `exitReason`; the hook only clears its "now playing" URL when `exitReason === "end"`.
  Both `FavoritesPanel` and `MyInstantsPanel` instantiate both hooks independently and disable the "play locally" button while Discord playback is active and vice versa (`areDefaultButtonsDisabled`), but each panel's playback state is separate from the other panel's.
- **Two main tabs** in `App.jsx`: `FavoritesPanel` (user's saved instants, plus add/remove via `SaveForm`) and `MyInstantsPanel` (paginated/searchable browse of `GET /instant/list`, scraped server-side from myinstants.com, with a star toggle to add/remove favorites). Both render their cards through the shared `src/InstantCard.jsx`, which owns the Paper/title layout and the play/send-to-discord/stop buttons; each panel passes its own trailing action as children (remove vs. favorite). Change the card there, not in the panels.
- **Global UI chrome**: search box in the `AppBar` (`App.jsx`) debounces input (300ms) before updating `search` state passed down to both panels; theme toggle (light/dark, `src/theme.js`, persisted); a `SnackbarContext` (`src/SnackbarContext.js`) provider exposes `openSnackbar`/`closeSnackbar` app-wide (used e.g. to show "instant no longer exists" errors with a "REMOVE" action button).
- UI copy/strings throughout are in Portuguese.

## Design system

`src/styles/tokens.css` is the single source of colour and control geometry. Nine semantic
tokens (`--bg`, `--panel`, `--line`, `--fg`, `--muted`, `--accent`, `--onAccent`, `--ok`, and
per-card `--fill`/`--ink`) resolved across eight palettes × light/dark, plus a four-value
platform layer (`--rctl`, `--hctl`, `--rpad`, `--rbtn`) that resolves per OS. **Components never
name a colour — they name a token.** That is what lets one component sheet cover eight themes
and three platforms. Values are `oklch`.

Selectors are bare attribute selectors (`[data-theme="esmalte"][data-mode="dark"]`) rather than
`:root[...]` on purpose, so the same sheet can theme a subtree — which is what Storybook's
decorator relies on.

Three attributes on `<html>` drive everything, and all three are stamped **pre-paint** by the
inline guard at the top of `index.html`, because React mounts too late and every launch would
otherwise flash the wrong ground:
- `data-os` — from the preload bridge (`window.instantsPlatform.os`) when there is one, else UA
  sniffing. Runtime, not build-time: one renderer bundle serves all three Electron targets *and*
  the plain web page, which has no OS to compile against. `?os=mac|win|linux` overrides in dev.
- `data-mode` — `light`/`dark`, resolved from the persisted `colorMode` (`auto` by default).
- `data-theme` — the palette, defaulting to `esmalte`.

`auto` tracks the OS live through `matchMedia("(prefers-color-scheme: dark)")`, which is the
single mechanism on both targets: Electron's renderer honours the OS setting exactly as a
browser does **as long as nothing sets `nativeTheme.themeSource` away from `"system"`**. Nothing
does, and nothing should — forcing it there takes `auto` away and restyles every native dialog
the app opens. jsdom ships no `matchMedia`, so `src/setupTests.js` stubs it.

The palette switch is fully wired and persisted but **deliberately not exposed**: there is no
picker in the UI, so every install runs on `esmalte`.

Archivo is self-hosted via `@fontsource-variable/archivo`. It must stay self-hosted (the packaged
app loads over `file://` with no network) and must stay the **variable** cut (the type ramp uses
weight 650, which the static 400/500/600/700 cut silently rounds to 700).

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
