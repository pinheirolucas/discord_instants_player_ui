import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import App from "./App";
import { getMyInstants, setApiUrl } from "./service";

// The listeners App registers with the mocked service. Reset to no-ops
// rather than null, so a test can call them without a null check each time.
const noop = () => {};
let healthListener: (healthy: boolean) => void = noop;
let connectionErrorListener: () => void = noop;

vi.mock("./service", () => ({
  defaultApiUrl: "http://localhost:9001",
  getApiUrl: vi.fn(() => "http://localhost:9001"),
  setApiUrl: vi.fn(() => true),
  resetApiUrl: vi.fn(),
  isHealthy: vi.fn(() => true),
  onHealthChange: vi.fn(listener => {
    healthListener = listener;
    return () => {
      healthListener = noop;
    };
  }),
  onConnectionError: vi.fn(listener => {
    connectionErrorListener = listener;
    return () => {
      connectionErrorListener = noop;
    };
  }),
  getContent: vi.fn(),
  playOnDiscord: vi.fn(),
  stopPlayingOnDiscord: vi.fn(),
  getMyInstants: vi.fn(() => Promise.resolve({ instants: [], pages: 0 }))
}));

const macbook = {
  id: "MacBook-Pro-de-Lucas.local-9001._myinstants._tcp.local",
  apiUrl: "http://10.0.0.133:9001",
  address: "10.0.0.133",
  port: 9001,
  hostname: "MacBook-Pro-de-Lucas",
  isLocal: true
};

const raspberry = {
  id: "raspberrypi.local-9001._myinstants._tcp.local",
  apiUrl: "http://10.0.0.42:9001",
  address: "10.0.0.42",
  port: 9001,
  hostname: "raspberrypi",
  isLocal: false
};

function installBridge({ unsubscribe = vi.fn() }: { unsubscribe?: (() => void) | undefined } = {}) {
  const bridge = {
    push: (_servers: unknown[]): void => {},
    unsubscribe,
    refresh: vi.fn(),
    onServers: vi.fn(listener => {
      bridge.push = listener;
      return unsubscribe;
    })
  };

  window.instantsDiscovery = bridge;
  return bridge;
}

// The server chip is named by the address it shows, plus "não está
// respondendo" as screen-reader text while the server is silent.
function serverChip(name: string | RegExp = /^localhost:9001/) {
  return screen.getByRole("button", { name });
}

async function openServerMenu() {
  await userEvent.click(serverChip());
}

function toasts() {
  return within(screen.getByRole("region", { name: /Notificações/ }));
}

function searchBox() {
  return screen.getByRole("searchbox", { name: "Procurar um som" });
}

function reset() {
  localStorage.clear();
  delete document.documentElement.dataset.mode;
  delete document.documentElement.dataset.theme;
  healthListener = noop;
  connectionErrorListener = noop;
  vi.mocked(setApiUrl).mockClear();
  vi.mocked(setApiUrl).mockReturnValue(true);
  vi.mocked(getMyInstants).mockClear();
}

afterEach(() => {
  delete window.instantsDiscovery;
});

describe("App discovery wiring", () => {
  beforeEach(reset);

  it("falls back to the default with no bridge at all", () => {
    expect(window.instantsDiscovery).toBeUndefined();

    expect(() => render(<App />)).not.toThrow();
    expect(setApiUrl).toHaveBeenCalledWith("http://localhost:9001");
  });

  it("adopts the first discovered server when the user has picked none", () => {
    const bridge = installBridge();
    render(<App />);

    act(() => bridge.push([macbook, raspberry]));

    expect(setApiUrl).toHaveBeenLastCalledWith("http://10.0.0.133:9001");
  });

  it("keeps the auto-adopted server stable as more are discovered", () => {
    const bridge = installBridge();
    render(<App />);

    act(() => bridge.push([macbook]));
    act(() => bridge.push([macbook, raspberry]));

    expect(setApiUrl).toHaveBeenLastCalledWith("http://10.0.0.133:9001");
  });

  it("returns to the default when every server goes away", () => {
    const bridge = installBridge();
    render(<App />);

    act(() => bridge.push([macbook]));
    act(() => bridge.push([]));

    expect(setApiUrl).toHaveBeenLastCalledWith("http://localhost:9001");
  });

  it("ignores a bridge that exposes no onServers", () => {
    // Deliberately malformed: the absence of onServers has to be a no-op.
    window.instantsDiscovery = {} as unknown as Window["instantsDiscovery"];

    expect(() => render(<App />)).not.toThrow();
    expect(setApiUrl).toHaveBeenCalledWith("http://localhost:9001");
  });

  it("unsubscribes when the app unmounts", () => {
    const unsubscribe = vi.fn();
    installBridge({ unsubscribe });

    const { unmount } = render(<App />);
    unmount();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("unmounts cleanly when the bridge returns no unsubscribe", () => {
    installBridge({ unsubscribe: undefined });

    const { unmount } = render(<App />);

    expect(() => unmount()).not.toThrow();
  });
});

describe("server picker", () => {
  beforeEach(reset);

  it("lists the discovered servers with the local one marked", async () => {
    const bridge = installBridge();
    render(<App />);
    act(() => bridge.push([macbook, raspberry]));

    await openServerMenu();

    const menu = screen.getByRole("menu");
    expect(within(menu).getByText("10.0.0.133:9001")).toBeInTheDocument();
    expect(within(menu).getByText("MacBook-Pro-de-Lucas · este computador")).toBeInTheDocument();
    expect(within(menu).getByText("raspberrypi")).toBeInTheDocument();
    expect(within(menu).getByText(/Encontrados na rede · 2/)).toBeInTheDocument();
  });

  it("switches to a picked server in one click and remembers it", async () => {
    const bridge = installBridge();
    render(<App />);
    act(() => bridge.push([macbook, raspberry]));

    await openServerMenu();
    await userEvent.click(screen.getByText("10.0.0.42:9001"));

    expect(setApiUrl).toHaveBeenLastCalledWith("http://10.0.0.42:9001");
    expect(JSON.parse(localStorage.getItem("selectedServer") ?? "null")).toBe("http://10.0.0.42:9001");
  });

  it("keeps an explicit pick over the auto-adopted first server", () => {
    localStorage.setItem("selectedServer", JSON.stringify("http://10.0.0.42:9001"));

    const bridge = installBridge();
    render(<App />);
    act(() => bridge.push([macbook, raspberry]));

    expect(setApiUrl).toHaveBeenLastCalledWith("http://10.0.0.42:9001");
  });

  it("falls back to discovery when the remembered pick is rejected", () => {
    localStorage.setItem("selectedServer", JSON.stringify("not-a-url"));
    vi.mocked(setApiUrl).mockImplementation(value => value !== "not-a-url");

    const bridge = installBridge();
    render(<App />);
    act(() => bridge.push([macbook]));

    expect(setApiUrl).toHaveBeenLastCalledWith("http://10.0.0.133:9001");
  });

  it("says so when nothing was discovered", async () => {
    installBridge();
    render(<App />);

    await openServerMenu();

    expect(screen.getByText("Nenhum servidor encontrado")).toBeInTheDocument();
  });

  it("asks the main process to browse again", async () => {
    const bridge = installBridge();
    render(<App />);
    act(() => bridge.push([macbook]));

    await openServerMenu();
    await userEvent.click(screen.getByText("Procurar novamente"));

    expect(bridge.refresh).toHaveBeenCalledTimes(1);
  });
});

describe("connection health", () => {
  beforeEach(reset);

  it("names the server on the chip while it answers", () => {
    installBridge();
    render(<App />);

    expect(serverChip("localhost:9001")).toBeInTheDocument();
  });

  it("says so on the chip, and toasts, when the server stops answering", () => {
    installBridge();
    render(<App />);

    act(() => {
      healthListener(false);
      connectionErrorListener();
    });

    expect(serverChip("localhost:9001 não está respondendo")).toBeInTheDocument();
    expect(toasts().getByText("Não foi possível falar com localhost:9001")).toBeInTheDocument();
    expect(toasts().getByRole("button", { name: "Trocar" })).toBeInTheDocument();
  });

  it("opens the picker from the toast action", async () => {
    const bridge = installBridge();
    render(<App />);
    act(() => bridge.push([macbook]));

    act(() => {
      healthListener(false);
      connectionErrorListener();
    });
    await userEvent.click(toasts().getByRole("button", { name: "Trocar" }));

    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("clears the flag when the server answers again", () => {
    installBridge();
    render(<App />);

    act(() => healthListener(false));
    act(() => healthListener(true));

    expect(serverChip("localhost:9001")).toBeInTheDocument();
  });
});

describe("snackbar precedence while offline", () => {
  beforeEach(reset);

  it("keeps the connection toast when a panel reports its own error after it", async () => {
    vi.mocked(getMyInstants).mockRejectedValueOnce(
      new Error("Erro desconhecido, tente novamente mais tarde")
    );

    installBridge();
    render(<App />);

    act(() => {
      healthListener(false);
      connectionErrorListener();
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(toasts().getByText("Não foi possível falar com localhost:9001")).toBeInTheDocument();
    expect(screen.queryByText("Erro desconhecido, tente novamente mais tarde")).not.toBeInTheDocument();

    vi.mocked(getMyInstants).mockResolvedValue({ instants: [], pages: 0 });
  });
});

describe("repeated failures while already offline", () => {
  beforeEach(reset);

  it("re-shows the toast on a later failure, so a click is never silent", async () => {
    installBridge();
    render(<App />);

    act(() => {
      healthListener(false);
      connectionErrorListener();
    });

    await userEvent.click(toasts().getByRole("button", { name: "Fechar" }));

    await waitFor(() =>
      expect(screen.queryByText("Não foi possível falar com localhost:9001")).not.toBeInTheDocument()
    );

    act(() => connectionErrorListener());

    expect(toasts().getByText("Não foi possível falar com localhost:9001")).toBeInTheDocument();
  });
});

describe("shell", () => {
  beforeEach(reset);

  it("opens on Favoritos, with the section tabs and the search", () => {
    render(<App />);

    expect(screen.getByRole("heading", { level: 1, name: "Favoritos" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Favoritos" })).toHaveAttribute("aria-selected", "true");
    expect(searchBox()).toBeInTheDocument();
  });

  it("switches to MyInstants from the segmented control", async () => {
    render(<App />);

    await userEvent.click(screen.getByRole("tab", { name: "MyInstants" }));

    expect(screen.getByRole("heading", { level: 1, name: "MyInstants" })).toBeInTheDocument();
    await waitFor(() => expect(getMyInstants).toHaveBeenCalledWith(1, ""));
  });

  it("opens the add form from the tools row", async () => {
    render(<App />);

    await userEvent.click(screen.getByRole("button", { name: "Adicionar" }));

    expect(screen.getByRole("dialog", { name: "Adicionar instant" })).toBeInTheDocument();
  });

  it("carries a search with no favourite match over to MyInstants", async () => {
    localStorage.setItem(
      "instants",
      JSON.stringify([{ name: "Vish", url: "https://www.myinstants.com/v/" }])
    );
    const user = userEvent.setup();
    render(<App />);

    await user.type(searchBox(), "xuxa");
    await user.click(await screen.findByRole("button", { name: "Procurar “xuxa” no MyInstants" }));

    expect(screen.getByRole("heading", { level: 1, name: "MyInstants" })).toBeInTheDocument();
    await waitFor(() => expect(getMyInstants).toHaveBeenLastCalledWith(1, "xuxa"));
    // The query survives the switch, rather than making them retype it.
    expect(searchBox()).toHaveValue("xuxa");
  });

  it("focuses the search on the find shortcut", () => {
    render(<App />);

    // The modifier is per-platform (Cmd on macOS, Ctrl elsewhere). Press both
    // so the test holds on whichever platform it runs on.
    fireEvent.keyDown(window, { key: "f", ctrlKey: true, metaKey: true });

    expect(searchBox()).toHaveFocus();
  });

  async function openAppearance(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole("button", { name: "Mais opções" }));
    await user.click(screen.getByRole("menuitem", { name: "Aparência…" }));
    return screen.findByRole("dialog", { name: "Aparência" });
  }

  it("follows the OS by default and remembers an explicit mode", async () => {
    const user = userEvent.setup();
    render(<App />);

    // setupTests' matchMedia stub reports a light OS.
    await waitFor(() => expect(document.documentElement.dataset.mode).toBe("light"));

    await openAppearance(user);
    await user.click(screen.getByRole("radio", { name: "Escuro" }));

    // Previewed at once, but not kept until Pronto.
    await waitFor(() => expect(document.documentElement.dataset.mode).toBe("dark"));
    expect(localStorage.getItem("colorMode")).not.toBe(JSON.stringify("dark"));

    await user.click(screen.getByRole("button", { name: "Pronto" }));

    expect(JSON.parse(localStorage.getItem("colorMode") ?? "null")).toBe("dark");
    expect(document.documentElement.dataset.mode).toBe("dark");
    expect(screen.queryByRole("dialog", { name: "Aparência" })).not.toBeInTheDocument();
  });

  it("opens Aparência on what is in use, with focus on the palette", async () => {
    const user = userEvent.setup();
    render(<App />);

    await openAppearance(user);

    expect(screen.getByRole("radio", { name: "Automático" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Esmalte" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Esmalte" })).toHaveFocus();
  });

  it("previews a palette on the whole window and keeps it only on Pronto", async () => {
    const user = userEvent.setup();
    render(<App />);

    await openAppearance(user);
    await user.click(screen.getByRole("radio", { name: "Frevo" }));

    await waitFor(() => expect(document.documentElement.dataset.theme).toBe("frevo"));
    expect(localStorage.getItem("theme")).not.toBe(JSON.stringify("frevo"));

    await user.click(screen.getByRole("button", { name: "Pronto" }));

    expect(JSON.parse(localStorage.getItem("theme") ?? "null")).toBe("frevo");
    expect(document.documentElement.dataset.theme).toBe("frevo");
  });

  it("puts palette and mode back on Cancelar", async () => {
    const user = userEvent.setup();
    render(<App />);

    await openAppearance(user);
    await user.click(screen.getByRole("radio", { name: "Fliperama" }));
    await user.click(screen.getByRole("radio", { name: "Escuro" }));
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe("fliperama"));
    expect(document.documentElement.dataset.mode).toBe("dark");

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(document.documentElement.dataset.theme).toBe("esmalte"));
    expect(document.documentElement.dataset.mode).toBe("light");
    expect(localStorage.getItem("theme")).not.toBe(JSON.stringify("fliperama"));
    expect(screen.queryByRole("dialog", { name: "Aparência" })).not.toBeInTheDocument();
  });

  it("treats Escape as Cancelar", async () => {
    const user = userEvent.setup();
    render(<App />);

    await openAppearance(user);
    await user.click(screen.getByRole("radio", { name: "OLED" }));
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe("oled"));

    await user.keyboard("{Escape}");

    await waitFor(() => expect(document.documentElement.dataset.theme).toBe("esmalte"));
    expect(screen.queryByRole("dialog", { name: "Aparência" })).not.toBeInTheDocument();
  });

  it("runs on the default palette until another is picked", async () => {
    render(<App />);

    await waitFor(() => expect(document.documentElement.dataset.theme).toBe("esmalte"));
  });
});

describe("native window chrome", () => {
  beforeEach(() => {
    reset();
    delete document.documentElement.dataset.os;
    delete document.documentElement.dataset.chrome;
  });

  afterEach(() => {
    delete window.instantsPlatform;
  });

  it("draws its drag row when Electron merged the window into the macOS bar", () => {
    window.instantsPlatform = { os: "mac", chrome: "custom", setChrome: vi.fn() };

    const { container } = render(<App />);

    expect(container.querySelector(".tb")).not.toBeNull();
    expect(document.documentElement.dataset.os).toBe("mac");
    expect(document.documentElement.dataset.chrome).toBe("custom");
  });

  it("names the app in the Windows bar, beside the OS caption buttons", () => {
    window.instantsPlatform = { os: "win", chrome: "custom", setChrome: vi.fn() };

    const { container } = render(<App />);

    expect(container.querySelector(".tb")).toHaveTextContent("Discord Instants Player");
  });

  it("leaves the bar to the window manager on Linux", () => {
    window.instantsPlatform = { os: "linux", chrome: "native", setChrome: vi.fn() };

    const { container } = render(<App />);

    expect(container.querySelector(".tb")).toBeNull();
    expect(document.documentElement.dataset.chrome).toBe("native");
  });

  it("draws no title bar in a plain browser tab", () => {
    const { container } = render(<App />);

    expect(container.querySelector(".tb")).toBeNull();
  });
});
