import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

import useAudioPlayer from "./useAudioPlayer";

// The hook builds its player with a bare `new Audio()` and never puts the
// element in the DOM, so there is nothing to query for. It is also not
// injectable. That leaves replacing the global constructor as the only seam.
//
// A real jsdom HTMLAudioElement would not do: jsdom implements neither play()
// nor pause() (they raise "Not implemented" on the virtual console), and it
// never fires "ended" on its own. This fake records the calls instead and
// extends EventTarget so tests can dispatch "ended" themselves.
class FakeAudio extends EventTarget {
  constructor() {
    super();
    this.src = "";
    this.currentTime = 0;
    this.calls = [];
    FakeAudio.instances.push(this);
  }

  play() {
    this.calls.push(["play", this.src]);
    return Promise.resolve();
  }

  pause() {
    this.calls.push(["pause"]);
  }
}

FakeAudio.instances = [];

// Deliberately the *first* instance, not the last. `useRef(new Audio())`
// evaluates its argument on every render and throws away everything after the
// first, so the hook keeps driving instance 0 while the constructor keeps
// firing. See the "allocates a throwaway element on every render" test.
function currentPlayer() {
  expect(FakeAudio.instances.length).toBeGreaterThan(0);
  return FakeAudio.instances[0];
}

const A = { url: "https://www.myinstants.com/a/", src: "data:audio/mp3;base64,AAAA" };
const B = { url: "https://www.myinstants.com/b/", src: "data:audio/mp3;base64,BBBB" };

describe("useAudioPlayer", () => {
  beforeEach(() => {
    FakeAudio.instances = [];
    vi.stubGlobal("Audio", FakeAudio);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts idle", () => {
    const { result } = renderHook(() => useAudioPlayer());
    const [url, isPlaying] = result.current;

    expect(url).toBe("");
    expect(isPlaying).toBe(false);
  });

  it("play() flips isPlaying and pushes the src into the audio element", () => {
    const { result } = renderHook(() => useAudioPlayer());

    act(() => {
      result.current[2](A.url, A.src);
    });

    expect(result.current[0]).toBe(A.url);
    expect(result.current[1]).toBe(true);

    const player = currentPlayer();
    expect(player.src).toBe(A.src);
    expect(player.calls).toEqual([["play", A.src]]);
  });

  it("stop() pauses, rewinds, clears the src and goes back to idle", () => {
    const { result } = renderHook(() => useAudioPlayer());

    act(() => {
      result.current[2](A.url, A.src);
    });
    act(() => {
      result.current[3]();
    });

    expect(result.current[0]).toBe("");
    expect(result.current[1]).toBe(false);

    const player = currentPlayer();
    expect(player.src).toBe("");
    expect(player.currentTime).toBe(0);
    expect(player.calls).toEqual([["play", A.src], ["pause"]]);
  });

  it("play() while already playing stops the first clip before starting the second", () => {
    const { result } = renderHook(() => useAudioPlayer());

    act(() => {
      result.current[2](A.url, A.src);
    });
    act(() => {
      result.current[2](B.url, B.src);
    });

    const player = currentPlayer();

    // The pause between the two plays is the interesting part: without it the
    // first clip would keep going while the element's src was swapped.
    expect(player.calls).toEqual([
      ["play", A.src],
      ["pause"],
      ["play", B.src]
    ]);
    expect(player.src).toBe(B.src);
    expect(result.current[0]).toBe(B.url);
    expect(result.current[1]).toBe(true);
  });

  it("keeps driving one element across plays and re-renders", () => {
    const { result, rerender } = renderHook(() => useAudioPlayer());
    const player = currentPlayer();

    act(() => {
      result.current[2](A.url, A.src);
    });
    rerender();
    act(() => {
      result.current[2](B.url, B.src);
    });

    expect(player.calls).toEqual([
      ["play", A.src],
      ["pause"],
      ["play", B.src]
    ]);
    // Every other instance stays untouched — the ref pins the first one.
    FakeAudio.instances.slice(1).forEach(other => {
      expect(other.calls).toEqual([]);
    });
  });

  // Pre-existing wart, asserted as current behaviour rather than fixed:
  // `useRef(new Audio())` evaluates `new Audio()` on *every* render and
  // discards the result on all but the first, so each state update allocates a
  // media element that is never used. Harmless in practice (nothing is loaded
  // or attached), but it is why currentPlayer() has to take instance 0.
  it("allocates a throwaway element on every render", () => {
    const { result, rerender } = renderHook(() => useAudioPlayer());

    expect(FakeAudio.instances).toHaveLength(1);

    rerender();
    expect(FakeAudio.instances).toHaveLength(2);

    act(() => {
      result.current[2](A.url, A.src);
    });
    expect(FakeAudio.instances.length).toBeGreaterThan(2);
  });

  it("goes back to idle when the clip reaches its end on its own", () => {
    const { result } = renderHook(() => useAudioPlayer());

    act(() => {
      result.current[2](A.url, A.src);
    });

    const player = currentPlayer();
    act(() => {
      player.dispatchEvent(new Event("ended"));
    });

    expect(result.current[0]).toBe("");
    expect(result.current[1]).toBe(false);
    // "ended" only resets the hook's state; it does not touch the element, so
    // no pause is recorded and the src stays behind.
    expect(player.calls).toEqual([["play", A.src]]);
    expect(player.src).toBe(A.src);
  });

  it("detaches the ended listener on unmount", () => {
    const { result, unmount } = renderHook(() => useAudioPlayer());

    act(() => {
      result.current[2](A.url, A.src);
    });

    const player = currentPlayer();
    const stateBefore = result.current[0];
    unmount();

    // Dispatching after unmount would call setState on an unmounted hook if the
    // listener were still attached.
    act(() => {
      player.dispatchEvent(new Event("ended"));
    });

    expect(result.current[0]).toBe(stateBefore);
  });
});
