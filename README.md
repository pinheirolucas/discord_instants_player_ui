# Peace Breaker Bot (desktop)

Desktop app (Electron + React, built with Vite) for browsing, favoriting, and playing "instants" (short audio clips, like the ones on [myinstants.com](https://www.myinstants.com)) — either locally or by sending them to a Discord bot. This is the UI half of the project; it talks to the backend service in the sibling repo [`peace-breaker-bot`](https://github.com/pinheirolucas/peace-breaker-bot), which must be running for anything here to work.

## Features

- **Favorites**: save clips, and play/remove them.
- **MyInstants browser**: paginated search of myinstants.com, with a star toggle to favorite results.
- Play a clip locally, or send it to the Discord bot to play in a voice channel — mutually exclusive per panel.
- Light/dark theme toggle.
- Import/export all app data (favorites, theme) as a JSON file.
- Runs both as an Electron desktop app and as a plain web page pointed at the backend.

## Requirements

- Node.js and [pnpm](https://pnpm.io/) (both pinned in `.tool-versions`, which asdf and mise both read)
- The [`peace-breaker-bot`](https://github.com/pinheirolucas/peace-breaker-bot) backend running and reachable at `http://localhost:9001` (see [Backend connection](#backend-connection))

## Installation

```bash
git clone https://github.com/pinheirolucas/peace-breaker-bot-desktop.git
cd peace-breaker-bot-desktop
pnpm install
```

## Usage

Start the backend first (see its README), then:

```bash
pnpm start
```

This runs the Vite dev server and opens the Electron window pointed at it. To run only the React app in a browser instead:

```bash
pnpm react-start
```

then open http://localhost:3000.

### Backend connection

The backend URL is hardcoded in [`src/service.js`](./src/service.js) as `http://localhost:9001`. If your backend runs elsewhere, edit `apiUrl` in that file before building.

## Building

```bash
pnpm build      # production React build + packaged Electron app
pnpm release    # production build + publish via electron-builder (GitHub releases)
```

Packaged builds are published to GitHub releases and picked up automatically by the app's built-in auto-updater.

## Development

```bash
pnpm react-start   # Vite dev server only, at http://localhost:3000
pnpm react-test    # run the test suite (Vitest, watch mode)
pnpm react-build   # production build to build/
```

## License

[MIT](./LICENSE)
