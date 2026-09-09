import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, render } from "@testing-library/react";

import App from "./App";
import { setApiUrl } from "./service";

vi.mock("./service", () => ({
  defaultApiUrl: "http://localhost:9001",
  getApiUrl: vi.fn(() => "http://localhost:9001"),
  setApiUrl: vi.fn(() => true),
  resetApiUrl: vi.fn(),
  getContent: vi.fn(),
  playOnDiscord: vi.fn(),
  stopPlayingOnDiscord: vi.fn(),
  getMyInstants: vi.fn(() => Promise.resolve({ instants: [], pages: 0 }))
}));

function installBridge({ unsubscribe = vi.fn() } = {}) {
  const bridge = {
    push: null,
    unsubscribe,
    onApiUrl: vi.fn(listener => {
      bridge.push = listener;
      return unsubscribe;
    })
  };

  window.instantsDiscovery = bridge;
  return bridge;
}

describe("App discovery wiring", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(setApiUrl).mockClear();
  });

  afterEach(() => {
    delete window.instantsDiscovery;
  });

  it("renders and adopts nothing when there is no bridge", () => {
    expect(window.instantsDiscovery).toBeUndefined();

    expect(() => render(<App />)).not.toThrow();
    expect(setApiUrl).not.toHaveBeenCalled();
  });

  it("adopts an address pushed over the bridge", () => {
    const bridge = installBridge();

    render(<App />);

    expect(bridge.onApiUrl).toHaveBeenCalledTimes(1);

    act(() => bridge.push("http://10.0.0.133:9001"));

    expect(setApiUrl).toHaveBeenCalledWith("http://10.0.0.133:9001");
  });

  it("keeps adopting later addresses for the life of the window", () => {
    const bridge = installBridge();

    render(<App />);

    act(() => bridge.push("http://10.0.0.133:9001"));
    act(() => bridge.push("http://10.0.0.207:9002"));

    expect(vi.mocked(setApiUrl).mock.calls).toEqual([
      ["http://10.0.0.133:9001"],
      ["http://10.0.0.207:9002"]
    ]);
  });

  it("unsubscribes when the app unmounts", () => {
    const unsubscribe = vi.fn();
    installBridge({ unsubscribe });

    const { unmount } = render(<App />);
    unmount();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("ignores a bridge that exposes no onApiUrl", () => {
    window.instantsDiscovery = {};

    expect(() => render(<App />)).not.toThrow();
    expect(setApiUrl).not.toHaveBeenCalled();
  });

  it("unmounts cleanly when the bridge returns no unsubscribe", () => {
    installBridge({ unsubscribe: undefined });

    const { unmount } = render(<App />);

    expect(() => unmount()).not.toThrow();
  });
});
