import { afterEach, describe, expect, it, vi } from "vitest";
import { toHex } from "./toHex";

// jsdom has no 2D canvas. This fake stands in for Chromium's: it "paints"
// whatever fillStyle holds and hands the pixel back, parsing only the hex
// values these tests feed it — the oklch-to-sRGB conversion itself is the
// browser's job and is checked in a real Chrome instead.
function fakeContext() {
  const ctx = {
    fillStyle: "",
    fillRect: vi.fn(),
    getImageData: vi.fn(() => {
      const hex = /^#[0-9a-f]{6}$/i.test(ctx.fillStyle) ? ctx.fillStyle : "#000000";
      const n = parseInt(hex.slice(1), 16);
      return { data: [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255] };
    })
  };
  return ctx;
}

afterEach(() => vi.restoreAllMocks());

describe("toHex", () => {
  it("reads back the pixel the colour paints, as #rrggbb", () => {
    const ctx = fakeContext();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctx as never);

    expect(toHex("  #13181D ")).toBe("#13181d");
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 1, 1);
  });

  it("resets the brush first, so an unparseable colour cannot report the previous one", () => {
    const ctx = fakeContext();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctx as never);

    toHex("#ffffff");
    expect(toHex("not a colour")).toBe("#000000");
  });

  it("answers nothing for an empty value, without touching a canvas", () => {
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, "getContext");

    expect(toHex("")).toBe("");
    expect(getContext).not.toHaveBeenCalled();
  });

  it("answers nothing where there is no 2D context", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);

    expect(toHex("#13181d")).toBe("");
  });
});
