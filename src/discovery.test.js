import { createRequire } from "node:module";
import { describe, it, expect } from "vitest";

const require = createRequire(import.meta.url);
const { buildApiUrl, pickHost } = require("../public/discovery.js");

function realService(overrides = {}) {
  return {
    name: "MacBook-Pro-de-Lucas",
    type: "local-9001",
    fqdn: "MacBook-Pro-de-Lucas.local-9001._myinstants._tcp.local",
    host: "MacBook-Pro-de-Lucas.local.local",
    port: 9001,
    addresses: [
      "fe80::1",
      "fe80::aede:48ff:fe00:1122",
      "10.0.0.133",
      "fe80::cafe"
    ],
    txt: { path: "/", api: "1" },
    ...overrides
  };
}

describe("buildApiUrl", () => {
  it("builds the base url from the ipv4 address and the port", () => {
    expect(buildApiUrl(realService())).toBe("http://10.0.0.133:9001");
  });

  it("never uses the mangled host field", () => {
    const url = buildApiUrl(realService());

    expect(url).not.toContain("MacBook-Pro-de-Lucas");
    expect(url).not.toContain(".local");
  });

  it("ignores the mangled name and type fields", () => {
    const url = buildApiUrl(
      realService({ name: "", type: "local-9001", fqdn: "" })
    );

    expect(url).toBe("http://10.0.0.133:9001");
  });

  it("drops the trailing slash of the default path", () => {
    expect(buildApiUrl(realService())).not.toMatch(/\/$/);
  });

  it("keeps a non-root base path", () => {
    const service = realService({ txt: { path: "/api/", api: "1" } });

    expect(buildApiUrl(service)).toBe("http://10.0.0.133:9001/api");
  });

  it("treats a missing path as root", () => {
    const service = realService({ txt: { api: "1" } });

    expect(buildApiUrl(service)).toBe("http://10.0.0.133:9001");
  });

  it("refuses a service announcing another api version", () => {
    expect(buildApiUrl(realService({ txt: { path: "/", api: "2" } }))).toBeNull();
  });

  it("refuses a service with no api record at all", () => {
    expect(buildApiUrl(realService({ txt: { path: "/" } }))).toBeNull();
    expect(buildApiUrl(realService({ txt: undefined }))).toBeNull();
  });

  it("refuses a service with no usable port", () => {
    expect(buildApiUrl(realService({ port: 0 }))).toBeNull();
    expect(buildApiUrl(realService({ port: undefined }))).toBeNull();
  });

  it("refuses a service with no usable address", () => {
    expect(buildApiUrl(realService({ addresses: [] }))).toBeNull();
    expect(buildApiUrl(realService({ addresses: undefined }))).toBeNull();
  });

  it("refuses anything that is not a service", () => {
    expect(buildApiUrl(null)).toBeNull();
    expect(buildApiUrl(undefined)).toBeNull();
  });
});

describe("pickHost", () => {
  it("prefers a routable ipv4 over every ipv6 entry", () => {
    expect(pickHost(realService())).toBe("10.0.0.133");
  });

  it("skips ipv4 link-local addresses", () => {
    const service = realService({ addresses: ["169.254.10.1", "192.168.1.20"] });

    expect(pickHost(service)).toBe("192.168.1.20");
  });

  it("falls back to a routable ipv6 in brackets when there is no ipv4", () => {
    const service = realService({
      addresses: ["fe80::1", "2001:db8::42"]
    });

    expect(pickHost(service)).toBe("[2001:db8::42]");
  });

  it("returns nothing when every address is link-local", () => {
    const service = realService({
      addresses: ["169.254.10.1", "fe80::1", "FE80::2"]
    });

    expect(pickHost(service)).toBeNull();
  });
});
