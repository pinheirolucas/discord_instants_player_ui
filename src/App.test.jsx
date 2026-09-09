import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  act,
  render,
  screen,
  waitFor,
  within
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import App from "./App";
import { setApiUrl } from "./service";

let healthListener = null;
let connectionErrorListener = null;

vi.mock("./service", () => ({
  defaultApiUrl: "http://localhost:9001",
  getApiUrl: vi.fn(() => "http://localhost:9001"),
  setApiUrl: vi.fn(() => true),
  resetApiUrl: vi.fn(),
  isHealthy: vi.fn(() => true),
  onHealthChange: vi.fn(listener => {
    healthListener = listener;
    return () => {
      healthListener = null;
    };
  }),
  onConnectionError: vi.fn(listener => {
    connectionErrorListener = listener;
    return () => {
      connectionErrorListener = null;
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

function installBridge({ unsubscribe = vi.fn() } = {}) {
  const bridge = {
    push: null,
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

async function openServerMenu() {
  await userEvent.click(screen.getByLabelText("Servidor"));
}

describe("App discovery wiring", () => {
  beforeEach(() => {
    localStorage.clear();
    healthListener = null;
    connectionErrorListener = null;
    vi.mocked(setApiUrl).mockClear();
    vi.mocked(setApiUrl).mockReturnValue(true);
  });

  afterEach(() => {
    delete window.instantsDiscovery;
  });

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
    window.instantsDiscovery = {};

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
  beforeEach(() => {
    localStorage.clear();
    healthListener = null;
    connectionErrorListener = null;
    vi.mocked(setApiUrl).mockClear();
    vi.mocked(setApiUrl).mockReturnValue(true);
  });

  afterEach(() => {
    delete window.instantsDiscovery;
  });

  it("lists the discovered servers with the local one marked", async () => {
    const bridge = installBridge();
    render(<App />);
    act(() => bridge.push([macbook, raspberry]));

    await openServerMenu();

    const menu = screen.getByRole("menu");
    expect(within(menu).getByText("10.0.0.133:9001")).toBeInTheDocument();
    expect(
      within(menu).getByText("MacBook-Pro-de-Lucas · este computador")
    ).toBeInTheDocument();
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
    expect(JSON.parse(localStorage.getItem("selectedServer"))).toBe(
      "http://10.0.0.42:9001"
    );
  });

  it("keeps an explicit pick over the auto-adopted first server", () => {
    localStorage.setItem(
      "selectedServer",
      JSON.stringify("http://10.0.0.42:9001")
    );

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

    expect(
      screen.getByText("Nenhum servidor encontrado")
    ).toBeInTheDocument();
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
  beforeEach(() => {
    localStorage.clear();
    healthListener = null;
    connectionErrorListener = null;
    vi.mocked(setApiUrl).mockClear();
    vi.mocked(setApiUrl).mockReturnValue(true);
  });

  afterEach(() => {
    delete window.instantsDiscovery;
  });

  it("shows no badge while the server answers", () => {
    installBridge();
    render(<App />);

    expect(screen.getByLabelText("Servidor")).toBeInTheDocument();
  });

  it("badges the icon and toasts when the server stops answering", () => {
    installBridge();
    render(<App />);

    act(() => {
      healthListener(false);
      connectionErrorListener();
    });

    expect(
      screen.getByLabelText("O servidor não está respondendo")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Não foi possível falar com localhost:9001")
    ).toBeInTheDocument();
    expect(screen.getByText("Trocar")).toBeInTheDocument();
  });

  it("opens the picker from the toast action", async () => {
    const bridge = installBridge();
    render(<App />);
    act(() => bridge.push([macbook]));

    act(() => {
      healthListener(false);
      connectionErrorListener();
    });
    await userEvent.click(screen.getByText("Trocar"));

    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("clears the badge when the server answers again", () => {
    installBridge();
    render(<App />);

    act(() => healthListener(false));
    act(() => healthListener(true));

    expect(screen.getByLabelText("Servidor")).toBeInTheDocument();
  });
});

describe("snackbar precedence while offline", () => {
  beforeEach(() => {
    localStorage.clear();
    healthListener = null;
    connectionErrorListener = null;
    vi.mocked(setApiUrl).mockClear();
    vi.mocked(setApiUrl).mockReturnValue(true);
  });

  afterEach(() => {
    delete window.instantsDiscovery;
  });

  it("keeps the connection toast when a panel reports its own error after it", async () => {
    const { getMyInstants } = await import("./service");
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

    expect(
      screen.getByText("Não foi possível falar com localhost:9001")
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Erro desconhecido, tente novamente mais tarde")
    ).not.toBeInTheDocument();

    vi.mocked(getMyInstants).mockResolvedValue({ instants: [], pages: 0 });
  });
});

describe("repeated failures while already offline", () => {
  beforeEach(() => {
    localStorage.clear();
    healthListener = null;
    connectionErrorListener = null;
    vi.mocked(setApiUrl).mockClear();
    vi.mocked(setApiUrl).mockReturnValue(true);
  });

  afterEach(() => {
    delete window.instantsDiscovery;
  });

  it("re-shows the toast on a later failure, so a click is never silent", async () => {
    installBridge();
    render(<App />);

    act(() => {
      healthListener(false);
      connectionErrorListener();
    });

    await userEvent.click(screen.getByLabelText("close"));

    await waitFor(() =>
      expect(
        screen.queryByText("Não foi possível falar com localhost:9001")
      ).not.toBeInTheDocument()
    );

    act(() => connectionErrorListener());

    expect(
      screen.getByText("Não foi possível falar com localhost:9001")
    ).toBeInTheDocument();
  });
});
