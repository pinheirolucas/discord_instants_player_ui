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
pnpm icons          # regenerate every app icon and favicon from assets/icon/*.svg
pnpm storybook      # the dev-only styleguide on :6006
pnpm build          # react-build, then electron-compile, then electron-build
pnpm release        # react-build, electron-compile, then electron-builder --publish=always
```

Run a single test file with `pnpm react-test run src/SomeFile.test.tsx`. Tests live next to the code they cover, as `*.test.ts`/`*.test.tsx`.

## Toolchain

Everything is TypeScript — `src/`, `electron/`, `scripts/`, and the Vite and tsup configs — under
`strict`. `allowJs` is `false`, so a stray `.js` file is an error rather than something that slips
through unchecked. `tsc --noEmit` (`pnpm typecheck`) is the only thing that type-checks anything:
Vite and tsup both emit through esbuild, which strips types without checking them, so a build
succeeds happily on code that does not compile.

`scripts/*.mts` run under Node 24's native type stripping — `pnpm icons` is plain `node`, no build
step. They are `.mts` rather than `.ts` because the package has no `"type": "module"` and must not
gain one: tsup emits `build/electron.js` as CommonJS, and a package-wide ESM flag would make Electron
load it as ESM. Node's stripping also needs the real extension on relative imports, which is what
`allowImportingTsExtensions` in `tsconfig.json` permits.

Node and pnpm are both pinned in `.tool-versions` (the asdf format, read by asdf and mise alike).
pnpm blocks dependency build scripts by default; the allowlist lives in `pnpm-workspace.yaml`
(pnpm 11 no longer reads settings from the `pnpm` key in `package.json`). Every entry there is
currently `false` and the file explains each one — Electron needs no entry at all (from v44 it
ships no install script and fetches its binary lazily on first `electron .`), and esbuild's is a
verification pass that both Vite and tsup work fine without. Naming them explicitly is what keeps
`pnpm install` from ending in `ERR_PNPM_IGNORED_BUILDS`.

`vite.config.ts` pins `build.target` to the Chromium version the pinned Electron ships. Raise the
two together: too new a target produces a bundle Electron cannot parse, and that failure appears
only in a packaged build, as a blank window.

## Backend connection

`src/service.ts` starts at `http://localhost:9001` (the Go server's default `server.address`) and exposes `getApiUrl`/`setApiUrl`/`resetApiUrl` to swap that base at runtime. `setApiUrl` normalizes (trailing slash stripped, base path kept) and refuses anything that is not an http/https URL with a host, so a malformed address is ignored rather than adopted and can never displace a working one. There is still no env-based override.

Under Electron the main process browses for the backend's mDNS advertisement (`_myinstants._tcp` on `local.`, TXT `path=/` and `api=1`) and pushes the whole **list** of resolved servers to the renderer over the preload bridge. Discovery is an upgrade, never a precondition: it never blocks startup, multicast is lossy and is blocked outright on plenty of networks, and running as a plain web page there is no bridge and no mDNS at all — the localhost default has to stand on its own, and the absence of `window.instantsDiscovery` is a no-op.

Which server the app talks to is resolved in `App.tsx` from two inputs, in this order: an explicit choice the user made in the picker (persisted as `selectedServer`, and re-validated through `setApiUrl` so a stale or malformed one falls through), then the first entry of the discovered list, then `defaultApiUrl`. The list arrives already sorted by `sortServers` — servers on this machine first, then by port, then by address — so the auto-adopted server is the same one on every launch. Without that sort the adopted address follows multicast response order and flips between runs.

`src/ServerMenu.tsx` is the picker: the server chip in the tools row — the current address as visible text beside a health dot — opening a Radix dropdown that lists the discovered servers, checks the current one, and switches in a single click (no confirm step — switching is cheap and reversible). It shows the current address in its own header rather than as a list row, because the current target need not be in the list at all: the app starts on `localhost:9001`, which is never discovered, and a server that dies leaves the list while still being the one in use. A server whose address is one of this machine's own (`os.networkInterfaces()` in the main process) is marked *este computador* — a bot on this machine is discovered at its LAN address, never as `localhost`.

Connection health is **passive**: `service.ts` marks itself unhealthy when an axios *request* fails (`err.isAxiosError && !err.response`) and healthy again on any answer. That test matters — the backend answers most application errors with HTTP 200 and a `{label, message}` body, so `resp.data.data` comes back `undefined` and the caller throws a `TypeError`, which means "the server answered" and must not light the badge. There is no polling because there is no cheap endpoint to poll: `/instant/list` scrapes myinstants.com and the other three either download or have side effects. Two signals come out of it — `onHealthChange` (transitions, drives the chip's health dot and the offline banner) and `onConnectionError` (every failure, re-shows the toast so a second failed click is never silent). While unhealthy, `openSnackbar` drops panel messages: the connection toast is the accurate one and a panel's generic "Erro desconhecido" would otherwise clobber it, since the panel's `catch` always runs after. Offline, both panels show an in-panel banner and step the grid back visually, but **every playback button stays live**: health is passive, so a click that gets an answer is the only thing that can discover the server is back, and disabling playback would lock the user out of recovering. The chip names itself by its visible address; while silent it carries an explicit `aria-label` of "<address> não está respondendo" — not screen-reader text in a second node, because the accessible-name algorithm drops the whitespace between nodes and it announced "localhost:9001não está respondendo".

The Go backend reports most application errors as **HTTP 200** with a `{label, message}` body and no `data`, so axios does not reject and an absent `data` is the error signal. Every unwrapping call goes through `unwrapData`, which rejects with `body.message` when `data` is missing; the axios `.catch` alongside it rejects with `backendMessage(err)`, falling back to a generic string only when the backend supplied none. Two ordering rules make this work: for `getMyInstants` the envelope check is chained *after* the `.catch` so its throw is not rewritten into the fallback, and for `getContent`/`playOnDiscord` it sits outside the `try` so it is not caught by the handler meant for transport errors. `markHealth(true)` fires as soon as a response arrives, before the envelope is judged — an error body still means the server answered.

Both panels catch `getContent` and show `err.message`. Without that catch its rejection is an unhandled rejection inside a click handler, which is what made a failed play button do and say nothing at all.

## Architecture

- **Build tool**: Vite (`vite.config.ts`). `index.html` lives at the project root and is the build entry, loading `/src/index.tsx` as a module. Files containing JSX use `.tsx`. The React plugin runs with its default `include`; narrowing it would silently take components out of its JSX transform and Fast Refresh. `base: "./"` keeps built asset URLs relative so the packaged app can load them over `file://`, `build.outDir` is `build/`, and `build.target` is pinned to the Chromium version the current Electron ships (see the comment there — getting it wrong shows up only in a packaged build, as a blank window).
- **Two compile targets**: the renderer goes through Vite; `electron/main.ts` and `electron/preload.ts` do not, because Electron requires them as CommonJS. `tsup` (see `tsup.config.ts`) compiles those two to `build/electron.js` and `build/preload.js`. Order matters in `pnpm build`: `vite build` **empties** `build/`, so tsup runs after it and is configured `clean: false` — otherwise whichever ran second would delete the other's output. `public/` still exists and is still copied verbatim, but now holds only `favicon.ico`.
- **Electron shell**: `electron/main.ts` is the Electron main process, compiled to `build/electron.js`; the electron-builder config in `package.json` packages `build/` with `extraMetadata.main` pointing at it. Dev is detected with `!app.isPackaged` — not `electron-is-dev`, which went ESM-only in v3 and cannot be required from this CommonJS file. In dev it loads `http://localhost:3000` with devtools open; in production the built `build/index.html`. The window sets one `webPreferences` override — `preload: path.join(__dirname, "preload.js")`, which now always resolves inside `build/` because both files are tsup output — and keeps `contextIsolation: true` / `nodeIntegration: false`. Auto-update is wired via `update-electron-app` v3, whose config shape is `{ updateSource: { type, repo }, updateInterval }`.
- **Discovery (main process)**: `electron/preload.ts` exposes `window.instantsDiscovery` with `onServers(listener)` — returns an unsubscribe function and replays the last list to a late subscriber — and `refresh()`, which asks the main process to re-query (the picker's "Procurar novamente"). The main process keeps discovered services in a `Map` keyed by fqdn, adding on `up` and removing on `down`, and publishes the sorted list on every change; distinct ports on one host are distinct entries, so two bots on one machine both appear. `electron/main.ts` browses with `bonjour-service` for the life of the window — not a one-shot lookup — re-querying every 30s so a backend started later still turns up, and destroys the browser and bonjour instance on `closed`. `electron/discovery.ts` holds the pure URL building and is what `src/discovery.test.ts` covers. Do not trust the parsed `name`/`type`/`host` fields: the advertised instance name embeds a dot (macOS `os.Hostname()` already ends in `.local`), which makes bonjour-service mis-split the fqdn — `type` comes back as `local-9001` and `host` doubles its suffix. Only `port`, `addresses` and `txt` are usable, so the URL is built from the first non-link-local IPv4 in `addresses` (falling back to a bracketed routable IPv6), gated on TXT `api=1`. The preload runs sandboxed and cannot `require` a sibling module at runtime — which is why the channel names used to be spelled out in both files. tsup **inlines** `./discovery` into `build/preload.js` at build time, so there is now one definition and no runtime require; the built preload requires nothing but `electron`. `hostnameFromService` recovers the display hostname by parsing the fqdn rather than reading `name`, for the same reason.
- **Persistence**: all app state is `localStorage`-backed via hooks defined in `src/storage.ts` — `useInstantsState` (favorited instants), `useThemeState` (the palette), `useColorModeState` (auto/light/dark) and `useSelectedServer` (the picked backend address). These sit on `src/lib/persisted.ts`, a small typed replacement for `use-persisted-state` (unmaintained, untyped): same `[value, setValue]` shape, same JSON encoding so old backups stay readable, and the same two kinds of sync. **Within a window**, every hook on a key is kept in step through a per-key registry — several components hold the same key at once (`ImportForm` writes `instants` while the favourites grid reads it), and the `storage` event never fires in the window that made the write, so without the registry an import leaves the grid stale. **Across windows**, the `storage` event covers it. **The `theme` key changed meaning** — it held `"light"`/`"dark"` and now holds the palette id, with light/dark living in `colorMode`. `index.html`'s boot guard migrates the old shape. An old backup needs no migration: `ImportForm` only ever restores `instants`, so a backup's `theme` value is never applied. There is no backend persistence; `src/state.ts#exportToJSON` dumps all of `localStorage` to a downloaded JSON file, and `ImportForm.tsx` reads a JSON file back in (with a merge/replace choice for instants) — this import/export pair is the only "backup" mechanism, so when changing what's stored under these keys, keep both in sync.
- **Two playback paths, kept as separate hooks** because they're mutually exclusive but independently stateful:
  - `useAudioPlayer` (`src/useAudioPlayer.ts`) — plays a clip locally via an `HTMLAudioElement`, given the base64 data URI returned by `GET /play?url=` (`service.ts#getContent`).
  - `useDiscordPlayer` (`src/useDiscordPlayer.ts`) — tells the bot to play a clip via `POST /bot/play` (`service.ts#playOnDiscord`), which blocks server-side until playback ends/is stopped and returns an `exitReason`; the hook only clears its "now playing" URL when `exitReason === "end"`.
  Both `FavoritesPanel` and `MyInstantsPanel` instantiate both hooks independently, so each panel's playback state is separate from the other's. Which footer controls are live is decided in one place, `cardState` in `src/components/InstantCard.tsx`, ported from the design canvas: the body plays locally and is inert while anything else plays or while this card plays on Discord, but stays live to replay a clip already playing here; send-to-Discord mirrors it; stop exists only on the playing card; a playing card locks its own trailing action; and every other card dims.
- **Two main tabs** in `App.tsx`: `FavoritesPanel` (user's saved instants, plus add/remove via `SaveForm`) and `MyInstantsPanel` (paginated/searchable browse of `GET /instant/list`, scraped server-side from myinstants.com, with a star toggle to add/remove favorites). Both render their cards through the shared `src/components/InstantCard.tsx`; each panel passes its own trailing action as `trail` (remove, or a favourite toggle with `aria-pressed`). Change the card there, not in the panels. **The card body is the play control** — there is no play button. A button cannot sit inside a button, so the clip name is a real `<button>` whose `::after` stretches over the whole card, and the footer sits above it at `z-index: 1`. The card is `isolation: isolate` so that `1` stays inside it; without it the footer buttons of cards behind a dialog painted over the form. A card's colour comes from `slotFor(url)` (`src/lib/slot.ts`), keyed on the url so it never shifts when the list is filtered or paged; its waveform is a deterministic texture from `wavePath(name)`, not the audio.
- **App shell** (`App.tsx`, `src/styles/shell.css`): a flex column — hero (page title, count line, the Favoritos/MyInstants pill tabs), tools row (search, Adicionar on Favoritos, server chip, overflow menu), and a scroller that owns its own overflow. The pills and the panels share one Radix Tabs root (`SegmentedRoot`), since the tab/tabpanel wiring only exists inside a single Root. Search is controlled and debounced 300ms. The find shortcut is per-platform — Cmd+F on macOS, Ctrl+F elsewhere — and so is the hint in the field. The overflow menu holds Importar, Exportar and the auto/light/dark choice; there is still no palette picker. Empty states always end on a next step: first launch offers to add; a Favoritos search with no match carries the query to MyInstants; MyInstants offers to clear the search or retry. `SnackbarContext` (`src/SnackbarContext.ts`) exposes `openSnackbar({ message, actionLabel?, onAction?, duration? })` / `closeSnackbar` over a Radix toast; both are `useCallback`-stable, which matters because `MyInstantsPanel`'s listing effect would otherwise refetch on every App render.
- **MyInstants pagination**: the page count is learned from every response, so "Carregar mais" is offered from the first load, and a new search always restarts from page 1. Both used to be wrong — the count was only learned after a search, and the page number survived one — and the old tests asserted them as known bugs.
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
the app opens. jsdom ships no `matchMedia`, so `src/setupTests.ts` stubs it.

The palette switch is fully wired and persisted but **deliberately not exposed**: there is no
picker in the UI, so every install runs on `esmalte`.

## Native window chrome

On macOS and Windows the window merges into the OS title bar; Linux keeps the window manager's bar,
which is what the design draws there. The per-platform `BrowserWindow` options live in the pure
`electron/chrome.ts` — unit-tested from `src/chrome.test.ts`, inlined into the preload like
`discovery.ts`: macOS `hiddenInset` with the real traffic lights at `{ x: 18, y: 15 }` (12px lights
centred in the 42px row), Windows `hidden` with a 40px `titleBarOverlay` so the OS draws the real
caption buttons. The renderer draws only a drag row, `TitleBar`, beneath them, and only when the
preload reports `chrome: "custom"`. `data-chrome` is stamped pre-paint so the hero's spacing is right
from the first frame. The design canvas draws fake traffic lights and caption buttons because a static
artboard has no OS to ask — do not bring them back.

Windows' caption buttons do not follow CSS. `useNativeChrome` sends the resolved `--bg`/`--fg` over
`chrome:set` whenever the palette or mode changes, and the main process calls `setTitleBarOverlay` and
`setBackgroundColor` — after checking the sender is the main window and the payload is exactly two
opaque hex colours (`isChromeColors`), since the renderer is untrusted. Those OS APIs will not parse
oklch, so `toHex` paints one pixel and reads it back, rather than keeping a second hex table that could
drift from `tokens.css`. The window is created `show: false` and revealed on `ready-to-show`, after
the boot guard has stamped the palette; `defaultChromeColors` covers the frames before that, and
`did-fail-load` shows it too, because `ready-to-show` never fires for a page that failed to load.

`pnpm start` runs under the same userData directory as an installed release — both are named after
`package.json`'s `name` — so a dev run reads and writes the real favourites, and the boot guard's
theme migration rewrites the real stored `theme` key.

## App icon

Fita, the design canvas's default mark: an ink cassette with mustard reels on enamel blue, drawn from
Esmalte's exact values. It deliberately does not follow the palette picker — it is the app's identity in
a dock, not a surface inside it. The masters are SVGs in `assets/icon/`, one per frame, because the
platforms disagree about it: `fita-mac.svg` bakes in the squircle and Apple's 824-on-1024 inset (macOS
no longer masks app icons), `fita-win.svg` is an 8% tile, full bleed, `fita-linux.svg` a circle, and
`favicon.svg` the canvas's 22.4% tile. `fita-mono.svg` is a single-ink cut for a future menu-bar
template image and is wired to nothing.

`pnpm icons` (`scripts/build-icons.mts`) renders every size from the vector *at that size* with sharp
and packs them with the two small writers in `scripts/icon-formats.mts`. There is no packing library on
purpose: those resample every size from one big bitmap, and Fita is weakest at 16px, where its reels
close up. The output is committed, so `pnpm build` never needs sharp — rerun `pnpm icons` after touching
a master. The `.icns` chunk types are exactly the set Apple's own `iconutil` writes: raw ARGB (`ic04`, `ic05`)
at 16 and 32, PNG above. Under `iconutil`, PNG stored as the older `icp4`/`icp5` types reads back at the
right *size* but decodes as pixel noise, and `icp6` reads back as 48px. To verify a change to the packer,
compare pixels, not sizes — and pick the right tool per rung. The PNG rungs round-trip losslessly through
`iconutil -c iconset`. The ARGB rungs do not: `iconutil`'s PNG export of `ic04`/`ic05` is lossy even for
Apple's own files, so decode those planes directly (the PackBits decoder in
`scripts/icon-formats.test.mts`) and compare them with a fresh render of the master.

electron-builder's `directories.buildResources` is `resources/`, not its default `build/`: `build/` is
Vite's `outDir` and is emptied by every `react-build`, so icons there would vanish between the two halves
of `pnpm build`. macOS and Windows read the app icon from the bundle; a Linux window has none, so
`main.ts` passes `public/icon.png` (copied into `build/`) as the window icon on Linux only.

## Components and styleguide

`src/components/` holds the primitives — Button/IconButton, Segmented, Field, SearchField, Switch,
RadioGroup, ServerChip, Dialog, Toast, Menu, Tooltip, EmptyState, CardSkeleton, OfflineBanner,
DropZone — styled by three plain global stylesheets (`controls.css`, `overlays.css`, `states.css`)
whose class names match the design canvas one-to-one. Not CSS Modules, on purpose: `tokens.css`
reaches into one component (`[data-theme="contraste"] .pad` gives Alto contraste's pale cards a
border), and hashed class names would silently break that. Dialog, Menu, Toast, Tooltip, Tabs,
Switch and RadioGroup sit on Radix Primitives for focus trapping, portals and ARIA; everything
visible is CSS against the tokens. Icons live in `src/icons/`, lifted from the canvas markup.

`IconButton` requires a `label` and puts it on the button itself as `aria-label`, so
`getByRole("button", { name })` works — the thing MUI's tooltip wrapper made impossible.

The dialog footer is cancel-then-confirm in the DOM everywhere; `[data-os="win"] .dlg .df` reverses
it visually, because primary sits right on macOS and Linux and left on Windows. That reversal is the
reason a dialog footer is a component rather than a layout.

**Radix portals render into `document.body`, outside any themed subtree.** In the app that is fine,
because the three data attributes live on `<html>` and everything inherits them. Anything that
themes a *subtree* instead — Storybook's decorator is the one case — must also stamp `<html>`, or a
portaled dialog resolves every token to nothing and `[data-os="win"]` never matches. The decorator
does this in a `useLayoutEffect` so the portal never paints once unthemed.

`pnpm storybook` runs Storybook 10 (`@storybook/react-vite`) on :6006. Three toolbar globals —
Tema × Modo × Sistema — give every story 48 renderings, which is the only practical way to keep
eight palettes honest. It is dev-only: there is deliberately no `build-storybook` script, and since
`vite build` bundles only what `src/index.tsx` reaches and nothing imports a story, none of it can
land in `build/`. Stories stay in `tsconfig.json`'s `include`, so a story that stops compiling
fails `pnpm typecheck`.

Archivo is self-hosted via `@fontsource-variable/archivo`. It must stay self-hosted (the packaged
app loads over `file://` with no network) and must stay the **variable** cut (the type ramp uses
weight 650, which the static 400/500/600/700 cut silently rounds to 700).

## Notes

- No MUI. React 19, Radix Primitives for behaviour, plain CSS against the tokens for everything visible.
  Every button has an accessible name of its own, so tests query with `getByRole("button", { name })` and
  cards with `getByRole("article", { name })` (the card is labelled by its clip-name heading). Radix Switch
  reports `role="switch"`; Radix Tabs activate on `mousedown`, so anything driving the real DOM (a
  puppeteer probe) has to send a real mouse click — a synthetic `.click()` never switches tabs.
- jsdom lacks APIs Radix uses — `matchMedia`, `ResizeObserver`, `scrollIntoView`, pointer capture — and
  `src/setupTests.ts` stubs each. Pointer capture is stubbed on `Element`, not `HTMLElement`, because the
  pointerdown target can be an `<svg>` inside a button.
- `ramda` is used for small functional helpers (`src/state.ts`, `ImportForm.tsx`, `MyInstantsPanel.tsx`) — prefer it over ad-hoc loops for consistency with existing code.
