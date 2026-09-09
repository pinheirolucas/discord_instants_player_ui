import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { exportToJSON } from "./state";

// exportToJSON never returns the payload — it hands it to a throwaway anchor as
// a data: URI and clicks it. jsdom builds the anchor for real, so the assertion
// point is that click: capture the element it fires on and decode its href.
function captureDownload() {
  const clicks = [];

  const spy = vi
    .spyOn(HTMLAnchorElement.prototype, "click")
    .mockImplementation(function mockClick() {
      clicks.push({
        href: this.getAttribute("href"),
        download: this.getAttribute("download")
      });
    });

  return {
    spy,
    get calls() {
      return clicks;
    }
  };
}

function decode(href) {
  const prefix = "data:application/json;charset=utf-8,";
  expect(href.startsWith(prefix)).toBe(true);
  return decodeURIComponent(href.slice(prefix.length));
}

describe("exportToJSON", () => {
  beforeEach(() => {
    localStorage.clear();
    // state.js still carries two console.log calls from development. They are
    // noise here; silencing them keeps a failing run readable.
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("downloads every localStorage key, JSON-decoded and re-serialised", () => {
    const instants = [
      { name: "Primeiro", url: "https://www.myinstants.com/a/" },
      { name: "Segundo", url: "https://www.myinstants.com/b/" }
    ];
    localStorage.setItem("instants", JSON.stringify(instants));
    localStorage.setItem("theme", JSON.stringify("dark"));

    const download = captureDownload();
    exportToJSON();

    expect(download.calls).toHaveLength(1);
    const [{ href, download: filename }] = download.calls;

    expect(filename).toBe("discord-instants-player-config.json");
    expect(JSON.parse(decode(href))).toEqual({ instants, theme: "dark" });
  });

  it("writes the values back as structured JSON, not as embedded strings", () => {
    // The round-trip through JSON.parse is what distinguishes this from a plain
    // JSON.stringify(localStorage), which would nest each value as a string.
    localStorage.setItem("instants", JSON.stringify([{ name: "A", url: "u" }]));

    const download = captureDownload();
    exportToJSON();

    const body = decode(download.calls[0].href);

    expect(body).toBe(
      JSON.stringify({ instants: [{ name: "A", url: "u" }] }, null, 2)
    );
    expect(typeof JSON.parse(body).instants).toBe("object");
  });

  it("exports an empty object when nothing is stored", () => {
    const download = captureDownload();
    exportToJSON();

    expect(JSON.parse(decode(download.calls[0].href))).toEqual({});
  });

  it("percent-encodes values so the data URI survives a comma or a newline", () => {
    localStorage.setItem("instants", JSON.stringify([{ name: "a,b", url: "u" }]));

    const download = captureDownload();
    exportToJSON();

    const { href } = download.calls[0];

    expect(href).toContain("%2C");
    expect(JSON.parse(decode(href)).instants[0].name).toBe("a,b");
  });

  // Pre-existing fragility, asserted as-is rather than fixed: every value is
  // JSON.parse'd unconditionally, so a single non-JSON entry written by
  // anything else on the same origin takes the whole export down. Nothing in
  // this app writes such a key today.
  it("throws if any stored value is not valid JSON", () => {
    localStorage.setItem("instants", JSON.stringify([]));
    localStorage.setItem("some-third-party-key", "not json");

    const download = captureDownload();

    expect(() => exportToJSON()).toThrow(SyntaxError);
    expect(download.calls).toHaveLength(0);
  });
});
